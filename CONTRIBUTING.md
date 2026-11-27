# Contributing

Two ways to help: suggest spots, or flag bad data.

## Suggest a spot

Easiest: the live form at [openpizzamap.com/add-your-spot](https://openpizzamap.com/add-your-spot). Paste a Google Maps URL, add one sentence on why it's worth eating at. We handle the rest.

If you'd rather use GitHub, open a [Suggest a spot](.github/ISSUE_TEMPLATE/suggest-a-spot.md) issue.

### What we accept

- A real pizzeria (pizza is the menu, not a side item).
- You've eaten there, or you trust the source.
- Address resolvable on Google Maps.
- Independent or a small local group. Not a national/global chain.

### What we reject

- Chains: Domino's, Pizza Hut, Telepizza, Papa John's, similar.
- Tourist traps where the pizza is an afterthought.
- "Italian restaurants" that happen to serve pizza.
- Places without a verifiable address.

The bar is "would someone who actually cares about pizza send a friend here?"

## Report bad data

Wrong address, place closed, duplicate listing, wrong style classification? Open a [Report bad data](.github/ISSUE_TEMPLATE/report-bad-data.md) issue with the place URL or the `id` column from the dataset.

Fixes go to the live map first and reach the dataset in the next weekly build. Please don't open pull requests that edit the files in `/data`: they are regenerated every week, so a hand edit there would be overwritten. An issue is the way in.

## What this repo is not

This is the community-facing repo. Most of the site code lives in a separate private repo. If you spot a bug on the live site, open an issue describing it.

## Code you can change here

[`lib/`](lib/) holds two pieces of the site code, published as they run: the OpenPizzaMap rating formula and the dough calculator engine (MIT). Pull requests are welcome there, for example a fix to the dough math or a new style preset with a source. Run `npm test` first. Merged changes are carried over to the site by hand.
