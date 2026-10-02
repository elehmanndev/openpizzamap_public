# Connect OpenPizzaMap to an AI assistant

Find pizzerias using OpenPizzaMap's live, public restaurant information. Search
by city, landmark, location, pizza style, or budget, then open the restaurant's
page for more.

## Connection

| Setting | Value |
| --- | --- |
| Server URL | `https://openpizzamap.com/mcp` |
| Transport | Streamable HTTP |
| Authentication | None |
| Custom authentication headers | None |
| Access | Read-only public data |

Your MCP client handles protocol headers and initialization. There is no API
key, Google login, or OAuth setup for these public tools. GET may return 405;
use a Streamable HTTP MCP client rather than opening the endpoint as a webpage.

### Claude Code

```bash
claude mcp add --transport http openpizzamap https://openpizzamap.com/mcp
```

Restart or reconnect if your client requires it, then ask:

> Find pizzerias in Barcelona with OPM ratings. Show up to ten options.

### Clients with JSON MCP configuration

Use [the ready-to-use configuration](../mcp/openpizzamap.mcp.json), or add this
server to your existing configuration. Do not overwrite other server entries.
The configuration file location and transport spelling depend on the client.
This example uses the common `http` spelling for Streamable HTTP:

```json
{
  "mcpServers": {
    "openpizzamap": {
      "type": "http",
      "url": "https://openpizzamap.com/mcp"
    }
  }
}
```

If your client only accepts local stdio servers, it cannot use this URL directly;
use that client's documented remote-MCP support or bridge.

### ChatGPT

Where developer mode is available, enable it in Settings, open Plugins, and
add the server URL with no authentication. Select OpenPizzaMap in a new chat.
Menu labels and availability depend on your plan, workspace, and client version.
See [OpenAI's connection guide](https://developers.openai.com/plugins/deploy/connect-chatgpt).

A working development connection does not imply a published directory listing.

## Tools

| Tool | What it does |
| --- | --- |
| `search_pizzerias` | Search by city, name, landmark, or coordinates, with optional country, style, price, and rating filters |
| `get_pizzeria` | Retrieve a published pizzeria by its OpenPizzaMap ID |
| `show_pizzerias` | Display a map and cards for up to ten result IDs, on hosts with MCP Apps support |
| `open_pizza_map` | App-only entrypoint for supported sidebar/panel interfaces; opens the city-search form |

Use `tools/list` to retrieve the authoritative current schemas. Examples of
tool arguments:

```json
{
  "city": "Barcelona",
  "country": "ES",
  "ratedOnly": true,
  "limit": 10
}
```

```json
{
  "near": { "latitude": 41.155, "longitude": 1.107 },
  "radiusKm": 3,
  "maxPriceLevel": 2,
  "limit": 5
}
```

```json
{ "landmark": "Colosseum", "radiusKm": 2, "limit": 5 }
```

```json
{ "id": 602811 }
```

```json
{ "ids": [602811, 602929, 602810] }
```

IDs can become unavailable; use current search results for follow-up calls.

## Results and limits

- City/name searches rank by OPM score descending, then name and ID. Unscored
  places follow scored ones. Use `ratedOnly: true` for quality-focused requests.
- Nearby searches prioritize straight-line distance, with OPM score breaking
  distance ties. The nearby candidate pool is bounded; a truncated response is
  not an exhaustive list of everything in the area.
- `limit` is 1 to 10, default 5. For a broader shortlist, request 10.
- Country takes an uppercase two-letter code such as `ES` or `IT`. City and
  landmark searches currently use English names or canonical slugs.
- Style uses a site slug, such as `neapolitan`, `romana`, `ny`, or `detroit`.
- OPM scores use a **0 to 5 scale**. Missing scores are null. Price levels are
  indicative **1 to 4 bands**, not current menu prices or currency amounts.
- Original third-party review text and individual platform ratings are not
  returned. OPM-written summaries, OPM scores, and visible restaurant photos
  may be included. A missing street address is null.
- No live opening-status guarantee, bookings, payments, personal favorites,
  or verified allergy suitability is provided.
- The service currently limits requests to 120 per minute per rate-limit key.
  Respect HTTP 429 and Retry-After. Limits may change; do not retry in a tight loop.
- Internal links carry `utm_source=mcp` for referral attribution. The source is
  neutral across clients; no conversation or user identifier is in those links.

A missing ID returns a specific tool error. Invalid arguments identify the
field to correct. Unknown tool names return JSON-RPC error `-32602`.

## UI compatibility

**The data tools are portable; interactive UI requires host support.**

The UI is an MCP Apps resource served through `resources/read`, with MIME type
`text/html;profile=mcp-app`. It uses the standard `ui/*` bridge, including host
initialization, tool results, links, display-mode requests and model context.
It does not require `window.openai` for the map or cards.

| Host capability | Experience |
| --- | --- |
| Remote MCP tools only | Structured restaurant data for the assistant; no interactive map required |
| MCP Apps UI | Map and cards, subject to that host's sandbox and supported bridge methods |
| Host display-mode/context support | Expansion and selected-place context controls become available |
| ChatGPT plugin extensions | Global/sidebar and conversation-panel entrypoints where supported |

This is not a guarantee that every client renders the same interface. A Claude
protocol test confirmed the tools and statically inspected the UI; live UI
rendering in Claude was not verified in that test. Local browser simulations
are also not equivalent to acceptance by a host or its public directory.

Generic `ui.domain` is omitted. The OpenAI-specific sandbox hint is carried in
`openai/widgetDomain`; other hosts can ignore that metadata. Runtime CSS and
JavaScript are bundled. Photos load from OpenPizzaMap and map tiles from
OpenStreetMap, with attribution shown. Tile availability is best-effort.

## Privacy and licensing

The endpoint processes structured search arguments to answer your request.
Selecting a place can share its public details and selection context with your
assistant. Map and photo requests contact their respective hosts. Read the
[OpenPizzaMap privacy policy](https://openpizzamap.com/privacy) and your AI
client's privacy terms before using the integration.

The downloadable dataset in this repository is licensed separately under
[CC-BY-4.0](../LICENSE-NOTE.md). That license does not automatically grant rights
to every live MCP field or linked photo. Use the documented open dataset when
you need a reusable bulk dataset; do not treat the MCP as a bulk-download API.

## Hosting, source, and support

The live MCP backend runs with the OpenPizzaMap website. This repository
publishes connection instructions and configuration examples, not the private
website backend or its credentials. No local server installation is needed.
A standalone open-source server implementation is not included here.

Report connection or data issues through this repository's Issues, including
your client/version, tool name, non-sensitive arguments, and observed error.
Do not post API keys, authentication headers, private conversations, or cookies.
