// Oven types for the dough calculator. Data only, dependency-free CommonJS so
// it bundles for the browser alongside engine/presets/flours. Each oven carries
// a realistic max temperature; the calculator caps the bake line to it and warns
// when a style needs more heat than the oven can give. Labels are short types
// only (no brands, no examples) and set here, not in i18n, like style/flour
// names. maxTempC/F are ceilings, not targets.
const OVENS = [
    { id: "home", label: "Home oven", maxTempC: 285, maxTempF: 550 },
    { id: "electric", label: "Electric", maxTempC: 450, maxTempF: 850 },
    { id: "gas", label: "Gas", maxTempC: 500, maxTempF: 950 },
    { id: "wood", label: "Wood-fired", maxTempC: 500, maxTempF: 950 },
];

const DEFAULT_OVEN = "home";

function getOven(id) {
    return OVENS.find((o) => o.id === id) || OVENS[0];
}

module.exports = { OVENS, DEFAULT_OVEN, getOven };
