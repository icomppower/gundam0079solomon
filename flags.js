/* =====================================================================
 *  flags.js: 所羅門攻略戰 faction flags (pure canvas art, no image assets).
 *  ---------------------------------------------------------------------
 *  One Year War (U.C.0079) faction emblems:
 *    - eff  : Earth Federation Forces — gold four-pointed star above
 *             an upturned crescent on Federation blue.
 *    - zeon : Principality of Zeon — the Sigil of Zeon (ringed blade
 *             flanked by upswept wings) on Zeon red.
 *  Both emblems are FICTIONAL insignia. Neither resembles any real-world
 *  prohibited symbol. Colours: Zeon #C8102E + #F2E10E; EFF #2139B1 + #FDD000.
 * ===================================================================== */
import { FAC } from "./config.js";
const W = 230, H = 150;

const fill = (c, color) => { c.fillStyle = color; c.fillRect(0, 0, W, H); };
const disc = (c, x, y, r, color) => { c.fillStyle = color; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); };
const star = (c, x, y, r, n, color) => { c.fillStyle = color; c.beginPath();
  for (let i = 0; i < n * 2; i++) { const a = Math.PI / n * i - Math.PI / 2, rr = i % 2 ? r * 0.40 : r;
    const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr; i ? c.lineTo(px, py) : c.moveTo(px, py); } c.closePath(); c.fill(); };

const flags = {
  eff: (c) => {
    fill(c, "#2139B1");
    const cx = W * 0.5, gold = "#FDD000", blue = "#2139B1";
    disc(c, cx, H * 0.66, H * 0.30, gold);
    disc(c, cx, H * 0.52, H * 0.275, blue);
    star(c, cx, H * 0.45, H * 0.24, 4, gold);
  },
  zeon: (c) => {
    fill(c, "#C8102E");
    const cx = W * 0.5, cy = H * 0.52, R = H * 0.42, gold = "#F2E10E";
    c.fillStyle = gold; c.strokeStyle = gold;
    c.lineWidth = 3.5;
    c.beginPath(); c.arc(cx, cy, R, 0, Math.PI * 2); c.stroke();
    for (const s of [-1, 1]) {
      c.beginPath();
      c.moveTo(cx, cy + R * 0.34);
      c.bezierCurveTo(cx + s * R * 0.34, cy + R * 0.52, cx + s * R * 0.95, cy + R * 0.06, cx + s * R * 0.78, cy - R * 0.66);
      c.bezierCurveTo(cx + s * R * 0.50, cy - R * 0.34, cx + s * R * 0.30, cy - R * 0.04, cx, cy + R * 0.06);
      c.closePath(); c.fill();
    }
    c.beginPath();
    c.moveTo(cx, cy - R * 0.82);
    c.lineTo(cx + R * 0.17, cy - R * 0.04);
    c.lineTo(cx, cy + R * 0.66);
    c.lineTo(cx - R * 0.17, cy - R * 0.04);
    c.closePath(); c.fill();
  },
};

const cache = {};
export function flagTexture(unit) {
  if (cache[unit.id]) return cache[unit.id];
  const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
  const c = cv.getContext("2d");
  const draw = flags[unit.flag];
  if (!draw) console.warn(`unknown flag "${unit.flag}" for ${unit.id}; falling back by faction`);
  (draw || flags[FAC[unit.faction] && FAC[unit.faction].defaultFlag] || Object.values(flags)[0])(c);
  const sh = c.createLinearGradient(0, 0, W * 0.18, 0);
  sh.addColorStop(0, "rgba(0,0,0,0.26)"); sh.addColorStop(1, "rgba(0,0,0,0)");
  c.fillStyle = sh; c.fillRect(0, 0, W * 0.18, H);
  c.strokeStyle = "rgba(0,0,0,0.45)"; c.lineWidth = 3; c.strokeRect(1.5, 1.5, W - 3, H - 3);
  const tex = new THREE.CanvasTexture(cv); tex.anisotropy = 4; tex.needsUpdate = true;
  cache[unit.id] = tex; return tex;
}
