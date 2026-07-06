# Data dictionary

Every column in [`data/openpizzamap-pizzerias.csv`](../data/openpizzamap-pizzerias.csv). The
GeoJSON file carries the same fields: `lat` and `lng` become the geometry, and the rest
become feature properties.

| Column | Type | Example | Meaning |
|---|---|---|---|
| `name` | string | `PizzArte` | The pizzeria's name. |
| `address` | string | `Webster's Yard, AI` | Street address. May be empty when only a locality is known. |
| `city` | string | `Tirana` | City or town. |
| `region` | string | `Campania` | State, province, or region. May be empty. |
| `postal_code` | string | `2640` | Postal or ZIP code. May be empty. |
| `country` | string | `Albania` | Country. |
| `lat` | number | `41.3289166` | Latitude in decimal degrees (WGS84). |
| `lng` | number | `19.8234297` | Longitude in decimal degrees (WGS84). |
| `styles` | string | `neapolitan` | Pizza style(s) for the place (e.g. neapolitan, contemporanea, roman). |
| `price_level` | integer | `2` | Relative price band, 1 (least expensive) to 4 (most expensive). May be empty when unknown. |
| `dine_in` | boolean | `true` | Whether the place offers dine-in seating. |
| `takeaway` | boolean | `true` | Whether the place offers takeaway. |
| `delivery` | boolean | `false` | Whether the place offers delivery. |
| `reservations` | boolean | `false` | Whether the place accepts reservations. |
| `outdoor_seating` | boolean | `false` | Whether the place has outdoor seating. |
| `opm_rating` | number | `4.49` | The OpenPizzaMap rating on a 0 to 5 scale. This is OpenPizzaMap's own composite score, not a third party's number. See [METHODOLOGY.md](METHODOLOGY.md). |
| `website` | string (URL) | `https://www.pizzartetirana.com/` | The venue's own website. May be empty. |
| `instagram` | string (URL) | `https://instagram.com/pizzarte.tirana` | The venue's Instagram profile. May be empty. |
| `facebook` | string (URL) | `https://www.facebook.com/pizzartetirana/` | The venue's Facebook page. May be empty. |
| `url` | string (URL) | `https://openpizzamap.com/place/1704/pizzarte-tirana` | The pizzeria's page on openpizzamap.com. Use this as the attribution link back to the specific place. |

## What is deliberately not included, and why

The dataset is the curated *result*, published as factual information about public businesses.
Some things are left out on purpose:

- **No aggregator ratings, review text, review counts, photos, or place identifiers.** These
  are third-party *content*: someone else's creative or compiled work (a platform's star
  average, a reviewer's words, a photographer's image, a platform's internal ID). That is not
  ours to redistribute, so it stays out of the open dataset.
- **No data about how the map is compiled.** The dataset is the curated output, not the
  method behind it. How places are chosen and rated is described in prose in
  [METHODOLOGY.md](METHODOLOGY.md); the pipeline itself is not part of this repository.

Address and coordinates **are** included: they are factual information about a public
business, published under CC-BY-4.0. `opm_rating` is OpenPizzaMap's own composite score (see
[METHODOLOGY.md](METHODOLOGY.md)), not a third party's number.
