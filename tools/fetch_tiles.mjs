#!/usr/bin/env node
/* =====================================================================
 *  tools/fetch_tiles.mjs — download the REAL terrain + imagery tiles for a
 *  battle's map box, cross-platform (Node 18+, no PowerShell, no API key).
 *
 *    node tools/fetch_tiles.mjs                 # fetch for ../data.js
 *    node tools/fetch_tiles.mjs data.example.js # fetch for another battle file
 *    node tools/fetch_tiles.mjs --dry           # print the tile range + count, download nothing
 *
 *  SINGLE SOURCE OF TRUTH: the bounding box is read from the battle's own
 *  `meta.geo` — the SAME object the engine and the validator read — so the map
 *  the engine renders and the tiles you fetch can never disagree. (The old
 *  hand-duplicated bbox is gone.)
 *
 *  DEM : AWS open Terrarium terrain-RGB  (elev = R*256 + G + B/256 - 32768 m)
 *  IMG : EOX Sentinel-2 cloudless 2016 (CC BY 4.0), {z}/{y}/{x} JPEG
 * ===================================================================== */
import { readFileSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { dirname, resolve, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const dry = args.includes("--dry") || args.includes("--dry-run") || args.includes("--count");
const dataArg = args.find(a => !a.startsWith("--")) || "data.js";

/* ---- read meta.geo from the battle file (one bbox source) ---- */
let geo;
try {
  globalThis.window = {};
  eval(readFileSync(resolve(root, dataArg), "utf8"));
  geo = globalThis.window.BATTLE_DATA && globalThis.window.BATTLE_DATA.meta && globalThis.window.BATTLE_DATA.meta.geo;
} catch (e) {
  console.error(`Could not load ${dataArg}: ${e.message}`);
  process.exit(2);
}
const need = ["minLng", "maxLng", "minLat", "maxLat", "Z"];
if (!geo || need.some(k => typeof geo[k] !== "number" || !isFinite(geo[k]))) {
  console.error(`${dataArg} meta.geo must define finite ${need.join("/")} — run \`node tools/validate.mjs ${dataArg}\` first.`);
  process.exit(2);
}

/* ---- derive the slippy-tile range from the box (standard Web-Mercator) ---- */
const { minLng, maxLng, minLat, maxLat, Z: z } = geo;
const lng2x = (l) => Math.floor((l + 180) / 360 * 2 ** z);
const lat2y = (l) => { const r = l * Math.PI / 180; return Math.floor((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * 2 ** z); };
const x0 = lng2x(minLng), x1 = lng2x(maxLng), y0 = lat2y(maxLat), y1 = lat2y(minLat);   // north = smaller y
const nx = x1 - x0 + 1, ny = y1 - y0 + 1;
console.log(`${dataArg}: zoom ${z}  x ${x0}..${x1} (${nx})  y ${y0}..${y1} (${ny})  => ${nx * ny} tiles/layer, ${nx * ny * 2} total`);
if (dry) process.exit(0);

/* ---- build the job list ---- */
const demDir = resolve(root, "lib/tiles/dem"), imgDir = resolve(root, "lib/tiles/img");
mkdirSync(demDir, { recursive: true });
mkdirSync(imgDir, { recursive: true });
const jobs = [];
for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) {
  jobs.push({ url: `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${x}/${y}.png`, path: join(demDir, `${z}_${x}_${y}.png`) });
  jobs.push({ url: `https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless_3857/default/g/${z}/${y}/${x}.jpg`, path: join(imgDir, `${z}_${x}_${y}.jpg`) });
}

/* ---- download with a concurrency cap + retries ---- */
const LIMIT = 12;
let done = 0, skipped = 0;
const fails = [];
async function fetchOne(job) {
  if (existsSync(job.path)) { skipped++; return; }   // idempotent: never re-download a tile already on disk (so the launcher can always run this cheaply, and a partial fetch self-heals on the next run)
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const res = await fetch(job.url, { signal: AbortSignal.timeout(45000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      writeFileSync(job.path, Buffer.from(await res.arrayBuffer()));
      return;
    } catch (e) {
      if (attempt === 4) fails.push(`${job.url} -> ${e.message}`);
      else await new Promise(r => setTimeout(r, 1500));
    }
  }
}
const queue = [...jobs];
const workers = Array.from({ length: LIMIT }, async () => {
  while (queue.length) { await fetchOne(queue.shift()); process.stdout.write(`\r${++done}/${jobs.length}`); }
});
await Promise.all(workers);
process.stdout.write("\n");
if (fails.length) {
  console.error(`\n${fails.length} tile(s) failed:`);
  fails.slice(0, 20).forEach(f => console.error("  " + f));
  process.exit(1);
}
console.log(`OK — ${skipped} already present, ${jobs.length - skipped} fetched into lib/tiles/ (dem + img).`);
