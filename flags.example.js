/* =====================================================================
 *  flags.example.js: a SKELETON flag file (the companion to data.example.js).
 *  ---------------------------------------------------------------------
 *  COPY this to flags.js and draw your battle's flags. Each flag is pure canvas
 *  art (no image assets). The `flags` registry maps a flag id (the string you put
 *  in data.js `unit.flag` / `faction.defaultFlag`) to a painter (ctx) => void that
 *  draws on a W x H canvas.
 *
 *  The placeholder "blue"/"red" flags below are deliberately ABSTRACT and fictional.
 *  Replace them with YOUR forces' real, PERIOD-CORRECT flags (e.g. a 1941 ensign,
 *  not the modern flag), and NEVER a prohibited symbol. The PRIMITIVES below compose
 *  most real national flags (tricolours, crosses, roundels, stars).
 * ===================================================================== */
import { FAC } from "./config.js";   // only the unknown-flag fallback needs it; the painters are pure (per-battle) art
const W = 230, H = 150;

/* ---- reusable primitives (compose these; add more in the same shape) ---- */
const fill  = (c, color) => { c.fillStyle = color; c.fillRect(0, 0, W, H); };
const bands = (c, colors, vertical) => { const n = colors.length;            // tricolour / bicolour stripes
  for (let i = 0; i < n; i++) { c.fillStyle = colors[i];
    if (vertical) c.fillRect(W * i / n, 0, W / n, H); else c.fillRect(0, H * i / n, W, H / n); } };
const disc  = (c, x, y, r, color) => { c.fillStyle = color; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); };
const star  = (c, x, y, r, n, color) => { c.fillStyle = color; c.beginPath(); // an n-point star
  for (let i = 0; i < n * 2; i++) { const a = Math.PI / n * i - Math.PI / 2, rr = i % 2 ? r * 0.42 : r;
    const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr; i ? c.lineTo(px, py) : c.moveTo(px, py); } c.closePath(); c.fill(); };
const tri   = (c, x, y, r, color) => { c.fillStyle = color; c.beginPath();    // a solid triangle pointing up
  c.moveTo(x, y - r); c.lineTo(x + r * 0.92, y + r * 0.72); c.lineTo(x - r * 0.92, y + r * 0.72); c.closePath(); c.fill(); };
const rhomb = (c, x, y, r, color) => { c.fillStyle = color; c.beginPath();    // a solid diamond (rotated square)
  c.moveTo(x, y - r); c.lineTo(x + r * 0.82, y); c.lineTo(x, y + r); c.lineTo(x - r * 0.82, y); c.closePath(); c.fill(); };

/* ---- placeholder flags (ids referenced from data.example.js). Replace with YOUR forces' real flags.
 *  Composition ideas for real national flags, in the same style:
 *    tricolour: (c)=> bands(c, ["#0055A4","#ffffff","#EF4135"], true)        // vertical bands
 *    crossflag: (c)=>{ fill(c,"#ffffff"); c.fillStyle="#c8102e"; c.fillRect(W/2-13,0,26,H); c.fillRect(0,H/2-13,W,26); } // upright cross
 *    canton:    (c)=>{ fill(c,"#012169"); c.save(); c.beginPath(); c.rect(0,0,W*0.5,H*0.5); c.clip(); star(c,W*0.25,H*0.25,16,5,"#fff"); c.restore(); } */
const flags = {
  // ABSTRACT, fictional placeholders (NOT any real flag). Replace with your real period flags.
  blue: (c) => { fill(c, "#1f4f9e"); tri(c,   W * 0.5, H * 0.54, H * 0.32, "#f1f1ea"); },
  red:  (c) => { fill(c, "#b01e2a"); rhomb(c, W * 0.5, H * 0.50, H * 0.36, "#f1f1ea"); },
};

const cache = {};
export function flagTexture(unit) {
  if (cache[unit.id]) return cache[unit.id];
  const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
  const c = cv.getContext("2d");
  const draw = flags[unit.flag];
  if (!draw) console.warn(`unknown flag "${unit.flag}" for ${unit.id}; falling back by faction`);
  (draw || flags[FAC[unit.faction] && FAC[unit.faction].defaultFlag] || Object.values(flags)[0])(c);   // fall back to the faction's default flag, never a named faction
  // subtle hoist (pole-edge) shadow for depth, then a thin neutral edge so the cloth reads against the terrain
  const sh = c.createLinearGradient(0, 0, W * 0.18, 0);
  sh.addColorStop(0, "rgba(0,0,0,0.26)"); sh.addColorStop(1, "rgba(0,0,0,0)");
  c.fillStyle = sh; c.fillRect(0, 0, W * 0.18, H);
  c.strokeStyle = "rgba(0,0,0,0.45)"; c.lineWidth = 3; c.strokeRect(1.5, 1.5, W - 3, H - 3);
  const tex = new THREE.CanvasTexture(cv); tex.anisotropy = 4; tex.needsUpdate = true;
  cache[unit.id] = tex; return tex;
}
