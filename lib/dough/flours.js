// Curated flour list for the dough calculator. Data only. Caputo is featured at
// the top with friendly labels; the rest are grouped plainly. "not-sure" is the
// default. Attributes drive the hydration/ferment nudge (see engine + spec) and
// a provenance badge (official vs estimated). W: null means no published
// strength rating, so use protein-only logic and never display a fabricated W.
// See docs/DOUGH-MATH.md for sourcing.

const FLOURS = [
    // --- Featured: Caputo ---
    { id: "caputo-pizzeria", label: "Caputo Pizzeria (blue)", technical: "Pizzeria", group: "caputo", type: "00", protein: 12.5, W: 270, hydrationMin: 55, hydrationMax: 65, provenance: "official", note: "The classic. Best for Neapolitan." },
    { id: "caputo-cuoco", label: "Caputo Cuoco (red)", technical: "Cuoco / Chef", group: "caputo", type: "00", protein: 13.0, W: 310, hydrationMin: 60, hydrationMax: 68, provenance: "official", note: "A bit stronger. Good for longer rises." },
    { id: "caputo-nuvola", label: "Caputo Nuvola", technical: "Nuvola", group: "caputo", type: "0", protein: 12.75, W: 285, hydrationMin: 70, hydrationMax: 80, provenance: "official-ish", note: "For a puffy, airy crust." },
    { id: "caputo-manitoba", label: "Caputo Manitoba (Oro)", technical: "Americana / Manitoba Oro", group: "caputo", type: "0 strong", protein: 14.5, W: 380, hydrationMin: 65, hydrationMax: 75, provenance: "official", note: "For very long fridge rises. Often blended into a weaker flour." },

    // --- Other Italian 00 ---
    { id: "5-stagioni-napoletana", label: "Le 5 Stagioni Napoletana", group: "italian", type: "00", protein: 12.5, W: 260, hydrationMin: 58, hydrationMax: 63, provenance: "official-ish", note: "Traditional Neapolitan 00." },
    { id: "dallagiovanna-napoletana", label: "Molino Dallagiovanna La Napoletana", group: "italian", type: "00", protein: 12.5, W: 310, hydrationMin: 60, hydrationMax: 65, provenance: "official-ish", note: "AVPN-certified, long cold ferment." },
    { id: "polselli-classica", label: "Polselli Classica", group: "italian", type: "00", protein: 12.0, W: 270, hydrationMin: 58, hydrationMax: 62, provenance: "official-ish", note: "Same-day Neapolitan." },
    { id: "tipo-1", label: "Tipo 1 (rustic 00)", group: "italian", type: "Tipo 1", protein: 13.0, W: 260, hydrationMin: 62, hydrationMax: 68, provenance: "official", note: "More flavor than plain 00, easy to handle." },

    // --- Strong / bread / high-gluten ---
    { id: "ka-bread", label: "King Arthur bread flour", group: "bread", type: "bread", protein: 12.7, W: null, hydrationMin: 60, hydrationMax: 68, provenance: "protein-official", note: "Great all-round NY style flour." },
    { id: "ka-00", label: "King Arthur 00 pizza flour", group: "bread", type: "00", protein: 11.25, W: null, hydrationMin: 55, hydrationMax: 62, provenance: "protein-official", note: "US-milled 00; weaker than Italian 00, keep the rise shorter." },
    { id: "bobs-bread", label: "Bob's Red Mill artisan bread flour", group: "bread", type: "bread", protein: 13.0, W: null, hydrationMin: 60, hydrationMax: 68, provenance: "protein-official", note: "Widely stocked bread flour." },
    { id: "central-milling-high-mountain", label: "Central Milling High Mountain", group: "bread", type: "high-gluten", protein: 13.5, W: 330, hydrationMin: 62, hydrationMax: 70, provenance: "protein-official", note: "Strong; good for Sicilian and sourdough pizza." },
    { id: "high-gluten", label: "High-gluten flour (All Trumps / Sir Lancelot)", group: "bread", type: "high-gluten", protein: 14.2, W: null, hydrationMin: 58, hydrationMax: 65, provenance: "protein-official", note: "Classic NY-style high-gluten flour." },

    // --- All-purpose ---
    { id: "ka-ap", label: "King Arthur all-purpose", group: "ap", type: "AP", protein: 11.7, W: null, hydrationMin: 55, hydrationMax: 62, provenance: "protein-official", note: "Fine for thin crust and quick dough." },
    { id: "supermarket-ap", label: "Supermarket all-purpose", group: "ap", type: "AP", protein: 10.5, W: null, hydrationMin: 55, hydrationMax: 60, provenance: "estimated", note: "Weakest common flour; keep hydration and rise modest." },

    // --- Specialty ---
    { id: "semolina", label: "Semolina / durum blend", group: "specialty", type: "semolina", protein: 13.0, W: null, hydrationMin: 55, hydrationMax: 62, provenance: "estimated", exception: "durum", note: "Use as 10 to 25% of the flour, not on its own (except Sicilian sfincione)." },
    { id: "whole-wheat", label: "Whole wheat", group: "specialty", type: "whole wheat", protein: 14.0, W: null, hydrationMin: 68, hydrationMax: 78, provenance: "protein-official", exception: "wholewheat", note: "Needs more water than the protein suggests. Best blended with a stronger flour." },

    // --- Generic fallbacks ---
    { id: "generic-00", label: "00 flour (any brand)", group: "generic", type: "00", protein: 12.0, W: 250, hydrationMin: 58, hydrationMax: 63, provenance: "estimated", note: "For 00 flour without a brand name." },
    { id: "generic-bread", label: "Regular bread flour", group: "generic", type: "bread", protein: 12.0, W: null, hydrationMin: 60, hydrationMax: 65, provenance: "estimated", note: "Any standard bread flour." },
    { id: "generic-all-purpose", label: "Regular all-purpose flour", group: "generic", type: "AP", protein: 11.0, W: null, hydrationMin: 55, hydrationMax: 60, provenance: "estimated", note: "Any standard all-purpose flour." },
    { id: "not-sure", label: "Not sure / other", group: "generic", type: "unknown", protein: 12.0, W: null, hydrationMin: 58, hydrationMax: 63, provenance: "estimated", note: "We will use safe middle-of-the-road numbers.", isDefault: true },
];

function getFlour(id) {
    return FLOURS.find((f) => f.id === id) || FLOURS.find((f) => f.isDefault) || null;
}

// Normalize a blend ([{id, pct}]) into [{id, weight}] where weights sum to 1.
// Falls back to a single default flour, and to equal weights if all are zero.
function normalizeBlend(entries) {
    let list = (entries || [])
        .filter((e) => e && e.id)
        .map((e) => ({ id: e.id, pct: Math.max(0, Number(e.pct) || 0) }));
    if (!list.length) list = [{ id: "not-sure", pct: 100 }];
    let sum = list.reduce((a, e) => a + e.pct, 0);
    if (sum <= 0) { list = list.map((e) => ({ id: e.id, pct: 1 })); sum = list.length; }
    return list.map((e) => ({ id: e.id, weight: e.pct / sum }));
}

// Collapse a blend into one synthetic flour for the hydration/ferment nudge:
// protein is the weighted average; W only when every component publishes one.
// A single-entry blend returns that flour unchanged.
function blendFlour(entries) {
    const norm = normalizeBlend(entries);
    if (norm.length === 1) return getFlour(norm[0].id);
    let protein = 0, wSum = 0, allW = true;
    const components = [];
    for (const n of norm) {
        const f = getFlour(n.id);
        protein += (f.protein || 12) * n.weight;
        if (f.W == null) allW = false; else wSum += f.W * n.weight;
        components.push({ flour: f, weight: n.weight });
    }
    return {
        id: "__blend__", label: "Custom blend", type: "blend", provenance: "estimated",
        protein: Math.round(protein * 10) / 10,
        W: allW ? Math.round(wSum) : null,
        components,
    };
}

// Split a total flour weight across a blend, returning grams per component.
function splitFlourGrams(totalGrams, entries) {
    return normalizeBlend(entries).map((n) => {
        const f = getFlour(n.id);
        return { id: n.id, label: f ? f.label : n.id, grams: totalGrams * n.weight };
    });
}

// Classify a flour's strength from W (preferred) or protein (fallback).
function strengthBand(flour) {
    if (!flour) return "medium";
    if (flour.exception === "durum") return "medium"; // protein overstates durum strength
    const W = flour.W;
    if (W != null) {
        if (W < 220) return "weak";
        if (W <= 300) return "medium";
        return "strong";
    }
    const p = flour.protein;
    if (p < 11) return "weak";
    if (p <= 13) return "medium";
    return "strong";
}

// A suggested max hydration for a flour, used to warn (not hard-clamp) the UI.
function suggestedMaxHydration(flour) {
    if (!flour) return 68;
    if (flour.exception === "wholewheat") return 80; // bran wants more water
    // A flour that publishes its own comfortable range is the best signal; the
    // crude W/protein proxy below overshoots it (Caputo Pizzeria W270 -> 77 vs its
    // listed 65 max), so it never warned on strong 00 pushed too wet.
    if (flour.hydrationMax != null) return flour.hydrationMax;
    // Blends (no published range) fall back to the proxy. Never displayed.
    const W = flour.W != null ? flour.W : (flour.protein - 9) * 40;
    return Math.round(Math.min(80, Math.max(58, 50 + W / 10)));
}

module.exports = { FLOURS, getFlour, strengthBand, suggestedMaxHydration, normalizeBlend, blendFlour, splitFlourGrams };
