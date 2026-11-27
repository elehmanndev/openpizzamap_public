# Changelog

All notable changes to the OpenPizzaMap open dataset are documented here.

## [2.0.0] - 2026-11-27
### Changed
- **License: data is now ODbL 1.0** (was CC-BY-4.0). Documentation stays CC-BY-4.0, demo code
  MIT. Copies of v1.0.0 keep CC-BY-4.0.
- `opm_rating` is now built only from OpenPizzaMap community reviews. Empty when a place has
  no community review yet.
- `styles` lists every style of a place, comma-separated.
- The dataset is regenerated from the live map every week.
### Added
- Columns: `id` (stable place id), `serves_slices`, `opening_hours`, `phone`,
  `opm_review_count`.
- 5312 pizzerias in 109 countries (was 3607).
### Removed
- Places that closed or were taken off the map since v1.0.0.

## [1.0.0] - 2026-07-05
### Added
- First public release of the curated pizzeria dataset (CSV + GeoJSON), 3607 venues.
- Data dictionary and methodology documentation.
