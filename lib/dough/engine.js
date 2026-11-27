// Dough calculator engine. Pure functions, no DOM, no DB, no dependencies.
// All math runs client-side too (this same module is bundled for the browser),
// so keep it dependency-free CommonJS. See docs/DOUGH-MATH.md.
//
// Baker's percentage convention: flour = 100%, every other ingredient is a
// percentage of flour weight. The user never sees these percentages by default;
// they exist only to drive the numbers.

// ---- constants ----------------------------------------------------------

// Yeast-by-time-and-temperature reference point (TXCraig1 model, pizzamaking.com),
// anchored to authentic Neapolitan. The AVPN disciplinare uses 0.1 to 3 g of
// fresh yeast per liter of water, which on ~1.7 kg of flour per liter is roughly
// 0.05 to 0.18% fresh of flour, i.e. ~0.015 to 0.05% instant. 0.03% at 24 h / 20 C
// puts a fresh-yeast dough on a 24 h+ rise squarely in that band. See docs/DOUGH-MATH.md.
const YEAST_REF_HOURS = 24;
const YEAST_REF_TEMP_C = 20;
const YEAST_REF_IDY_PCT = 0.03; // instant dry yeast, percent of flour
const Q10 = 2; // metabolic rate roughly doubles per +10C in the proofing range

// Valid window for the Q10 approximation. Outside this, warn instead of extrapolating.
const TEMP_MIN_C = 4;
const TEMP_MAX_C = 45;
const HOURS_MIN = 1;
const HOURS_MAX = 96;

// Yeast type conversion, relative to instant dry yeast.
const YEAST_TYPE_FACTOR = {
    instant: 1,
    active: 1.25, // active dry is ~1.25x instant by weight
    fresh: 3, // fresh (cake) yeast is ~3x instant, the standard baking conversion
};

// ---- small helpers ------------------------------------------------------

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

// Round to a sensible number of decimals for a given ingredient weight.
// Big weights (flour, water) to whole grams; tiny ones (yeast, salt) to 0.1g.
function roundGrams(grams) {
    if (grams >= 20) return Math.round(grams);
    if (grams >= 1) return Math.round(grams * 10) / 10;
    return Math.round(grams * 100) / 100;
}

function bakersGrams(flourGrams, pct) {
    return (flourGrams * pct) / 100;
}

// ---- yeast --------------------------------------------------------------

// Temperature multiplier: how much faster/slower yeast works at tempC vs the
// reference temperature.
function tempRate(tempC) {
    return Math.pow(Q10, (tempC - YEAST_REF_TEMP_C) / 10);
}

// Instant-dry-yeast percentage needed for a single-phase schedule.
function idyPercentForSchedule(hours, tempC) {
    return (YEAST_REF_IDY_PCT * YEAST_REF_HOURS) / (hours * tempRate(tempC));
}

// Instant-dry-yeast percentage for a two-phase schedule (room + fridge).
// Each phase contributes "effective reference hours" = realHours * tempRate.
function idyPercentForPhases(phases) {
    const effectiveHours = phases.reduce((sum, p) => {
        if (!p || !p.hours) return sum;
        return sum + p.hours * tempRate(p.tempC);
    }, 0);
    if (effectiveHours <= 0) return YEAST_REF_IDY_PCT;
    return (YEAST_REF_IDY_PCT * YEAST_REF_HOURS) / effectiveHours;
}

// Convert an instant-dry-yeast percentage to the chosen yeast type.
function convertYeast(idyPct, yeastType) {
    const factor = YEAST_TYPE_FACTOR[yeastType] || 1;
    return idyPct * factor;
}

// ---- sizing (we compute grams per ball; the user picks a size) ----------

// Round pizza: dough weight scales with surface area.
function ballWeightForRound(thicknessFactor, diameterCm) {
    const radius = diameterCm / 2;
    return thicknessFactor * Math.PI * radius * radius;
}

// Pan pizza: dough weight scales with pan area.
function ballWeightForPan(gramsPerCm2, areaCm2) {
    return gramsPerCm2 * areaCm2;
}

// ---- oven / bake ---------------------------------------------------------

// Reconcile a style's ideal bake against the oven the user actually has. The
// oven is a ceiling: if it can reach the style's target, bake at the target;
// otherwise bake as hot as the oven goes and flag the shortfall (the caller
// shows a warning and an upsell to a hotter oven). Never changes the dough.
function bakeForOven(styleBake, ovenMaxTempC) {
    if (!styleBake) return null;
    const idealC = num(styleBake.tempC);
    const idealF = num(styleBake.tempF);
    const cap = num(ovenMaxTempC);
    const reachesIdeal = !cap || cap >= idealC;
    return {
        tempC: reachesIdeal ? idealC : Math.round(cap),
        tempF: reachesIdeal ? idealF : Math.round((cap * 9) / 5 + 32),
        idealTempC: idealC,
        idealTempF: idealF,
        reachesIdeal,
    };
}

// ---- preferments and sourdough starter ----------------------------------

// Split a starter (or any preferment) weight into its flour and water parts.
// hydrationPct is the starter's own hydration (e.g. 100 for a liquid poolish).
function decomposePreferment(weight, hydrationPct) {
    const h = hydrationPct / 100;
    const water = (weight * h) / (h + 1);
    const flour = weight - water;
    return { flour, water };
}

// ---- the main recipe computation ----------------------------------------

/**
 * Compute a full dough recipe from a normalized input object.
 *
 * input = {
 *   numberOfBalls, ballWeightGrams,           // total dough = balls * weight
 *   hydration, salt, oil, sugar,              // baker's percentages
 *   leavening: {
 *     method: 'direct'|'poolish'|'biga'|'sourdough',
 *     yeastType: 'instant'|'active'|'fresh',  // for yeast-based methods
 *     idyPctOverride,                          // optional, else from ferment
 *     poolishPct, poolishHydration, poolishYeastPct,
 *     bigaPct, bigaHydration, bigaYeastPct,
 *     starterPct, starterHydration,
 *   },
 *   ferment: { roomHours, roomTempC, fridgeHours, fridgeTempC },
 * }
 *
 * Returns grams for each component, split into preferment vs final dough where
 * relevant, plus per-ball and total weights and any warnings.
 */
function computeRecipe(input) {
    const leavening = input.leavening || { method: "direct", yeastType: "instant" };
    const method = leavening.method || "direct";
    const ferment = input.ferment || {};
    const warnings = [];

    const hydration = num(input.hydration);
    const salt = num(input.salt);
    const oil = num(input.oil);
    const sugar = num(input.sugar);

    const numberOfBalls = Math.max(1, Math.round(num(input.numberOfBalls) || 1));
    const ballWeight = num(input.ballWeightGrams);
    const totalDough = numberOfBalls * ballWeight;

    // Yeast percentage (instant-dry reference), from an override or the schedule.
    // Sourdough uses a starter instead of commercial yeast, so idyPct = 0.
    let idyPct = 0;
    if (method !== "sourdough") {
        if (leavening.idyPctOverride != null) {
            idyPct = num(leavening.idyPctOverride);
        } else {
            idyPct = idyPercentForPhases([
                { hours: num(ferment.roomHours), tempC: num(ferment.roomTempC) || YEAST_REF_TEMP_C },
                { hours: num(ferment.fridgeHours), tempC: num(ferment.fridgeTempC) || 4 },
            ]);
        }
        collectScheduleWarnings(ferment, warnings);
    }

    // Solve flour weight from the target total dough.
    // total = flour * (1 + (hydration + salt + oil + sugar + yeast)/100).
    // Sourdough contributes no commercial yeast; its starter flour/water are
    // part of the flour/water totals (accounted below), so they are not extra.
    const massPct = hydration + salt + oil + sugar + (method === "sourdough" ? 0 : idyPct);
    const totalFlour = totalDough / (1 + massPct / 100);
    const totalWater = bakersGrams(totalFlour, hydration);

    const recipe = {
        method,
        numberOfBalls,
        ballWeightGrams: roundGrams(ballWeight),
        totalDoughGrams: roundGrams(totalDough),
        totalFlourGrams: roundGrams(totalFlour),
        totalWaterGrams: roundGrams(totalWater),
        saltGrams: roundGrams(bakersGrams(totalFlour, salt)),
        oilGrams: oil > 0 ? roundGrams(bakersGrams(totalFlour, oil)) : 0,
        sugarGrams: sugar > 0 ? roundGrams(bakersGrams(totalFlour, sugar)) : 0,
        warnings,
    };

    if (method === "sourdough") {
        const starterPct = num(leavening.starterPct) || 20;
        const starterHydration = num(leavening.starterHydration) || 100;
        const starterWeight = bakersGrams(totalFlour, starterPct);
        const { flour: sFlour, water: sWater } = decomposePreferment(starterWeight, starterHydration);
        recipe.starter = {
            grams: roundGrams(starterWeight),
            hydration: starterHydration,
            flourGrams: roundGrams(sFlour),
            waterGrams: roundGrams(sWater),
        };
        // Hold back the starter's flour and water from what you add fresh.
        recipe.addFlourGrams = roundGrams(totalFlour - sFlour);
        recipe.addWaterGrams = roundGrams(totalWater - sWater);
        recipe.yeastGrams = 0;
        return recipe;
    }

    // Yeast-based methods. The scheduled yeast is the GRAND TOTAL for the dough;
    // a preferment carries part of it, so it is not extra on top.
    const yeastPct = convertYeast(idyPct, leavening.yeastType || "instant");
    recipe.yeastType = leavening.yeastType || "instant";
    const scheduleYeast = bakersGrams(totalFlour, yeastPct);
    recipe.yeastGrams = roundGrams(scheduleYeast);

    if (method === "poolish" || method === "biga") {
        const isPoolish = method === "poolish";
        const requestedPct = num(isPoolish ? leavening.poolishPct : leavening.bigaPct) || (isPoolish ? 30 : 40);
        const prefHydration = num(isPoolish ? leavening.poolishHydration : leavening.bigaHydration) || (isPoolish ? 100 : 50);
        const prefYeastPct = num(isPoolish ? leavening.poolishYeastPct : leavening.bigaYeastPct) || 0.2;
        // The preferment can't hold more water than the whole dough has (a 100%
        // poolish at 60% of the flour in a 55% hydration dough). Cap its flour
        // share there so the final mix never asks for negative water and the
        // dough still lands on the chosen hydration. The UI explains the cap.
        const maxPct = (hydration * 100) / prefHydration;
        const prefPct = Math.min(requestedPct, maxPct);

        const prefFlour = bakersGrams(totalFlour, prefPct);
        const prefWater = bakersGrams(prefFlour, prefHydration);
        const prefYeastIdy = bakersGrams(prefFlour, prefYeastPct);
        const prefYeast = convertYeast(prefYeastIdy, leavening.yeastType || "instant");

        recipe.preferment = {
            type: method,
            flourGrams: roundGrams(prefFlour),
            waterGrams: roundGrams(prefWater),
            yeastGrams: roundGrams(prefYeast),
            hydration: prefHydration,
            pct: prefPct,
            capped: prefPct < requestedPct,
        };
        recipe.finalFlourGrams = roundGrams(totalFlour - prefFlour);
        recipe.finalWaterGrams = roundGrams(Math.max(0, totalWater - prefWater));
        // The scheduled yeast is the grand total; the preferment already carries
        // part of it, so the final mix gets only the remainder (never negative).
        // Without this the UI shows the full schedule yeast in the final mix AND
        // the preferment yeast on top, roughly doubling the leavening.
        recipe.yeastGrams = roundGrams(Math.max(0, scheduleYeast - prefYeast));
        // Salt always goes in the final mix, never the preferment.
    }

    return recipe;
}

// ---- validation helpers -------------------------------------------------

function num(v) {
    const n = typeof v === "number" ? v : parseFloat(v);
    return Number.isFinite(n) ? n : 0;
}

function collectScheduleWarnings(ferment, warnings) {
    const checks = [
        ["room", num(ferment.roomHours), num(ferment.roomTempC)],
        ["fridge", num(ferment.fridgeHours), num(ferment.fridgeTempC)],
    ];
    for (const [, hours, tempC] of checks) {
        if (!hours) continue;
        if (tempC && (tempC < TEMP_MIN_C || tempC > TEMP_MAX_C)) {
            warnings.push(`A temperature of ${tempC}C is outside the range this tool can plan for.`);
        }
    }
    const totalHours = num(ferment.roomHours) + num(ferment.fridgeHours);
    if (totalHours && (totalHours < HOURS_MIN || totalHours > HOURS_MAX)) {
        warnings.push(`A total rise of ${totalHours}h is outside the range this tool can plan for.`);
    }
}

module.exports = {
    // constants (exported for tests and the UI)
    YEAST_REF_HOURS,
    YEAST_REF_TEMP_C,
    YEAST_REF_IDY_PCT,
    Q10,
    YEAST_TYPE_FACTOR,
    TEMP_MIN_C,
    TEMP_MAX_C,
    HOURS_MIN,
    HOURS_MAX,
    // helpers
    clamp,
    roundGrams,
    bakersGrams,
    tempRate,
    idyPercentForSchedule,
    idyPercentForPhases,
    convertYeast,
    ballWeightForRound,
    ballWeightForPan,
    bakeForOven,
    decomposePreferment,
    // main
    computeRecipe,
};
