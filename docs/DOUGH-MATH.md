# Dough calculator: how the math works

> The design and math behind the free dough calculator at
> [openpizzamap.com/tools/dough-calculator](https://openpizzamap.com/tools/dough-calculator).
> Per-style presets are seeded from AVPN, Kenji López-Alt, Ken Forkish, King Arthur
> and America's Test Kitchen. The code that implements it lives in [`lib/dough/`](../lib/dough/).

## Design principle: simple first, science hidden

The tool must feel simple, not scientific. A normal person making pizza on
Friday should get a clear answer in three taps without meeting a single piece
of jargon. All the math in this doc (baker's percentages, W-strength, Q10 yeast
scaling, DDT water temp) runs under the hood. It never has to be seen.

Rules of thumb for the UI:

- **The default screen asks three plain questions**: what are you making (style),
  how many pizzas and what size, and when do you want to bake. That is enough to
  produce a full recipe.
- **We provide the grams per ball, users never type it.** People do not know how
  many grams a dough ball should be. They pick a size in words (or a diameter),
  and we compute the ball weight for them from the style. Grams per ball is shown
  as a result ("about 260g each"), not asked as a question. It only becomes an
  editable field inside Advanced, for the few who want to override it.
- **Answers in grams, plainly.** "500g flour, 325g water, 12g salt, 1g yeast."
  Optionally a cups/spoons view for people who do not own a scale. No baker's
  percentages on the default screen.
- **Ferment is plain language, not hours-and-degrees.** Offer choices like
  "Tonight (about 4 hours)", "Tomorrow (24 hours)", "This weekend (2 to 3 days)".
  Each choice sets the real time/temp under the hood and picks the right yeast
  amount. Sliders for exact hours and fridge temp live in advanced only.
- **Flour is a friendly list.** Plain names ("Caputo blue", "regular bread
  flour", "supermarket all-purpose", "not sure / other"). W-strength and protein
  are hidden until you tap a small "why?" link. "Not sure" always works.
- **Jargon is opt-in.** Baker's percentages, W values, the water-temp tool, the
  Q10 explanation, poolish/biga, and sourdough all live behind a single
  "Advanced" disclosure that is collapsed by default. A first-time user never
  sees them.
- **Guidance in words, not just numbers.** Where a number needs context, say it
  in plain English ("this dough will be soft and a little sticky, that is
  normal") instead of showing a technical readout.

Everything below is the machinery. Keep it out of the user's way.

## Goal and constraints

Build a dough calculator that is:

- **Flexible on style.** Presets are editable starting points, never locked.
  Pick "Neapolitan," get sensible defaults, then move any slider. This is the
  #1 requirement. thebreadcode gets this wrong (fixed values, only "Custom" is
  editable); amasable and Stadler Made get it right (the advanced panel stays
  live after a preset loads). We follow amasable/Stadler.
- **Flour-aware.** A curated flour picker (roughly 15 to 19 entries, not a
  400-brand catalog). Flour choice nudges the suggested hydration range and
  fermentation ceiling, and shows a provenance badge (official spec vs
  estimated).
- **Zero backend, zero paid API.** Pure client-side arithmetic. State persists
  to `localStorage`, sharing is a URL-serialized recipe. No accounts, no PRO
  tier, no ads. Fits the hard budget rule exactly.
- **Mobile-first at 375px.** Simple default view, advanced options behind a
  disclosure (amasable's "Opciones avanzadas" pattern).

Note: "pizzanapoletana.com / PizzaCreator (Marco Fuso)" could not be found as a
live tool. The real pizzanapoletana.org is the AVPN certifying body (used as a
recipe source, not a calculator). foodgeek was substituted as the 4th reference
calculator because it is the only one that publishes its actual formulas.

## The common model (our baseline)

Every serious calculator converges on the same core, so we adopt it:

**Inputs** (baker's percentage, flour = 100%):
number of balls and ball weight (solve either direction) to derive total flour,
then hydration %, salt %, yeast % (with type + time/temp scaling), optional oil %
and sugar %, optional preferment (poolish/biga %) or sourdough starter %, plus
room temp, fridge temp, and total ferment time split across phases.

**Outputs:** flour / water / salt / yeast (+ oil / sugar) in grams, shown both
per ball and as a total, plus a timeline (mix, bulk ferment, ball, cold retard,
proof, bake) once time and temp are set.

## The math (all client-side, no dependencies)

### Baker's percentage core

```
w_ingredient(g)  = flourWeight * pct / 100
hydration%       = 100 * waterWeight / flourWeight
totalDoughWeight = flour + water + salt + yeast + oil + sugar
ballWeight       = totalDoughWeight / numberOfBalls
// invert: flourWeight solved from target (ballWeight * numberOfBalls),
// accounting for the sum of all percentages
```

If the user sets ball count + ball weight, solve flour from total dough:
`flour = totalDough / (1 + (hyd + salt + oil + sugar + yeastApprox)/100)`.

### Yeast by time and temperature (Q10 model)

Derived from the TXCraig1 "baker's yeast quantity prediction" model
(pizzamaking.com, 600+ replies of community validation), Q10 = 2 (rate doubles
per +10C). Reference point 24h at 20C with 0.03% instant dry yeast (IDY),
anchored to authentic Neapolitan: the AVPN disciplinare uses 0.1 to 3 g of fresh
yeast per liter of water, which on ~1.7 kg of flour per liter is roughly 0.05 to
0.18% fresh of flour (about 0.015 to 0.05% instant). 0.03% at the reference puts
a fresh-yeast dough on a 24h+ rise in that band. (This replaced the original
0.10% in 2026, which over-yeasted fresh doughs by ~5x versus AVPN.)

```js
function idyPercentForSchedule(desiredHours, targetTempC) {
  const REF_HOURS = 24, REF_TEMP_C = 20, REF_IDY_PCT = 0.03, Q10 = 2;
  const tempRate = Math.pow(Q10, (targetTempC - REF_TEMP_C) / 10);
  return (REF_IDY_PCT * REF_HOURS) / (desiredHours * tempRate);
}
```

Two-phase (room + fridge): compute effective reference-hours per phase and sum
before inverting:
`effectiveHours = hoursPhase * tempRate(phaseTemp)`, then
`idyPct = REF_IDY_PCT * REF_HOURS / sum(effectiveHours)`.

Clamp inputs to about 4 to 45C and 1 to 96h. Outside that the approximation
breaks (yeast dies above ~50C, near-dormant below ~4C). Surface a warning, do
not silently extrapolate.

### Yeast type conversion

IDY is the internal reference unit (it is what the Q10 formula outputs):

```
instantPct   = idyPct            // reference
activeDryPct = idyPct * 1.25     // active dry ~1.25x instant
freshPct     = idyPct * 3        // fresh (cake) yeast ~3x instant
```

Fresh is the standard 3x instant (the widely used baking conversion, e.g. King
Arthur). The original build used foodgeek's 3.75x, which compounded the hot 0.10%
reference; both were dialled back in 2026 so fresh-yeast output matches AVPN.

### Desired-dough-temperature (water temp)

Standard DDT method, three variants by how much the user tracks. Default target
dough temp 24C (75F).

```
// hand mix, no preferment:
waterTempC = 3 * DDT - roomTempC - flourTempC
// with mixer friction:
waterTempC = 4 * DDT - roomTempC - flourTempC - frictionC
// with mixer + preferment:
waterTempC = 5 * DDT - roomTempC - flourTempC - frictionC - prefermentTempC
```

Friction presets: hand ~3 to 4C, stand mixer ~6 to 8C, spiral ~10 to 12C. This
is an optional advanced tool (Pandough calls it "Factor of 3"), not core.

### Poolish (100% hydration preferment)

```
poolishFlour = totalFlour * poolishPct / 100     // typical 10-30% of flour
poolishWater = poolishFlour * 1.0                 // 100% hydration
poolishYeast = poolishFlour * poolishYeastPct/100 // tiny, ~0.1-0.3%, 8-16h room temp
finalFlour   = totalFlour - poolishFlour
finalWater   = totalWater - poolishWater
salt         = totalFlour * saltPct / 100         // all salt held for final dough
```

### Biga (stiff low-hydration preferment)

```
bigaFlour  = totalFlour * bigaPct / 100      // typical 30-50% of flour
bigaWater  = bigaFlour * bigaHydrationPct/100 // 45-60% hydration
bigaYeast  = bigaFlour * bigaYeastPct / 100  // tiny, ferments cooler/longer, 12-24h
finalFlour = totalFlour - bigaFlour
finalWater = totalWater - bigaWater
```

### Sourdough starter decomposition (foodgeek, the one published formula)

```js
function starterFlourWater(starterWeight, starterHydrationPct) {
  const h = starterHydrationPct / 100;       // 1.0 for 100% hydration
  const starterFluid = (starterWeight * h) / (h + 1);
  const starterFlour = starterWeight - starterFluid;
  return { starterFlour, starterFluid };      // subtract both from the final dough
}
```

Default starter 20% of flour at 21C, range 10 to 30% (less when warm, more when
cold). Offer thebreadcode's leaner alternative (5% flour, stiff 60% starter) as
a second preset.

## Style presets (editable, data-driven)

Store as plain data, not hardcoded UI branches, so adding a style is a data
change. Every field a preset sets populates the same editable widget the user
can move afterward. Numbers below are shipped defaults with slider (min, max).
Bake temp given C / F. Sources: AVPN disciplinare, Serious Eats (Kenji),
Forkish, King Arthur, ATK, plus the per-style research in this session.

| Style | Hydration | Salt | Oil | Sugar | Yeast (IDY) | Ball weight | Bake |
|---|---|---|---|---|---|---|---|
| Neapolitan | 62% (55-68) | 2.8% (2-3.5) | 0% (0-2) | 0% (0-1) | 0.2% (0.05-0.5) | 260g (200-320) | 480C/900F, 60-120s |
| New York | 62% (58-68) | 2.2% (1.8-2.8) | 2.5% (0-4) | 1% (0-3) | 0.4% (0.1-1) | 300g (250-500) | 290C/550F, 5-12min |
| Detroit | 70% (65-78) | 2.2% (1.8-3) | 3% (0-6) | 0.5% (0-2) | 1% (0.2-2) | 530g/pan (450-600) | 250C/480F, 10-18min |
| Sicilian | 70% (65-78) | 2.2% (1.8-2.8) | 5% (3-8) | 1% (0-2) | 0.6% (0.2-1.5) | 950g/sheet (800-1100) | 240C/460F, 18-30min |
| Grandma | 62% (58-70) | 2.2% (1.8-2.8) | 6% (3-8) | 1% (0-2) | 0.8% (0.3-1.5) | 550g/sheet (450-650) | 270C/520F, 15-20min |
| Roman al taglio | 80% (75-90) | 2.2% (1.8-2.8) | 4.5% (3-7) | 0% (0-1) | 0.2% (0.05-0.5) | 0.8g/cm2 of pan | 255C/490F, 15-25min |
| Roman tonda | 55% (50-58) | 2.2% (1.8-2.8) | 6.5% (5-8) | 0% (0-1) | 0.25% (0.1-0.5) | 180g (150-220) | 350C/660F, 3-8min |
| Chicago deep dish | 48% water (40-55) | 1.8% (1.5-2.2) | 18% fat (12-25) | 0.5% (0-2) | 0.8% (0.5-1.5) | 475g/9in (450-550) | 220C/425F, 25-45min |
| New Haven | 66% (62-70) | 2.2% (1.8-2.8) | 1% (0-3) | 0% (0-1) | 0.4% (0.15-1) | 350g (300-400) | 400C/750F oven, 3-10min |
| Focaccia | 78% (70-90) | 2% (1.8-2.5) | 9% (6-12) | 1% (0-2) | 1% (0.5-1.5) | 700g/sheet (500-900) | 220C/425F, 18-30min |

Preset object shape:

```js
{
  id: 'neapolitan',
  name: 'Neapolitan',
  hydration: { default: 62, min: 55, max: 68 },
  salt:      { default: 2.8, min: 2, max: 3.5 },
  oil:       { default: 0, min: 0, max: 2 },
  sugar:     { default: 0, min: 0, max: 1 },
  yeastPct:  { default: 0.2, min: 0.05, max: 0.5 }, // IDY, or derive from ferment
  ballWeight:{ default: 260, min: 200, max: 320 },  // pan styles: gramsPerCm2 instead
  ferment:   { roomHours: 8, roomTemp: 20, fridgeHours: 0, fridgeTemp: 4 },
  bake:      { tempC: 480, tempF: 900, minSeconds: 60, maxSeconds: 120 },
  defaultFlour: 'caputo-pizzeria',
  note: 'AVPN allows 55-62% for wood-fired; 62% ships as a home-oven default.'
}
```

### Size to grams-per-ball (we compute it, users pick a size)

Users choose a size in plain terms; we derive the ball weight. Dough scales with
area, so ball weight = a per-style "thickness factor" times the pizza's area.

Round styles: `ballWeight(g) = thicknessFactor(g/cm2) * pi * (diameterCm/2)^2`.
The thickness factor is back-solved from each preset's default ball weight and
default size, so the defaults in the table above stay exact.

| Round style | Thickness factor (g/cm2) | Size choices (default in bold) |
|---|---|---|
| Neapolitan | 0.42 | Personal 25cm/10in, **Classic 28cm/11in (260g)**, Large 32cm/13in |
| New York | 0.30 | Medium 30cm/12in, **Large 36cm/14in (300g)**, XL 40cm/16in |
| Roman tonda | 0.25 | **Personal 30cm/12in (180g)**, Large 33cm/13in |
| New Haven | 0.28 | **Large 38cm/15in (350g)**, XL 40cm/16in |

Pan styles: ball weight = `gramsPerCm2 * panArea`. Ask for the pan in plain
sizes and compute from its area.

| Pan style | Grams per cm2 | Pan choices (default in bold) |
|---|---|---|
| Detroit | 0.55 | **10x14in pan (530g)**, 8x10in |
| Sicilian | 0.65 | **Half sheet 33x46cm (950g)**, quarter sheet |
| Grandma | 0.38 | **Half sheet 33x46cm (550g)**, quarter sheet |
| Roman al taglio | 0.80 | **Quarter sheet 23x33cm (600g)**, half sheet |
| Chicago deep dish | area x depth | **9in round (475g)**, 10in, 12in |
| Focaccia | 0.46 | **Half sheet 33x46cm (700g)**, quarter sheet |

Show the computed weight back plainly ("makes 4 balls of about 260g, one 11 inch
pizza each"). A raw grams-per-ball input and a custom-diameter/custom-pan field
live in Advanced only. Round friendly-size labels to the nearest 5g when
displaying.

### Style-specific handling to get right:
- **Chicago deep dish**: track water hydration and fat % as two separate sliders.
  Its fat behaves like a laminated pastry, not an emulsified addition, so folding
  butter into one "oil %" is wrong.
- **Pan styles (Detroit, Sicilian, Grandma, al taglio, focaccia)**: scale ball
  weight by pan area (grams per cm2), let the user enter pan dimensions, rather
  than hard-coding one pan.
- **Neapolitan**: default 62% for home ovens; keep the AVPN 55-62% figure as
  tooltip lore, not the slider default.
- **New Haven**: default the home-oven-equivalent bake (260C/500F + steel);
  keep the 650 to 1000F coal-oven number as flavor text only.

### v1 scope

Must-have v1: Neapolitan, New York, Detroit, Sicilian/Grandma (ship combined if
one slot), Chicago deep dish, plus Custom. Nice-to-have later: Roman al taglio,
Roman tonda, New Haven, Focaccia.

## Flour picker

Curated set (19 rows, includes generic fallbacks so "I don't know my brand"
still works). Each flour nudges the suggested hydration range and ferment
ceiling and carries a provenance flag. `W: null` means no published strength
rating, use protein-only logic and never fabricate a displayed W.

**Caputo is the featured brand.** All four Caputo types ship in the list and
appear together at the top under friendly labels (technical names in
parentheses, hidden until tapped):

- "Caputo blue (Pizzeria)", the classic, best for Neapolitan
- "Caputo red (Cuoco / Chef)", a bit stronger, good for longer rises
- "Caputo Nuvola", for a puffy, airy crust
- "Caputo strong (Americana / Manitoba)", for very long fridge rises

Below Caputo, the friendly list groups the rest simply: "regular bread flour",
"supermarket all-purpose", "whole wheat", and "not sure / other" (the default).

```json
[
  {"name":"Caputo Pizzeria (Blue)","type":"00","protein":12.5,"W":270,"hydrationMin":55,"hydrationMax":65,"bestStyles":["Neapolitan"],"provenance":"official"},
  {"name":"Caputo Cuoco / Chef (Red)","type":"00","protein":13.0,"W":310,"hydrationMin":60,"hydrationMax":68,"bestStyles":["Neapolitan","long ferment"],"provenance":"official"},
  {"name":"Caputo Nuvola","type":"0","protein":12.75,"W":285,"hydrationMin":70,"hydrationMax":80,"bestStyles":["Neapolitan contemporary","high hydration"],"provenance":"official-ish"},
  {"name":"Caputo Americana / Manitoba Oro","type":"0 strong","protein":14.5,"W":380,"hydrationMin":65,"hydrationMax":75,"bestStyles":["long cold ferment","blend booster"],"provenance":"official"},
  {"name":"Le 5 Stagioni Pizza Napoletana","type":"00","protein":12.5,"W":260,"hydrationMin":58,"hydrationMax":63,"bestStyles":["Neapolitan"],"provenance":"official-ish"},
  {"name":"Molino Dallagiovanna La Napoletana","type":"00","protein":12.5,"W":310,"hydrationMin":60,"hydrationMax":65,"bestStyles":["Neapolitan","AVPN","long cold ferment"],"provenance":"official-ish"},
  {"name":"Polselli Classica","type":"00","protein":12.0,"W":270,"hydrationMin":58,"hydrationMax":62,"bestStyles":["Neapolitan same-day"],"provenance":"official-ish"},
  {"name":"King Arthur Bread Flour","type":"bread","protein":12.7,"W":null,"hydrationMin":60,"hydrationMax":68,"bestStyles":["NY style"],"provenance":"protein-official-W-estimated"},
  {"name":"King Arthur \"00\" Pizza Flour","type":"00","protein":11.25,"W":null,"hydrationMin":55,"hydrationMax":62,"bestStyles":["Neapolitan-style (home oven)"],"provenance":"protein-official-W-estimated"},
  {"name":"Bob's Red Mill Artisan Bread Flour","type":"bread","protein":13.0,"W":null,"hydrationMin":60,"hydrationMax":68,"bestStyles":["NY style","artisan bread"],"provenance":"protein-official-W-estimated"},
  {"name":"Central Milling High Mountain","type":"high-gluten","protein":13.5,"W":330,"hydrationMin":62,"hydrationMax":70,"bestStyles":["Sicilian","NY style","sourdough pizza"],"provenance":"protein-official-W-estimated"},
  {"name":"All Trumps / Sir Lancelot (high-gluten)","type":"high-gluten","protein":14.2,"W":null,"hydrationMin":58,"hydrationMax":65,"bestStyles":["NY style","bagels"],"provenance":"protein-official-W-estimated"},
  {"name":"King Arthur All-Purpose","type":"AP","protein":11.7,"W":null,"hydrationMin":55,"hydrationMax":62,"bestStyles":["thin crust","quick dough"],"provenance":"protein-official-W-estimated"},
  {"name":"Generic supermarket AP","type":"AP","protein":10.5,"W":null,"hydrationMin":55,"hydrationMax":60,"bestStyles":["thin/cracker crust","fallback"],"provenance":"estimated"},
  {"name":"Semolina / durum blend","type":"semolina","protein":13.0,"W":null,"hydrationMin":55,"hydrationMax":62,"bestStyles":["Sicilian sfincione","Roman/pinsa blend"],"provenance":"estimated","exception":"durum"},
  {"name":"Whole wheat","type":"whole wheat","protein":14.0,"W":null,"hydrationMin":68,"hydrationMax":78,"bestStyles":["rustic","health-forward blend"],"provenance":"protein-official","exception":"wholewheat"},
  {"name":"Tipo 1","type":"Tipo 1","protein":13.0,"W":260,"hydrationMin":62,"hydrationMax":68,"bestStyles":["rustic/artisan"],"provenance":"official"},
  {"name":"Generic bread flour","type":"bread","protein":12.0,"W":null,"hydrationMin":60,"hydrationMax":65,"bestStyles":["NY style fallback"],"provenance":"estimated"},
  {"name":"Generic 00","type":"00","protein":12.0,"W":250,"hydrationMin":58,"hydrationMax":63,"bestStyles":["Neapolitan fallback"],"provenance":"estimated"}
]
```

### The nudge rule

Two signals: protein % (always present) and W (only when known). When they
disagree and W is published, W wins. Durum and whole wheat are special-cased.

**Classify strength:**

| Band | Protein | W (if known) |
|---|---|---|
| weak | < 11.0% | < 220 |
| medium | 11.0-13.0% | 220-300 |
| strong | > 13.0% | > 300 |

**Hydration ceiling by band:** weak 60%, medium 68%, strong 80% (80 only if
W > 330 or protein > 14). Slider default:

```
hydrationSuggestedMax = clamp(50 + (W_or_estimate / 10), 58, 80)
// W_or_estimate = published W, else (protein - 9) * 40 as a crude proxy.
// Use the proxy only to pick a slider default, never display it as a "W value".
```

**Ferment tolerance** (folk heuristic days ~= W/100, label it as folk wisdom):
weak = same-day 4 to 8h only; medium = 8-24h room or 24-48h fridge; strong =
24-72h fridge; very strong (W>350) = 72-120h, usually as a blend booster.

**Exceptions (do not run through the generic bands):**
1. Durum/semolina: high protein overstates strength (durum gluten is less
   extensible). Cap at medium-band hydration, default to "blend, not 100%"
   unless a Sicilian/pinsa style is selected.
2. Whole wheat: high protein but bran cuts gluten. Nudge hydration UP (bran
   absorbs water), suggest blending with a stronger flour.
3. `W: null`: show protein-based guidance labeled "estimated, no published
   strength rating."

## UX

- **Layout**: single-column mobile-first at 375px. Simple view = style picker,
  how many pizzas + size, a plain "when do you want to bake" picker, and the
  recipe in grams. That is the whole first screen. Flour picker sits just below
  as a friendly list defaulting to "not sure / other". Everything else
  (salt/oil/sugar, yeast type, exact room/fridge temp, ferment split,
  poolish/biga, sourdough, water-temp tool, baker's-percentage view) lives under
  one collapsed "Advanced" disclosure.
- **Ferment picker is plain choices, not sliders**: "Tonight", "Tomorrow", "This
  weekend", each mapping to real hours/temp and the right yeast amount under the
  hood. The hours/temp sliders only appear if the user opens Advanced.
- **Leavening method is optional, default is the simple one.** The tool defaults
  to plain packet/fresh yeast mixed straight in (no preferment), so a beginner
  never has to know what a poolish is. An optional "leavening method" chooser
  offers Direct yeast (default), Poolish, Biga, and Sourdough starter. Each
  non-default option carries a small info tooltip (an "i" icon) with a one or two
  sentence plain-English explanation, for example:
  - Poolish: "A loose, soupy starter of equal flour and water plus a pinch of
    yeast, left out overnight. Adds flavor and a lighter crust. Optional."
  - Biga: "A stiff, dry starter left to ferment for a day. Gives a chewier, more
    open crumb. Optional."
  - Sourdough: "Uses your own sourdough starter instead of packet yeast, for a
    tangy, slow-risen dough. Optional, and you need an active starter."

  Choosing one reveals only that method's extra field (poolish/biga percentage,
  or starter amount) with a sensible default already filled in. The math
  (poolish/biga split, starter decomposition) stays hidden.
- **Live recalc, no "calculate" button.** Every input updates the output strip
  instantly (Pandough and foodgeek both do this).
- **Steppers for pizza count** (small integer) and a **size picker in words**
  (Personal / Classic / Large, or a diameter). We compute and show the grams per
  ball; users never enter it. **Sliders for hydration / temp / ferment time**
  live in Advanced (continuous, approximate is fine). If a raw ball-weight field
  is exposed in Advanced, allow 1g precision (PizzApp+'s 10g steps are a
  documented complaint).
- **Save/share = URL-serialized recipe** (foodgeek's permanent-link pattern):
  serialize all inputs into query params, no backend, no accounts. Also persist
  last-used inputs to `localStorage` so the tool remembers the last dough.
- **Provenance badge** on the flour's W/protein ("official spec" vs "estimated"),
  the same badge grammar we want for place curation.
- **Warnings, not silent clamps**: if hydration exceeds the flour's supported
  range, or ferment time/temp falls outside the Q10-valid window, show a short
  plain-English note rather than quietly capping.
- **Optional, and only if it stays friendly: a "how it will turn out" readout.**
  Pandough's 6-axis fermentation radar is on the technical side for our audience.
  If we add anything here, prefer one plain-English line ("light and airy with a
  crisp base") over a science dial, or make the dial a tap-to-expand extra, never
  part of the default screen. Skip it entirely for v1 if it adds any complexity.

