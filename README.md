# OpenPizzaMap Open Data

A community-curated map of pizzerias worth traveling for, at
[openpizzamap.com](https://openpizzamap.com). This repository is the project's open,
public face: the curated dataset, the documentation, and the place to suggest spots or
report bad data.

Every pizzeria on the map is hand-picked and checked before it appears. This repo publishes
the *result* of that curation as an open dataset, free to reuse under CC-BY-4.0.

## The dataset

[`data/openpizzamap-pizzerias.csv`](data/openpizzamap-pizzerias.csv) and
[`data/openpizzamap-pizzerias.geojson`](data/openpizzamap-pizzerias.geojson): 3607
curated pizzerias with name, address, coordinates, city, region, country, pizza style,
price level, service options, the OpenPizzaMap rating, the venue's own links, and a link to
its page on openpizzamap.com.

See [`docs/DATA-DICTIONARY.md`](docs/DATA-DICTIONARY.md) for every column, and
[`docs/METHODOLOGY.md`](docs/METHODOLOGY.md) for how places are chosen and rated.

## How to use it

Free to use, share, and adapt under CC-BY-4.0. The one requirement is attribution: credit
"OpenPizzaMap (openpizzamap.com)" and, where practical, link back to the site or the
specific pizzeria's page (the `url` column).

## What's here and what isn't

This repo holds the curated dataset, docs, and community submissions. It does not hold the
website's source code, which stays private. The dataset covers factual information about each
pizzeria (including its address and coordinates), but deliberately excludes third-party
content: no aggregator ratings, reviews, review counts, photos, or place identifiers. See the
data dictionary for the full column list and the reasoning.

## Contribute

- Suggest a pizzeria: [openpizzamap.com/add-your-spot](https://openpizzamap.com/add-your-spot)
  or open an issue with the template.
- Report bad data (closed, wrong details, not actually a pizzeria): open an issue.

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

- **Data** (`/data`): CC-BY-4.0. See [LICENSE](LICENSE) and [LICENSE-NOTE.md](LICENSE-NOTE.md).
- Attribution: OpenPizzaMap, https://openpizzamap.com
