# License note

This repository draws a clear line between data and code.

## What the LICENSE covers

The repository [`LICENSE`](LICENSE) (CC-BY-4.0) covers the **dataset** (the files under
`/data`) and the **documentation** in this repository. You are free to use, share, and adapt
them, provided you give attribution.

Attribution string: **OpenPizzaMap (https://openpizzamap.com)**. Where practical, link back to
the site or to the specific pizzeria's page (the `url` column in the dataset).

## What the LICENSE does not cover

The OpenPizzaMap website source code is **not part of this repository and is not covered** by
this license. It stays private. This repository is the project's open data and documentation,
not its application code.

## Demo or example code

The [`demo/`](demo/) folder ships a small standalone map + directory explorer that loads the
dataset in the browser. That code carries its **own MIT license** at [`demo/LICENSE`](demo/LICENSE),
separate from the CC-BY-4.0 that covers the data and docs. The demo is code (MIT); the data it
reads is CC-BY-4.0. Check the folder's LICENSE before reusing any code.

The demo's pizza marker (`demo/marker-pizza.svg`) is from the Google Noto Emoji project
(Apache-2.0), not MIT. Third-party attributions for the demo are listed in
[`demo/NOTICE.md`](demo/NOTICE.md).
