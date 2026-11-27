// Ideal-pizza recommender: feel -> style resolution and catalog integrity.
// Match model = lexicographic profile: weighted feel overlap, then bake fit
// (oven + ferment, bake flow only), then `priority`. Eat-out passes no oven/rise
// so it always lands each feel-cluster's recognizable, high-coverage default.
const test = require("node:test");
const assert = require("node:assert/strict");

const { FEELS, MAX_FEELS, REC_STYLES, resolveStyle } = require("../lib/dough/recommend");
const { getStyle } = require("../lib/dough/presets");

test("resolveStyle: no feels falls back to Neapolitan", () => {
    assert.equal(resolveStyle([]).key, "neapolitan");
    assert.equal(resolveStyle(null).key, "neapolitan");
    assert.equal(resolveStyle(["nonsense"]).key, "neapolitan");
});

test("resolveStyle: vocabulary + cap", () => {
    assert.deepEqual(FEELS, ["fluffy", "crispy", "saucy", "thin", "thick", "cheesy", "charred"]);
    assert.equal(MAX_FEELS, 3);
    const r = resolveStyle(["fluffy", "crispy", "saucy", "thin", "thick"]);
    assert.ok(r && r.calcId && r.siteSlug, "resolves despite over-cap selection");
});

test("resolveStyle: eat-out (no bake hints) lands the recognizable cluster defaults", () => {
    assert.equal(resolveStyle(["fluffy"]).key, "neapolitan", "fluffy -> Neapolitan (not the niche contemporanea)");
    assert.equal(resolveStyle(["fluffy", "cheesy"]).key, "neapolitan", "fluffy+cheesy -> Neapolitan, keeps its coverage");
    assert.equal(resolveStyle(["cheesy"]).key, "neapolitan", "cheesy alone -> Neapolitan");
    assert.equal(resolveStyle(["thin"]).key, "new-york", "thin -> New York");
    assert.equal(resolveStyle(["thin", "cheesy"]).key, "new-york", "thin+cheesy -> New York");
    assert.equal(resolveStyle(["crispy", "thin"]).key, "romana", "crispy+thin -> Romana (NY is foldable, not crisp)");
    assert.equal(resolveStyle(["saucy", "thick"]).key, "detroit", "saucy+thick -> Detroit");
});

test("resolveStyle: saucy+cheesy reads as a deep pan pie, fluffy does not cancel it", () => {
    // The originally reported case: saucy is the deep-pan driver, so it wins the
    // fluffy+cheesy tie regardless of the oven.
    assert.equal(resolveStyle(["saucy", "fluffy", "cheesy"]).key, "chicago", "saucy+fluffy+cheesy -> Chicago");
    assert.equal(resolveStyle(["saucy", "cheesy"]).key, "chicago", "saucy+cheesy -> Chicago");
    assert.equal(resolveStyle(["saucy", "fluffy", "cheesy"], "gas", "weekend").key, "chicago", "even with bake hints");
});

test("resolveStyle: a single topping never overrides an explicit crust feel", () => {
    assert.equal(resolveStyle(["saucy", "thin"]).key, "new-york", "thin beats a lone saucy");
    assert.equal(resolveStyle(["crispy", "saucy"]).key, "romana", "crispy beats a lone saucy");
    // But two toppings (saucy+cheesy) are two matches and outscore one crust feel.
    assert.equal(resolveStyle(["crispy", "saucy", "cheesy"]).key, "chicago", "saucy+cheesy pair beats lone crispy");
});

test("resolveStyle: charred names the well-done crust (New Haven / Neapolitan)", () => {
    assert.equal(resolveStyle(["charred"]).key, "neapolitan", "charred alone -> Neapolitan (leopard char, p1)");
    assert.equal(resolveStyle(["charred", "thin"]).key, "new-haven", "charred+thin -> New Haven");
    assert.equal(resolveStyle(["charred", "crispy"]).key, "new-haven", "charred+crispy -> New Haven");
});

test("resolveStyle: all nine catalog styles are reachable", () => {
    const got = new Set([
        resolveStyle(["fluffy"]).key,                              // neapolitan
        resolveStyle(["thin", "cheesy"]).key,                      // new-york
        resolveStyle(["saucy", "thick"]).key,                      // detroit
        resolveStyle(["saucy", "thick", "cheesy"]).key,            // chicago
        resolveStyle(["saucy", "thick"], "home", "weekend").key,   // sicilian
        resolveStyle(["fluffy", "thick"]).key,                     // al-taglio
        resolveStyle(["crispy", "thin"]).key,                      // romana
        resolveStyle(["crispy", "thin", "charred"]).key,           // new-haven
        resolveStyle(["fluffy"], "gas", "weekend").key,            // contemporanea
    ]);
    for (const key of REC_STYLES.map((s) => s.key)) {
        assert.ok(got.has(key), `${key} is reachable from some selection`);
    }
});

test("resolveStyle: oven + ferment split same-feel siblings on the bake flow", () => {
    // Neapolitan vs Contemporanea (fluffy family)
    assert.equal(resolveStyle(["fluffy", "cheesy"], "wood", "tomorrow").key, "neapolitan", "wood + short rise -> classic Neapolitan");
    assert.equal(resolveStyle(["fluffy", "cheesy"], "gas", "weekend").key, "contemporanea", "gas + long rise -> Contemporanea");
    assert.equal(resolveStyle(["fluffy", "cheesy"], "gas", "tomorrow").key, "neapolitan", "modern oven alone (same-day) stays Neapolitan");
    assert.equal(resolveStyle(["fluffy", "cheesy"], "wood", "weekend").key, "neapolitan", "a conflicting hint pair falls back to priority");
    // Detroit vs Sicilian (saucy+thick family)
    assert.equal(resolveStyle(["saucy", "thick"], "gas", "tonight").key, "detroit", "hot deck -> Detroit");
    assert.equal(resolveStyle(["saucy", "thick"], "home", "weekend").key, "sicilian", "home oven + long rise -> Sicilian");
    // Romana vs New Haven (crispy+thin family)
    assert.equal(resolveStyle(["crispy", "thin"], "home", "tonight").key, "romana", "same-day home bake -> Romana");
    assert.equal(resolveStyle(["crispy", "thin"], "wood", "tomorrow").key, "new-haven", "well-done wood bake -> New Haven");
});

test("recommend catalog: every calcId is a real calculator style, siteSlug present", () => {
    for (const s of REC_STYLES) {
        assert.ok(getStyle(s.calcId), `${s.key} calcId ${s.calcId} is a real preset`);
        assert.ok(s.siteSlug && s.siteSlug.length, `${s.key} has a site slug`);
        for (const f of s.feels) assert.ok(FEELS.includes(f), `${s.key} feel ${f} is valid`);
    }
    const priorities = REC_STYLES.map((s) => s.priority);
    assert.equal(new Set(priorities).size, priorities.length, "priorities are unique");
});
