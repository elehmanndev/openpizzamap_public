// Dough calculator engine: pure-function math checks. No DB, no app bootstrap.
const test = require("node:test");
const assert = require("node:assert/strict");

const {
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
    computeRecipe,
    YEAST_REF_IDY_PCT,
} = require("../lib/dough/engine");
const { OVENS, getOven } = require("../lib/dough/ovens");

const approx = (actual, expected, tol, msg) =>
    assert.ok(Math.abs(actual - expected) <= tol, `${msg || ""} expected ~${expected}, got ${actual}`);

test("bakersGrams: percentage of flour", () => {
    assert.equal(bakersGrams(1000, 62), 620);
    assert.equal(bakersGrams(500, 2.5), 12.5);
});

test("tempRate: doubles per +10C, 1.0 at reference", () => {
    approx(tempRate(20), 1, 1e-9, "reference temp");
    approx(tempRate(30), 2, 1e-9, "+10C");
    approx(tempRate(10), 0.5, 1e-9, "-10C");
});

// Authenticity guard: a fresh-yeast Neapolitan on a 24 h+ rise must land in the
// AVPN fresh-yeast band (~0.05 to 0.18% of flour, disciplinare 0.1 to 3 g/L),
// not the ~1% the model produced before the 2026 recalibration.
test("fresh-yeast Neapolitan stays in the AVPN yeast band", () => {
    const r = computeRecipe({
        numberOfBalls: 6, ballWeightGrams: 260,
        hydration: 62, salt: 2.8, oil: 0, sugar: 0,
        leavening: { method: "direct", yeastType: "fresh" },
        ferment: { roomHours: 2, roomTempC: 20, fridgeHours: 22, fridgeTempC: 4 }, // "tomorrow"
    });
    const freshPct = (r.yeastGrams / r.totalFlourGrams) * 100;
    assert.ok(freshPct > 0.05 && freshPct < 0.3, `fresh yeast ${freshPct.toFixed(3)}% of flour outside authentic band`);
});

test("idyPercentForSchedule: hits the reference point exactly", () => {
    // 24h at 20C must return the reference 0.10% IDY.
    approx(idyPercentForSchedule(24, 20), YEAST_REF_IDY_PCT, 1e-9, "reference schedule");
});

test("idyPercentForSchedule: warmer or longer needs less yeast", () => {
    const cool = idyPercentForSchedule(24, 20);
    const warm = idyPercentForSchedule(24, 30);
    const longer = idyPercentForSchedule(48, 20);
    assert.ok(warm < cool, "warmer needs less yeast");
    assert.ok(longer < cool, "longer needs less yeast");
    // +10C should roughly halve the yeast requirement.
    approx(warm, cool / 2, 1e-9, "warm halves yeast");
});

test("idyPercentForPhases: single room phase matches single-phase formula", () => {
    const phases = idyPercentForPhases([{ hours: 24, tempC: 20 }, { hours: 0, tempC: 4 }]);
    approx(phases, idyPercentForSchedule(24, 20), 1e-9, "one active phase");
});

test("idyPercentForPhases: a cold phase contributes little", () => {
    const roomOnly = idyPercentForPhases([{ hours: 8, tempC: 20 }]);
    const roomPlusFridge = idyPercentForPhases([{ hours: 8, tempC: 20 }, { hours: 24, tempC: 4 }]);
    // Adding a cold phase lowers the needed yeast, but not by much per hour.
    assert.ok(roomPlusFridge < roomOnly, "fridge time lowers yeast need");
});

test("bakeForOven: hot oven hits the target, cool oven caps and flags shortfall", () => {
    const neaBake = { tempC: 480, tempF: 900 };
    const wood = bakeForOven(neaBake, getOven("wood").maxTempC);
    assert.equal(wood.reachesIdeal, true, "wood oven reaches Neapolitan heat");
    assert.equal(wood.tempC, 480, "bakes at the target when the oven can");
    const home = bakeForOven(neaBake, getOven("home").maxTempC);
    assert.equal(home.reachesIdeal, false, "home oven falls short of 480C");
    assert.equal(home.tempC, 285, "caps the bake at the oven max");
    assert.equal(home.idealTempC, 480, "still reports the style ideal for the warning");
    assert.equal(bakeForOven(null, 285), null, "no style bake -> null");
});

test("ovens: ids unique and the default resolves", () => {
    const ids = OVENS.map((o) => o.id);
    assert.equal(new Set(ids).size, ids.length, "oven ids are unique");
    assert.ok(getOven("home").maxTempC > 0 && getOven("nonsense").id === OVENS[0].id, "getOven falls back to the first oven");
});

test("convertYeast: fresh 3x, active 1.25x instant", () => {
    const idy = 1;
    assert.equal(convertYeast(idy, "instant"), 1);
    assert.equal(convertYeast(idy, "active"), 1.25);
    assert.equal(convertYeast(idy, "fresh"), 3);
    // Round-trip a table row: 8g instant -> 10g active -> 24g fresh.
    approx(convertYeast(8, "active"), 10, 1e-9, "8 instant -> 10 active");
    approx(convertYeast(8, "fresh"), 24, 1e-9, "8 instant -> 24 fresh");
});

test("ballWeightForRound: scales with area (diameter squared)", () => {
    const tf = 0.42;
    const small = ballWeightForRound(tf, 28);
    const big = ballWeightForRound(tf, 56);
    approx(big / small, 4, 1e-6, "double diameter -> 4x weight");
    // Neapolitan 28cm at 0.42 g/cm2 lands near the ~260g default.
    approx(small, 258.6, 1, "28cm classic ball");
});

test("ballWeightForPan: grams per cm2 times area", () => {
    assert.equal(ballWeightForPan(0.55, 1000), 550);
});

test("decomposePreferment: 100% hydration splits in half", () => {
    const { flour, water } = decomposePreferment(200, 100);
    approx(flour, 100, 1e-9, "flour half");
    approx(water, 100, 1e-9, "water half");
});

test("decomposePreferment: stiff 50% starter", () => {
    const { flour, water } = decomposePreferment(150, 50);
    // 50% hydration -> flour:water = 2:1, so 100g flour + 50g water.
    approx(flour, 100, 1e-9, "flour");
    approx(water, 50, 1e-9, "water");
});

test("computeRecipe (direct): totals reconcile to target dough weight", () => {
    const r = computeRecipe({
        numberOfBalls: 4,
        ballWeightGrams: 260,
        hydration: 62,
        salt: 2.8,
        oil: 0,
        sugar: 0,
        leavening: { method: "direct", yeastType: "instant", idyPctOverride: 0.2 },
    });
    assert.equal(r.numberOfBalls, 4);
    assert.equal(r.totalDoughGrams, 1040);
    // flour + water + salt + yeast should sum to about the total dough.
    const sum = r.totalFlourGrams + r.totalWaterGrams + r.saltGrams + r.yeastGrams;
    approx(sum, 1040, 1.5, "components reconcile to total");
    // Hydration holds: water / flour ~ 62%.
    approx((r.totalWaterGrams / r.totalFlourGrams) * 100, 62, 0.3, "hydration preserved");
});

test("computeRecipe (direct): oil and sugar appear only when set", () => {
    const none = computeRecipe({
        numberOfBalls: 1, ballWeightGrams: 260, hydration: 62, salt: 2.8, oil: 0, sugar: 0,
        leavening: { method: "direct", yeastType: "instant", idyPctOverride: 0.2 },
    });
    assert.equal(none.oilGrams, 0);
    assert.equal(none.sugarGrams, 0);
    const ny = computeRecipe({
        numberOfBalls: 1, ballWeightGrams: 300, hydration: 62, salt: 2.2, oil: 2.5, sugar: 1,
        leavening: { method: "direct", yeastType: "instant", idyPctOverride: 0.4 },
    });
    assert.ok(ny.oilGrams > 0, "oil present");
    assert.ok(ny.sugarGrams > 0, "sugar present");
});

test("computeRecipe (poolish): preferment + final flour sum to total flour", () => {
    const r = computeRecipe({
        numberOfBalls: 4, ballWeightGrams: 260, hydration: 65, salt: 2.5, oil: 0, sugar: 0,
        leavening: { method: "poolish", yeastType: "instant", idyPctOverride: 0.2, poolishPct: 30, poolishHydration: 100, poolishYeastPct: 0.2 },
    });
    assert.ok(r.preferment, "has a preferment block");
    approx(r.preferment.flourGrams + r.finalFlourGrams, r.totalFlourGrams, 1.5, "flour splits add up");
    approx(r.preferment.waterGrams + r.finalWaterGrams, r.totalWaterGrams, 1.5, "water splits add up");
    // Poolish at 100% hydration: its flour and water are equal.
    approx(r.preferment.flourGrams, r.preferment.waterGrams, 1, "poolish is 100% hydration");
});

test("computeRecipe (poolish): final + preferment yeast reconcile to the schedule (no double count)", () => {
    const r = computeRecipe({
        numberOfBalls: 4, ballWeightGrams: 260, hydration: 65, salt: 2.5, oil: 0, sugar: 0,
        leavening: { method: "poolish", yeastType: "instant", idyPctOverride: 0.2, poolishPct: 30, poolishHydration: 100, poolishYeastPct: 0.2 },
    });
    const scheduled = (r.totalFlourGrams * 0.2) / 100; // idyPctOverride 0.2%, instant type
    approx(r.yeastGrams + r.preferment.yeastGrams, scheduled, 0.05, "final + preferment yeast = schedule total");
    assert.ok(r.yeastGrams >= 0, "final-mix yeast never negative");
    assert.ok(r.yeastGrams < scheduled, "final mix is the remainder after the preferment's share");
});

test("computeRecipe (poolish): a poolish wetter than the dough is capped, final water never negative", () => {
    // 55% hydration with a 100% poolish at 60% of the flour used to give
    // "Final mix water: -31.68 g" on the public calculator.
    const r = computeRecipe({
        numberOfBalls: 4, ballWeightGrams: 250, hydration: 55, salt: 2.8, oil: 0, sugar: 0,
        leavening: { method: "poolish", yeastType: "instant", poolishPct: 60 },
        ferment: { roomHours: 24, roomTempC: 20 },
    });
    assert.ok(r.finalWaterGrams >= 0, `final water ${r.finalWaterGrams}`);
    assert.equal(r.preferment.capped, true);
    approx(r.preferment.pct, 55, 1e-9, "capped at hydration / poolish hydration");
    approx(r.preferment.waterGrams + r.finalWaterGrams, r.totalWaterGrams, 1.5, "water still adds up");
    approx(r.preferment.flourGrams + r.finalFlourGrams, r.totalFlourGrams, 1.5, "flour still adds up");

    const ok = computeRecipe({
        numberOfBalls: 4, ballWeightGrams: 260, hydration: 65, salt: 2.5, oil: 0, sugar: 0,
        leavening: { method: "poolish", yeastType: "instant", idyPctOverride: 0.2, poolishPct: 30 },
    });
    assert.equal(ok.preferment.capped, false, "a normal poolish is left alone");
    assert.equal(ok.preferment.pct, 30);
});

test("computeRecipe (sourdough): no commercial yeast, starter held back from adds", () => {
    const r = computeRecipe({
        numberOfBalls: 4, ballWeightGrams: 250, hydration: 70, salt: 2.2, oil: 0, sugar: 0,
        leavening: { method: "sourdough", starterPct: 20, starterHydration: 100 },
    });
    assert.equal(r.yeastGrams, 0, "no packet yeast");
    assert.ok(r.starter, "has a starter block");
    // Starter flour/water + fresh adds should reconstruct the totals.
    approx(r.addFlourGrams + r.starter.flourGrams, r.totalFlourGrams, 1.5, "flour reconstructs");
    approx(r.addWaterGrams + r.starter.waterGrams, r.totalWaterGrams, 1.5, "water reconstructs");
});

test("computeRecipe: schedule outside the safe window raises a warning", () => {
    const r = computeRecipe({
        numberOfBalls: 1, ballWeightGrams: 260, hydration: 62, salt: 2.8, oil: 0, sugar: 0,
        leavening: { method: "direct", yeastType: "instant" },
        ferment: { roomHours: 200, roomTempC: 20 },
    });
    assert.ok(r.warnings.length > 0, "warns on a 200h rise");
});

test("roundGrams: big whole, small tenths, tiny hundredths", () => {
    assert.equal(roundGrams(619.6), 620);
    assert.equal(roundGrams(12.54), 12.5);
    assert.equal(roundGrams(0.834), 0.83);
});
