'use strict';

// OpenPizzaMap Open Dataset Explorer — vanilla JS, no build step.
// Reads the same published files the rest of the world downloads.
// Clustered pizza-pin map (Leaflet + Leaflet.markercluster), styled to match
// the production openpizzamap.com map. Shows ONLY open-dataset fields.

const GEOJSON_URL = '../data/openpizzamap-pizzerias.geojson';
const STYLES_URL = '../data/pizza-styles.json';

const els = {
  country: document.getElementById('filter-country'),
  city: document.getElementById('filter-city'),
  style: document.getElementById('filter-style'),
  results: document.getElementById('results'),
  count: document.getElementById('result-count'),
};

let features = [];       // all geojson features
let styleNames = {};     // slug -> display name
const entries = new Map(); // feature index -> { marker, ll }

const map = L.map('map', { scrollWheelZoom: true }).setView([44, 11], 4);

// CARTO Voyager basemap — matches prod look.
L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
  subdomains: 'abcd',
  maxZoom: 20,
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors ' +
    '&copy; <a href="https://carto.com/attributions">CARTO</a>',
}).addTo(map);

// Zoom-scaled pizza-emoji divIcon (ported from prod map.js). Marker asset is
// referenced RELATIVELY here (demo is static, not served under /public/img/).
function pizzaIconForZoom(zoom) {
  const minZoom = 3, maxZoom = 18, minSize = 30, maxSize = 46;
  const t = Math.max(0, Math.min(1, (zoom - minZoom) / (maxZoom - minZoom)));
  const size = Math.round(minSize + (maxSize - minSize) * t);
  return L.divIcon({
    className: 'pizza-pin',
    html: `<div class="pizza-pin-inner" style="width:${size}px;height:${size}px"><img src="marker-pizza.svg" alt="" width="${size}" height="${size}" draggable="false"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size],
  });
}

// Cluster group (ported config + iconCreateFunction from prod).
const cluster = L.markerClusterGroup({
  showCoverageOnHover: false,
  spiderfyOnMaxZoom: true,
  maxClusterRadius: 50,
  animate: false,
  iconCreateFunction(c) {
    const n = c.getChildCount();
    const size = n < 10 ? 34 : n < 100 ? 40 : 48;
    const fontSize = n < 10 ? 13 : n < 100 ? 13 : 15;
    return L.divIcon({
      className: 'pizza-cluster',
      html: `<div class="pizza-cluster-inner" style="width:${size}px;height:${size}px;font-size:${fontSize}px"><span>${n < 1000 ? n : '1k+'}</span></div>`,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    });
  },
}).addTo(map);

// Rescale visible pins on zoom, like prod's rescaleMarkers.
map.on('zoomend', () => {
  const z = map.getZoom();
  for (const e of entries.values()) e.marker.setIcon(pizzaIconForZoom(z));
});

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// styles property is a comma-joined slug string (may be empty/null).
function featureStyles(f) {
  const raw = f.properties.styles;
  if (!raw) return [];
  return String(raw).split(',').map((s) => s.trim()).filter(Boolean);
}

function styleLabel(slug) {
  return styleNames[slug] || slug;
}

// price_level -> € repeated (open-dataset field).
function priceLabel(n) {
  const lvl = Number(n) || 0;
  return lvl > 0 ? '€'.repeat(Math.min(4, lvl)) : '—';
}

// Popup: OPEN-DATASET FIELDS ONLY. No third-party ratings, no external review
// counts, no hero photos — none of those are in the published dataset.
function popupHtml(f) {
  const p = f.properties;
  const chips = featureStyles(f)
    .map((s) => `<span class="pp-chip">${esc(styleLabel(s))}</span>`)
    .join('');
  const place = esc([p.city, p.country].filter(Boolean).join(', '));
  const rating = p.opm_rating != null && p.opm_rating !== '' ? esc(p.opm_rating) : '—';
  const link = p.url
    ? `<a class="pp-link" href="${esc(p.url)}" target="_blank" rel="noopener">View on OpenPizzaMap</a>`
    : '';
  return `<strong class="pp-name">${esc(p.name)}</strong>
    ${p.address ? `<div class="pp-meta">${esc(p.address)}</div>` : ''}
    ${place ? `<div class="pp-meta">${place}</div>` : ''}
    ${chips ? `<div class="pp-chips">${chips}</div>` : ''}
    <div class="pp-meta">Price: ${priceLabel(p.price_level)} &middot; OPM rating: ${rating}</div>
    ${link}`;
}

// GeoJSON coordinates are [lng, lat]; Leaflet wants [lat, lng]. Convert here.
function latLng(f) {
  const c = f.geometry && f.geometry.coordinates;
  if (!c || c.length < 2) return null;
  return [c[1], c[0]];
}

function optionList(select, values) {
  const frag = document.createDocumentFragment();
  for (const v of values) {
    const o = document.createElement('option');
    o.value = v;
    o.textContent = v;
    frag.appendChild(o);
  }
  select.appendChild(frag);
}

function buildFilters() {
  const countries = [...new Set(features.map((f) => f.properties.country).filter(Boolean))].sort();
  const cities = [...new Set(features.map((f) => f.properties.city).filter(Boolean))].sort();
  optionList(els.country, countries);
  optionList(els.city, cities);

  const slugsInData = new Set();
  features.forEach((f) => featureStyles(f).forEach((s) => slugsInData.add(s)));
  const styleOpts = [...slugsInData].sort().map((slug) => ({ slug, name: styleLabel(slug) }));
  const frag = document.createDocumentFragment();
  for (const s of styleOpts) {
    const o = document.createElement('option');
    o.value = s.slug;
    o.textContent = s.name;
    frag.appendChild(o);
  }
  els.style.appendChild(frag);
}

function matches(f) {
  const c = els.country.value;
  const city = els.city.value;
  const style = els.style.value;
  if (c && f.properties.country !== c) return false;
  if (city && f.properties.city !== city) return false;
  if (style && !featureStyles(f).includes(style)) return false;
  return true;
}

// Rebuild the cluster's marker set + the synced list from the current filters.
function render() {
  const z = map.getZoom();
  els.results.innerHTML = '';
  const listFrag = document.createDocumentFragment();
  const nextMarkers = [];
  let shown = 0;

  features.forEach((f, i) => {
    if (!matches(f)) return;
    let e = entries.get(i);
    if (!e) {
      const ll = latLng(f);
      if (!ll) return;
      const marker = L.marker(ll, { icon: pizzaIconForZoom(z) }).bindPopup(popupHtml(f));
      e = { marker, ll };
      entries.set(i, e);
    }
    shown++;
    nextMarkers.push(e.marker);

    const p = f.properties;
    const styles = featureStyles(f).map(styleLabel).join(', ') || '—';
    const li = document.createElement('li');
    li.className = 'result';
    li.innerHTML = `<button type="button" class="result-name">${esc(p.name)}</button>
      <span class="result-place">${esc([p.city, p.country].filter(Boolean).join(', '))}</span>
      <span class="result-meta">${esc(styles)} &middot; ${priceLabel(p.price_level)}</span>`;
    li.querySelector('.result-name').addEventListener('click', () => {
      map.setView(e.ll, 15);
      e.marker.openPopup();
    });
    listFrag.appendChild(li);
  });

  // Re-cluster: swap the whole marker set in one shot.
  cluster.clearLayers();
  cluster.addLayers(nextMarkers);

  els.results.appendChild(listFrag);
  els.count.textContent = `${shown.toLocaleString()} of ${features.length.toLocaleString()} pizzerias`;
}

async function init() {
  try {
    const [geo, styles] = await Promise.all([
      fetch(GEOJSON_URL).then((r) => r.json()),
      fetch(STYLES_URL).then((r) => r.json()),
    ]);
    styleNames = Object.fromEntries(styles.map((s) => [s.slug, s.name]));
    features = geo.features || [];
    buildFilters();
    render();
    [els.country, els.city, els.style].forEach((s) => s.addEventListener('change', render));
  } catch (e) {
    els.count.textContent = 'Could not load the dataset. Serve this folder over HTTP and try again.';
    console.error(e);
  }
}

init();
