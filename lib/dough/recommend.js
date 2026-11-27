// Recommender style catalog. Bridges user "feel" preferences to ONE pizza style,
// carrying both slugs it needs downstream: calcId for the dough-calculator preset
// (bake flow) and siteSlug for the city-all style filter (eat-out flow). The two
// taxonomies differ (new-york vs ny, roman-tonda vs romana), so both live here.
// Dependency-free CommonJS so it bundles for the browser.
//
// Feels are the shared vocabulary; each style is tagged with the feels it
// satisfies (many-to-many). Matching is a lexicographic profile match: weighted
// feel overlap first, then bake fit (oven + ferment), then `priority` (lower =
// more recognizable) as the final tiebreak. Styles are limited to those with a
// calculator preset AND real map coverage, so a recommendation never dead-ends
// (grandma/focaccia dropped: no site style).
const FEELS = ["fluffy", "crispy", "saucy", "thin", "thick", "cheesy", "charred"];
const MAX_FEELS = 3;

// Feels are not equal discriminators. crispy/thin/thick pin the crust family and
// charred names a well-done, blistered crust, so an explicit crust pick is never
// overridden by a topping (saucy+thin stays New York, not Detroit). saucy is the
// deep-pan driver, ranked just under the crust feels so saucy+cheesy reads
// Chicago even alongside a lone fluffy. fluffy (airiness, shared by most pies)
// and cheesy (a topping) are the weak, shared signals. A single feel (max 1.3)
// can never outweigh two matches (min 2.0), so any two literal matches still win
// and ties fall to bake fit, then `priority`.
const FEEL_WEIGHT = { crispy: 1.3, thin: 1.3, thick: 1.3, charred: 1.3, saucy: 1.2, fluffy: 1, cheesy: 1 };

// `ovens` and `rises` (both optional) list the bake conditions a style is the
// natural pick for; together they break a feel tie before `priority` (see
// resolveStyle). They split the same-feel sibling groups on the axes the feel
// vocabulary cannot express: the Neapolitan family (a shorter rise on a wood
// oven, or at home, is a classic Neapolitan; a long weekend maturation on a
// modern electric/gas deck is the high-hydration contemporanea), the saucy+thick
// pan family (a hot electric/gas deck is Detroit; a home oven with a long rise is
// Sicilian), and the crispy+thin family (a same-day home/electric bake is a Roman
// tonda; a well-done wood bake is New Haven). Only the bake flow supplies these,
// so eat-out (no oven/rise) always falls through to `priority` and each group's
// most recognizable, highest-coverage default. Retagged pies vs the site style
// taxonomy: New York is thin+cheesy (foldable), the crisp thin pies are Romana
// and New Haven; New Haven and Neapolitan both carry `charred`.
const REC_STYLES = [
    { key: "neapolitan", name: "Neapolitan", feels: ["fluffy", "cheesy", "charred"], calcId: "neapolitan", siteSlug: "neapolitan", priority: 1, ovens: ["wood", "home"], rises: ["tonight", "tomorrow"] },
    { key: "new-york", name: "New York", feels: ["thin", "cheesy"], calcId: "new-york", siteSlug: "ny", priority: 2, ovens: ["gas", "electric"], rises: ["tomorrow", "weekend"] },
    { key: "detroit", name: "Detroit", feels: ["saucy", "thick"], calcId: "detroit", siteSlug: "detroit", priority: 3, ovens: ["electric", "gas"], rises: ["tonight", "tomorrow"] },
    { key: "chicago", name: "Chicago", feels: ["saucy", "thick", "cheesy"], calcId: "chicago-deep-dish", siteSlug: "chicago", priority: 4 },
    { key: "sicilian", name: "Sicilian", feels: ["saucy", "thick"], calcId: "sicilian", siteSlug: "sicilian", priority: 5, ovens: ["home"], rises: ["weekend"] },
    { key: "al-taglio", name: "Roman al taglio", feels: ["fluffy", "thick"], calcId: "roman-al-taglio", siteSlug: "al-taglio", priority: 6 },
    { key: "romana", name: "Roman", feels: ["crispy", "thin"], calcId: "roman-tonda", siteSlug: "romana", priority: 7, ovens: ["home", "electric"], rises: ["tonight"] },
    { key: "new-haven", name: "New Haven", feels: ["crispy", "thin", "charred"], calcId: "new-haven", siteSlug: "new-haven", priority: 8, ovens: ["wood"], rises: ["tomorrow"] },
    { key: "contemporanea", name: "Neapolitan Contemporanea", feels: ["fluffy", "cheesy"], calcId: "contemporanea", siteSlug: "contemporanea", priority: 9, ovens: ["electric", "gas"], rises: ["weekend"] },
];

// Resolve selected feels (any order, capped at MAX_FEELS) to the single best
// style. Scores by weighted feel overlap. Among the styles tied at the top
// score, the bake conditions break the tie: each style scores one hint point per
// matching `oven` and per matching `rise`, and the highest hint score wins (when
// any hint matches at all). `oven` and `rise` are optional; the bake flow
// supplies them, eat-out does not, so with no hints the tie falls straight to the
// lowest `priority` number. No feels (or none recognized) -> Neapolitan, so there
// is always a result.
function resolveStyle(feels, oven, rise) {
    const sel = (feels || []).filter((f) => FEELS.indexOf(f) >= 0).slice(0, MAX_FEELS);
    if (!sel.length) return REC_STYLES[0];
    let bestScore = 0;
    const scored = REC_STYLES.map((s) => {
        const score = s.feels.reduce((sum, f) => sum + (sel.indexOf(f) >= 0 ? (FEEL_WEIGHT[f] || 1) : 0), 0);
        if (score > bestScore) bestScore = score;
        return { s: s, score: score };
    });
    if (bestScore <= 0) return REC_STYLES[0];
    let tied = scored.filter((x) => x.score === bestScore).map((x) => x.s);
    if (tied.length > 1 && (oven || rise)) {
        const hint = (s) => (oven && s.ovens && s.ovens.indexOf(oven) >= 0 ? 1 : 0) +
            (rise && s.rises && s.rises.indexOf(rise) >= 0 ? 1 : 0);
        let bestHint = 0;
        for (let i = 0; i < tied.length; i++) { const h = hint(tied[i]); if (h > bestHint) bestHint = h; }
        if (bestHint > 0) tied = tied.filter((s) => hint(s) === bestHint);
    }
    return tied.reduce((best, s) => (s.priority < best.priority ? s : best));
}

module.exports = { FEELS, MAX_FEELS, REC_STYLES, resolveStyle };
