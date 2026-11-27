# OpenPizzaMap Open Data

The open dataset behind [openpizzamap.com](https://openpizzamap.com), a community map of
pizzerias worth traveling for. We aggregate pizzerias and their public ratings from
different sources, plus suggestions from the community, then add our own layer: which
places are real pizzerias, which pizza style they bake, and the OpenPizzaMap community
rating. This repo publishes that result so anyone can reuse it, check it, and help fix it.

The dataset is rebuilt from the live map every week.

## The dataset

| File | What it holds |
|---|---|
| [`data/openpizzamap-pizzerias.csv`](data/openpizzamap-pizzerias.csv) | One row per pizzeria |
| [`data/openpizzamap-pizzerias.geojson`](data/openpizzamap-pizzerias.geojson) | The same rows as map points |
| [`data/pizza-styles.json`](data/pizza-styles.json) | The pizza styles used in the `styles` column |

Each pizzeria has a stable `id`, name, address, postal code, coordinates, city, region,
country, pizza styles, price level, service options, opening hours, phone, the venue's own
links, the OpenPizzaMap community rating, and its page on openpizzamap.com. See
[`docs/DATA-DICTIONARY.md`](docs/DATA-DICTIONARY.md) for every column and
[`docs/METHODOLOGY.md`](docs/METHODOLOGY.md) for how places get in and how they are rated.

## License

The data is licensed under the [Open Database License (ODbL) 1.0](LICENSE), the same
license OpenStreetMap uses. You can use, share and adapt it, including commercially, as long
as you credit **OpenPizzaMap (https://openpizzamap.com)** and share any adapted database
under the ODbL. Documentation is CC-BY-4.0, the demo code is MIT. See
[LICENSE-NOTE.md](LICENSE-NOTE.md).

## Help fix it

- **Something wrong?** Closed, moved, duplicate, wrong style, not a pizzeria: open a
  [Report bad data](https://github.com/elehmanndev/openpizzamap_public/issues/new?template=report-bad-data.md)
  issue with the place URL or its `id`.
- **Missing a pizzeria?** Use [openpizzamap.com/add-your-spot](https://openpizzamap.com/add-your-spot)
  or open a [Suggest a spot](https://github.com/elehmanndev/openpizzamap_public/issues/new?template=suggest-a-spot.md) issue.

Every fix goes through OpenPizzaMap: it lands on the live map first and reaches this
dataset in the next weekly build.
See [CONTRIBUTING.md](CONTRIBUTING.md).

## Demo

[`demo/`](demo/) is a static map and filterable directory that reads the dataset straight
from this repo. No backend, no build step.

## Credits

Map tiles on the site and the demo: map data © OpenStreetMap contributors (ODbL), tiles ©
CARTO. The site's source code is not part of this repository.
