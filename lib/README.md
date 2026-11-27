# Code

Two pieces of the openpizzamap.com code, published as they run on the site. Plain
CommonJS, no dependencies, Node 18 or newer. Tests: `npm test` from the repo root.

## `opm-rating.js`: the OpenPizzaMap rating

`computeOpmRating(place, opmReviews, priorMean)` returns a 0 to 5 score. Each community
review is the average of its four categories (pizza, setting, service, value) and counts
with weight 1.25. On the site, Google, Tripadvisor and Yelp averages also count, each
weighted by its review count capped at 100, so volume alone cannot drown out a smaller
place. Everything is pulled toward a prior of 3.5 by 10 pseudo-reviews, so a place with
one glowing review does not get a perfect score.

The `opm_rating` column in the dataset is this function with `place = null` (community
reviews only) and the default prior. Example:

```js
const { computeOpmRating } = require('./lib/opm-rating');
computeOpmRating(null, [{ pizza: 5, local: 4, servicio: 4, precio: 5 }]); // 3.61
```

The words behind the numbers: [docs/METHODOLOGY.md](../docs/METHODOLOGY.md).

## `dough/`: the dough calculator engine

The engine behind [openpizzamap.com/tools/dough-calculator](https://openpizzamap.com/tools/dough-calculator):
baker's percentages, yeast by time and temperature (Q10 model), yeast type conversion,
water temperature, poolish, biga and sourdough starter, plus the style presets, flour list
and oven types it reads. The same files are bundled for the browser on the site.

| File | Holds |
|---|---|
| `engine.js` | The math. Pure functions. |
| `presets.js` | Pizza style presets (hydration, salt, size, ferment). |
| `flours.js` | Flour list with protein, W and hydration range. |
| `ovens.js` | Oven types and their temperatures. |
| `recommend.js` | Maps "how do you like your pizza" answers to a style. |

How and why: [docs/DOUGH-MATH.md](../docs/DOUGH-MATH.md).

## License

MIT, see [LICENSE](LICENSE). Pull requests that fix the math or add a style preset with a
source are welcome. Merged changes are carried over to the site by hand.
