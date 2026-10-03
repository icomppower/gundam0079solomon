// 所羅門攻略戰 · Battle of Solomon · U.C. 0079 — v2 bridge rebuild.
// You stand on the bridge of an original Federation cruiser; the battle happens outside the window.
// Two scenes: `space` (metres, Solomon at the origin) and `bridge` (the interior, metres, around the viewer).
// Every act is a pure function of act time τ, so play / pause / scrub all render the same frame.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ACTS, TRANSITION, SUN_DIR, MIRROR_CENTER, MIRROR_RADIUS, DUEL_CENTER, COMPANIONS, SHIP_NAME, ESCORT_SLOTS, ESCORT_LOST, RAIDS } from './acts.js';

/* ================================================================ utils == */
const V = (a) => new THREE.Vector3(a[0], a[1], a[2]);
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0)); return t * t * (3 - 2 * t); };
const ease = (t) => { t = clamp(t); return t * t * t * (t * (t * 6 - 15) + 10); };
const bump = (a, b, c, d, x) => smooth(a, b, x) * (1 - smooth(c, d, x));
function hash(n) { n = Math.sin(n * 127.1 + 311.7) * 43758.5453; return n - Math.floor(n); }
function rngFrom(seed) { let s = seed >>> 0 || 1; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const tmpV = new THREE.Vector3(), tmpV2 = new THREE.Vector3(), tmpQ = new THREE.Quaternion(), tmpM = new THREE.Matrix4(), tmpC = new THREE.Color();
const fract = (x) => x - Math.floor(x);
const ORIGIN = new THREE.Vector3();
const SUN = V(SUN_DIR).normalize();
const MC = V(MIRROR_CENTER);
const HIT_DIR = MC.clone().normalize();          // where the Solar System lands on the fortress
const HIT = HIT_DIR.clone().multiplyScalar(1080);
const DUEL = V(DUEL_CENTER);

/* ============================================================= timeline == */
const DURS = ACTS.map((a) => a.hold + TRANSITION);
const CUM = DURS.reduce((acc, d, i) => (acc.push(i ? acc[i - 1] + DURS[i - 1] : 0), acc), []);
const TOTAL = CUM[CUM.length - 1] + DURS[DURS.length - 1];
const params = new URLSearchParams(location.search);

/* ============================================================== renderer == */
const canvas = document.getElementById('view');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
const isSmall = Math.min(innerWidth, innerHeight) < 700;
renderer.setPixelRatio(Math.min(devicePixelRatio, isSmall ? 1.25 : 1.5));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const space = new THREE.Scene();
const bridge = new THREE.Scene();
const spaceCam = new THREE.PerspectiveCamera(55, 1, 2, 2.4e6);
const bridgeCam = new THREE.PerspectiveCamera(55, 1, 0.03, 60);
const EYE = new THREE.Vector3(0, 2.07, 1.75);
bridgeCam.position.copy(EYE);

const composer = new EffectComposer(renderer);
const passSpace = new RenderPass(space, spaceCam);
const passBridge = new RenderPass(bridge, bridgeCam); passBridge.clear = false; passBridge.clearDepth = true;
const bloom = new UnrealBloomPass(new THREE.Vector2(512, 512), 0.9, 0.55, 0.8);
composer.addPass(passSpace); composer.addPass(passBridge); composer.addPass(bloom); composer.addPass(new OutputPass());

function resize() {
  const w = innerWidth, h = innerHeight, aspect = w / h;
  renderer.setSize(w, h, false); composer.setSize(w, h);
  bloom.resolution.set(w * (isSmall ? 0.5 : 0.75), h * (isSmall ? 0.5 : 0.75));
  // keep at least ~74° of horizontal view so the window reads on portrait phones
  const vfov = Math.max(52, THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(74) / 2) / aspect)));
  for (const c of [spaceCam, bridgeCam]) { c.aspect = aspect; c.fov = Math.min(vfov, 92); c.updateProjectionMatrix(); }
  pointsMat.uniforms.uPR.value = beaconMat.uniforms.uPR.value = starMat.uniforms.uPR.value = renderer.getPixelRatio();
}

/* ============================================================ textures == */
function glowTexture(stops) {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  for (const [o, col] of stops) gr.addColorStop(o, col);
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const GLOW = glowTexture([[0, 'rgba(255,255,255,1)'], [0.18, 'rgba(255,255,255,0.75)'], [0.45, 'rgba(255,255,255,0.18)'], [1, 'rgba(255,255,255,0)']]);
const SOFT = glowTexture([[0, 'rgba(255,255,255,0.55)'], [0.5, 'rgba(255,255,255,0.12)'], [1, 'rgba(255,255,255,0)']]);

// procedural Earth / Moon (3D value-noise fbm on the sphere, so no seam)
function makeNoise3(seed) {
  const r = rngFrom(seed), P = new Uint8Array(512), p = [...Array(256).keys()];
  for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; }
  for (let i = 0; i < 512; i++) P[i] = p[i & 255];
  const val = new Float32Array(256).map(() => r());
  const f = (t) => t * t * (3 - 2 * t);
  return (x, y, z) => {
    const X = Math.floor(x), Y = Math.floor(y), Z = Math.floor(z), u = f(x - X), v = f(y - Y), w = f(z - Z);
    const h = (i, j, k) => val[P[P[P[(X + i) & 255] + ((Y + j) & 255)] + ((Z + k) & 255)]];
    const l = (a, b, t) => a + (b - a) * t;
    return l(l(l(h(0, 0, 0), h(1, 0, 0), u), l(h(0, 1, 0), h(1, 1, 0), u), v), l(l(h(0, 0, 1), h(1, 0, 1), u), l(h(0, 1, 1), h(1, 1, 1), u), v), w);
  };
}
function sphereTexture(W, H, fn) {
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d'), img = g.createImageData(W, H), d = img.data;
  for (let y = 0; y < H; y++) {
    const lat = (0.5 - (y + 0.5) / H) * Math.PI, cl = Math.cos(lat), sl = Math.sin(lat);
    for (let x = 0; x < W; x++) {
      const lon = ((x + 0.5) / W) * Math.PI * 2;
      const [r, gg, b, a] = fn(cl * Math.cos(lon), sl, cl * Math.sin(lon), lat);
      const i = (y * W + x) * 4; d[i] = r; d[i + 1] = gg; d[i + 2] = b; d[i + 3] = a;
    }
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
function fbm(n, x, y, z, oct) { let s = 0, a = 0.5, f = 1; for (let i = 0; i < oct; i++) { s += a * n(x * f, y * f, z * f); f *= 2.03; a *= 0.5; } return s; }

/* ================================================================ space == */
const sunLight = new THREE.DirectionalLight(0xfff1df, 2.6); sunLight.position.copy(SUN).multiplyScalar(1e5); space.add(sunLight);
space.add(new THREE.AmbientLight(0x1b2436, 0.55));

// stars: a shell that follows the camera
const starMat = new THREE.ShaderMaterial({
  uniforms: { uPR: { value: 1 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  vertexShader: `attribute float size; attribute vec3 color; varying vec3 vC; uniform float uPR;
    void main(){ vC=color; vec4 mv=modelViewMatrix*vec4(position,1.); gl_Position=projectionMatrix*mv; gl_PointSize=size*uPR; }`,
  fragmentShader: `varying vec3 vC; void main(){ float d=length(gl_PointCoord-.5); if(d>.5) discard; gl_FragColor=vec4(vC*smoothstep(.5,.0,d),1.); }`,
});
const stars = (() => {
  const N = 7000, r = rngFrom(4), pos = new Float32Array(N * 3), col = new Float32Array(N * 3), size = new Float32Array(N);
  const band = new THREE.Vector3(0.2, 0.9, -0.35).normalize();
  for (let i = 0; i < N; i++) {
    let v = new THREE.Vector3(r() * 2 - 1, r() * 2 - 1, r() * 2 - 1).normalize();
    if (i < N * 0.45) { v.addScaledVector(band, -v.dot(band) * (0.85 + r() * 0.15)).normalize(); } // milky band
    v.multiplyScalar(1.6e6); pos.set([v.x, v.y, v.z], i * 3);
    const m = Math.pow(r(), 6), t = r();
    const c = t < 0.15 ? [1, 0.8, 0.65] : t < 0.4 ? [0.75, 0.85, 1] : [1, 1, 1];
    const k = (i < N * 0.45 ? 0.2 : 0.3) + m * 0.55;
    col.set(c.map((x) => x * k), i * 3); size[i] = 1.1 + m * 2.4;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setAttribute('size', new THREE.BufferAttribute(size, 1));
  const p = new THREE.Points(g, starMat); p.frustumCulled = false; p.renderOrder = -10; space.add(p); return p;
})();

// sun disc + halo (far away, so the fortress occludes it naturally)
const sunGroup = new THREE.Group(); space.add(sunGroup);
for (const [s, o, tex] of [[0.03, 1.0, GLOW], [0.16, 0.22, SOFT]]) {
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: new THREE.Color(1, 0.95, 0.85).multiplyScalar(4), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: o, toneMapped: false }));
  sp.scale.setScalar(1.5e6 * s * 2); sp.position.copy(SUN).multiplyScalar(1.5e6); sunGroup.add(sp);
}

// Earth & Moon — the orientation anchors behind Solomon
const EARTH_POS = new THREE.Vector3(-0.58, -0.17, -1).normalize().multiplyScalar(7.0e5);
const MOON_POS = new THREE.Vector3(-0.92, 0.1, -1).normalize().multiplyScalar(6.4e5);
let earth;
function buildPlanets() {
  const n = makeNoise3(79), n2 = makeNoise3(80);
  const tex = sphereTexture(768, 384, (x, y, z, lat) => {
    const h = fbm(n, x * 1.6 + 3, y * 1.6, z * 1.6, 5);
    const ice = Math.abs(lat) > 1.2 + (h - 0.5) * 0.4;
    if (ice) return [225, 230, 236, 255];
    if (h > 0.53) { const k = (h - 0.53) * 4; return [52 + k * 90, 70 + k * 40, 34 + k * 30, 255]; }
    const k = h / 0.53; return [8 + k * 14, 26 + k * 34, 62 + k * 44, 255];
  });
  const cloudTex = sphereTexture(768, 384, (x, y, z) => {
    const c = fbm(n2, x * 2.4, y * 3.8, z * 2.4, 5); const a = smooth(0.52, 0.72, c) * 230; return [255, 255, 255, a];
  });
  const R = 17000;
  earth = new THREE.Group(); earth.position.copy(EARTH_POS); space.add(earth);
  earth.add(new THREE.Mesh(new THREE.SphereGeometry(R, 96, 64), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.75, metalness: 0 })));
  earth.add(new THREE.Mesh(new THREE.SphereGeometry(R * 1.008, 96, 64), new THREE.MeshStandardMaterial({ map: cloudTex, transparent: true, roughness: 1, depthWrite: false })));
  const atm = new THREE.Mesh(new THREE.SphereGeometry(R * 1.06, 64, 48), new THREE.ShaderMaterial({
    uniforms: { uSun: { value: SUN } }, side: THREE.BackSide, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
    vertexShader: `varying vec3 vN; varying vec3 vW; void main(){ vN=normalize(mat3(modelMatrix)*normal); vW=(modelMatrix*vec4(position,1.)).xyz; gl_Position=projectionMatrix*viewMatrix*vec4(vW,1.); }`,
    fragmentShader: `uniform vec3 uSun; varying vec3 vN; varying vec3 vW; void main(){ vec3 v=normalize(cameraPosition-vW); float rim=pow(1.-abs(dot(v,vN)),3.); float lit=smoothstep(-.3,.4,dot(vN,uSun)); gl_FragColor=vec4(vec3(.35,.6,1.)*rim*lit*1.6,1.); }`,
  }));
  earth.add(atm);
  const moonTex = sphereTexture(256, 128, (x, y, z) => { const h = fbm(n, x * 3 + 9, y * 3, z * 3, 5); const k = 120 + (h - 0.5) * 140; return [k, k, k * 0.97, 255]; });
  const moon = new THREE.Mesh(new THREE.SphereGeometry(4800, 48, 32), new THREE.MeshStandardMaterial({ map: moonTex, roughness: 1 }));
  moon.position.copy(MOON_POS); space.add(moon);
}

/* ======================================================== fortress etc == */
const heatU = { uHeat: { value: 0 }, uHitDir: { value: HIT_DIR }, uTime: { value: 0 } };
const fortMat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.93, metalness: 0.04 });
fortMat.onBeforeCompile = (sh) => {
  Object.assign(sh.uniforms, heatU);
  sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vObjP;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvObjP = position;');
  sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vObjP; uniform float uHeat; uniform vec3 uHitDir; uniform float uTime;')
    .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      { float k = smoothstep(0.58, 0.97, dot(normalize(vObjP), uHitDir));
        vec3 q = vObjP / 70.0; vec3 i = floor(q); vec3 f = fract(q); f = f * f * (3.0 - 2.0 * f);
        #define H3(o) fract(sin(dot(i + o, vec3(12.9898, 78.233, 37.719))) * 43758.5453)
        float n = mix(mix(mix(H3(vec3(0,0,0)), H3(vec3(1,0,0)), f.x), mix(H3(vec3(0,1,0)), H3(vec3(1,1,0)), f.x), f.y),
                      mix(mix(H3(vec3(0,0,1)), H3(vec3(1,0,1)), f.x), mix(H3(vec3(0,1,1)), H3(vec3(1,1,1)), f.x), f.y), f.z);
        float fl = 0.82 + 0.18 * sin(uTime * 2.1 + n * 5.0);
        float core = smoothstep(0.86, 0.99, dot(normalize(vObjP), uHitDir));
        vec3 hot = mix(vec3(1.0, 0.22, 0.04), vec3(1.0, 0.78, 0.45), core);
        totalEmissiveRadiance += uHeat * k * hot * (0.25 + 1.4 * n * n + 2.5 * core) * fl * 2.2; }`);
};
const fortress = new THREE.Group(); space.add(fortress);

// surface beacons — amber under Zeon, blue-white once captured (uSwap sweeps across)
const beaconMat = new THREE.ShaderMaterial({
  uniforms: { uPR: { value: 1 }, uTime: { value: 0 }, uSwap: { value: 0 }, uDim: { value: 1 } },
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  vertexShader: `attribute float aPh; attribute float aAz; varying vec3 vC; uniform float uPR, uTime, uSwap, uDim;
    void main(){ float on = .55 + .45 * step(fract(uTime * .55 + aPh), .55);
      float sw = step(aAz, uSwap * 1.02);
      vC = mix(vec3(1., .62, .2), vec3(.55, .82, 1.), sw) * on * uDim * 1.6;
      vec4 mv = modelViewMatrix * vec4(position, 1.); gl_Position = projectionMatrix * mv; gl_PointSize = (2.2 + 1.6 * sw) * uPR; }`,
  fragmentShader: `varying vec3 vC; void main(){ float d=length(gl_PointCoord-.5); if(d>.5) discard; gl_FragColor=vec4(vC*smoothstep(.5,.0,d),1.); }`,
});

/* ========================================================= immediate fx == */
// Pools that are refilled every frame by the act directors.
const pointsMat = new THREE.ShaderMaterial({
  uniforms: { uPR: { value: 1 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  vertexShader: `attribute float size; attribute vec3 color; varying vec3 vC; uniform float uPR;
    void main(){ vC=color; vec4 mv=modelViewMatrix*vec4(position,1.); gl_Position=projectionMatrix*mv; gl_PointSize=size*uPR; }`,
  fragmentShader: `varying vec3 vC; void main(){ float d=length(gl_PointCoord-.5); if(d>.5) discard; gl_FragColor=vec4(vC*smoothstep(.5,.05,d),1.); }`,
});
class PointPool {
  constructor(n) {
    this.n = n; this.i = 0;
    this.pos = new Float32Array(n * 3); this.col = new Float32Array(n * 3); this.size = new Float32Array(n);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('color', new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('size', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    this.obj = new THREE.Points(g, pointsMat); this.obj.frustumCulled = false; space.add(this.obj);
  }
  add(p, c, s, a = 1) { if (this.i >= this.n) return; const k = this.i++; this.pos[k * 3] = p.x; this.pos[k * 3 + 1] = p.y; this.pos[k * 3 + 2] = p.z; this.col[k * 3] = c.r * a; this.col[k * 3 + 1] = c.g * a; this.col[k * 3 + 2] = c.b * a; this.size[k] = s; }
  flush() { const g = this.obj.geometry; g.setDrawRange(0, this.i); for (const k of ['position', 'color', 'size']) g.attributes[k].needsUpdate = true; this.i = 0; }
}
class LinePool {
  constructor(n) {
    this.n = n; this.i = 0; this.pos = new Float32Array(n * 6); this.col = new Float32Array(n * 6);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('color', new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage));
    this.obj = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    this.obj.frustumCulled = false; space.add(this.obj);
  }
  add(a, b, c, alpha = 1, tail = 0.15) {
    if (this.i >= this.n) return; const k = this.i++ * 6;
    this.pos[k] = a.x; this.pos[k + 1] = a.y; this.pos[k + 2] = a.z; this.pos[k + 3] = b.x; this.pos[k + 4] = b.y; this.pos[k + 5] = b.z;
    this.col[k] = c.r * alpha * tail; this.col[k + 1] = c.g * alpha * tail; this.col[k + 2] = c.b * alpha * tail;
    this.col[k + 3] = c.r * alpha; this.col[k + 4] = c.g * alpha; this.col[k + 5] = c.b * alpha;
  }
  flush() { const g = this.obj.geometry; g.setDrawRange(0, this.i * 2); g.attributes.position.needsUpdate = g.attributes.color.needsUpdate = true; this.i = 0; }
}
class SpritePool {
  constructor(n, tex = GLOW) {
    this.list = []; this.i = 0;
    for (let k = 0; k < n; k++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, toneMapped: false }));
      s.visible = false; space.add(s); this.list.push(s);
    }
  }
  add(p, size, c, a = 1) { if (this.i >= this.list.length) return; const s = this.list[this.i++]; s.visible = true; s.position.copy(p); s.scale.setScalar(size); s.material.color.copy(c).multiplyScalar(a); }
  flush() { for (let k = this.i; k < this.list.length; k++) this.list[k].visible = false; this.i = 0; }
}
const PTS = new PointPool(3000), LINES = new LinePool(5000), FLASH = new SpritePool(520), SMOKE = new SpritePool(60, SOFT);
const C = {
  zeon: new THREE.Color(1.6, 0.42, 0.62), zeonBeam: new THREE.Color(2.2, 0.55, 0.9), eff: new THREE.Color(1.5, 1.45, 1.2),
  effBeam: new THREE.Color(2.4, 2.0, 0.9), engine: new THREE.Color(0.55, 0.8, 1.6), zengine: new THREE.Color(1.6, 0.5, 0.75),
  fire: new THREE.Color(2.2, 0.8, 0.25), white: new THREE.Color(3, 3, 2.8), amber: new THREE.Color(2.0, 1.1, 0.35),
};

// ships: pooled clones per hull type
const SHIPS = { types: {}, used: {} };
function shipPoolInit(gltf) {
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.6, metalness: 0.35 });
  for (const name of ['eff_cruiser', 'eff_battleship', 'zeon_cruiser', 'zeon_armor', 'eff_ms', 'zeon_ms']) {
    const src = gltf.scene.getObjectByName(name);
    src.geometry.computeBoundingBox();
    SHIPS.types[name] = { geo: src.geometry, list: [], mat, len: src.geometry.boundingBox.max.z - src.geometry.boundingBox.min.z };
    SHIPS.used[name] = 0;
  }
}
function ship(type, pos, target, opts = {}) {
  const T = SHIPS.types[type]; if (!T) return;
  let m = T.list[SHIPS.used[type]];
  if (!m) { m = new THREE.Mesh(T.geo, T.mat); space.add(m); T.list.push(m); }
  SHIPS.used[type]++;
  m.visible = true; m.position.copy(pos); m.lookAt(target);
  if (opts.roll) m.rotateZ(opts.roll);
  if (opts.scale) m.scale.setScalar(opts.scale); else m.scale.setScalar(1);
  const ms = type.endsWith('_ms');
  if (ms && opts.engine !== false) {          // backpack thrusters
    const k = opts.boost ?? 1;
    const sc = opts.scale || 1;
    for (const sx of [-0.9, 0.9]) { tmpV.set(sx * sc, 3.3 * sc, -3.6 * sc).applyQuaternion(m.quaternion).add(pos); FLASH.add(tmpV, (6 + 6 * k) * sc, type === "eff_ms" ? C.engine : C.zengine, 0.4 + 0.3 * k); }
  } else if (opts.engine !== false && type !== 'zeon_armor') {
    const eff = type.startsWith('eff'), big = type === 'eff_battleship';
    tmpV.set(0, 0, -T.len * 0.52).applyQuaternion(m.quaternion).add(pos);
    FLASH.add(tmpV, eff ? (big ? 46 : 30) : 28, eff ? C.engine : C.zengine, 0.75);
    if (eff) for (const s of [-1, 1]) { tmpV2.set((big ? 36 : 24) * s, 0, -T.len * 0.5).applyQuaternion(m.quaternion).add(pos); FLASH.add(tmpV2, big ? 30 : 20, C.engine, 0.6); }
  }
  return m;
}
/* ============================================================ hero ship == */
// 蒼鷺號 Grey Heron — our own cruiser. Hidden in bridge view (we are inside it), the anchor of the chase view.
const hero = new THREE.Group(); hero.visible = false; space.add(hero);
let heroMeta = null;
const heroHullMat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.5, metalness: 0.4, emissive: 0x000000 });
const heroWinMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 1.7, 0.9), toneMapped: false });
const heroEngMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.45, 0.75, 1.25), toneMapped: false });
const heroLightMat = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false });
const heroGuns = [], heroEngines = [];
function placeHero(P) {
  hero.position.copy(P); hero.lookAt(ORIGIN); hero.updateMatrixWorld();
  heroGuns.length = 0; heroEngines.length = 0;
  if (heroMeta) { for (const g of heroMeta.gunTips) heroGuns.push(V(g).applyMatrix4(hero.matrixWorld)); for (const e of heroMeta.engines) heroEngines.push(V(e).applyMatrix4(hero.matrixWorld)); }
}
const ourGuns = (P) => (heroGuns.length ? heroGuns.map((g) => g.clone()) : [P.clone()]);
const CHASE = { back: 440, up: 170, side: 205, ahead: 470 };

function shipsFlush() { for (const k in SHIPS.types) { const T = SHIPS.types[k]; for (let i = SHIPS.used[k]; i < T.list.length; i++) T.list[i].visible = false; SHIPS.used[k] = 0; } }

/* =========================================================== big props == */
// Solar System mirror field
let mirrors, mirrorData, mirrorMat;
function buildMirrors() {
  const toTarget = HIT.clone().sub(MC).normalize();
  const bis = SUN.clone().add(toTarget).normalize();     // mirror normal that bounces sunlight at the target
  const u = new THREE.Vector3().crossVectors(toTarget, new THREE.Vector3(0, 1, 0)).normalize(), v = new THREE.Vector3().crossVectors(u, toTarget).normalize();
  const step = 62, list = [];
  for (let x = -MIRROR_RADIUS; x <= MIRROR_RADIUS; x += step) for (let y = -MIRROR_RADIUS; y <= MIRROR_RADIUS; y += step * 0.866) {
    const xx = x + ((Math.round(y / (step * 0.866)) & 1) ? step / 2 : 0);
    const r = Math.hypot(xx, y); if (r > MIRROR_RADIUS) continue;
    list.push({ r: r / MIRROR_RADIUS, p: MC.clone().addScaledVector(u, xx).addScaledVector(v, y), w: new THREE.Vector3(hash(list.length) - 0.5, hash(list.length + 7) - 0.5, hash(list.length + 13) - 0.5) });
  }
  mirrorMat = new THREE.MeshStandardMaterial({ color: 0xb8c4d2, metalness: 0.55, roughness: 0.22, emissive: 0xfff1d0, emissiveIntensity: 0, side: THREE.DoubleSide });
  mirrors = new THREE.InstancedMesh(new THREE.PlaneGeometry(56, 56), mirrorMat, list.length);
  mirrors.frustumCulled = false; space.add(mirrors);
  mirrorData = { list, bis };
}
const dummy = new THREE.Object3D();
function setMirrors(deploy, align) {
  mirrors.visible = deploy > 0.001;
  if (!mirrors.visible) return;
  const { list, bis } = mirrorData;
  for (let i = 0; i < list.length; i++) {
    const m = list[i], s = smooth(m.r * 0.85, m.r * 0.85 + 0.15, deploy);
    dummy.position.copy(m.p).addScaledVector(bis, (1 - s) * 40);
    tmpV.copy(bis).addScaledVector(m.w, 0.9 * (1 - align)).normalize();
    dummy.lookAt(tmpV.add(m.p)); dummy.scale.setScalar(Math.max(s, 1e-4));
    dummy.updateMatrix(); mirrors.setMatrixAt(i, dummy.matrix);
  }
  mirrors.instanceMatrix.needsUpdate = true;
}
// the beam
const beam = new THREE.Group(); space.add(beam);
for (const [r, o] of [[230, 0.07], [120, 0.2], [45, 0.75]]) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.8, 1, 24, 1, true), new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.93, 0.75).multiplyScalar(3), transparent: true, opacity: o, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }));
  m.userData.o = o; beam.add(m);
}
{ const len = MC.distanceTo(HIT); beam.position.copy(MC).add(HIT).multiplyScalar(0.5); beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), HIT.clone().sub(MC).normalize()); beam.scale.set(1, len, 1); }
// debris field (post Solar System)
const debris = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: 0x6d675f, flatShading: true, roughness: 1 }), 320);
debris.frustumCulled = false; space.add(debris); debris.visible = false;
let debrisSeed = -1, debrisList = [];
function setDebris(act, tau) {
  if (debrisSeed !== act.idx) {
    debrisSeed = act.idx; const r = rngFrom(900 + act.idx), A = V(act.path[0]), B = V(act.path[act.path.length - 1]);
    debrisList = [];
    for (let i = 0; i < debris.count; i++) {
      const s = r(), base = A.clone().lerp(B, s * 1.15 - 0.05);
      const off = new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).normalize().multiplyScalar(30 + Math.pow(r(), 0.6) * 900);
      debrisList.push({ p: base.add(off), sz: 1.5 + Math.pow(r(), 3) * 26, ax: new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).normalize(), sp: (r() - 0.5) * 1.2, dr: new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).multiplyScalar(8), hot: r() < 0.08 });
    }
  }
  for (let i = 0; i < debrisList.length; i++) {
    const d = debrisList[i];
    dummy.position.copy(d.p).addScaledVector(d.dr, tau);
    dummy.quaternion.setFromAxisAngle(d.ax, d.sp * tau + i);
    dummy.scale.set(d.sz, d.sz * 0.6, d.sz * 0.8); dummy.updateMatrix(); debris.setMatrixAt(i, dummy.matrix);
    if (d.hot) PTS.add(dummy.position, C.fire, 2.4, 0.55 + 0.45 * Math.sin(tau * 7 + i));
  }
  debris.instanceMatrix.needsUpdate = true;
}

/* ============================================================== bridge == */
const bridgeRoot = new THREE.Group(); bridgeRoot.rotation.y = Math.PI; bridge.add(bridgeRoot);
const bHemi = new THREE.HemisphereLight(0x8a94a8, 0x1c1814, 1.1); bridge.add(bHemi);
const bSun = new THREE.DirectionalLight(0xfff0dc, 0); bridge.add(bSun, bSun.target);
const bFlash = new THREE.PointLight(0xffffff, 0, 0, 1); bFlash.position.set(0, 2.6, -3.2); bridge.add(bFlash);
const bAlert = new THREE.PointLight(0xff2a1a, 0, 0, 1); bAlert.position.set(0, 3.8, 0.5); bridge.add(bAlert);
const screenMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.25, 1.1, 0.75), toneMapped: false });
const stripMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.4, 0.7, 0.2), toneMapped: false });

/* ============================================================== loading == */
async function load() {
  const L = new GLTFLoader(), bar = document.getElementById('loadbar');
  const files = ['assets/fortress.glb', 'assets/bridge.glb', 'assets/ships.glb', 'assets/hero.glb'];
  let done = 0; const tick = () => { done++; bar.style.width = `${(done / (files.length + 2)) * 100}%`; };
  const [fg, bg, sg, hg, lights, hmeta] = await Promise.all([
    ...files.map((f) => L.loadAsync(f).then((g) => (tick(), g))),
    fetch('assets/fortress_lights.json').then((r) => r.json()).then((j) => (tick(), j)),
    fetch('assets/hero.json').then((r) => r.json()),
  ]);
  fg.scene.traverse((o) => { if (o.isMesh) { o.material = fortMat; o.frustumCulled = false; } });
  fortress.add(fg.scene);
  bg.scene.traverse((o) => {
    if (!o.isMesh) return;
    if (o.name.startsWith('screens')) o.material = screenMat;
    else if (o.name.startsWith('status_strip')) o.material = stripMat;
    else o.material = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.82, metalness: 0.08 });
  });
  bridgeRoot.add(bg.scene);
  shipPoolInit(sg);
  hg.scene.traverse((o) => {
    if (!o.isMesh) return;
    o.material = o.name.startsWith('hero_windows') ? heroWinMat : o.name.startsWith('hero_engines') ? heroEngMat : o.name.startsWith('hero_lights') ? heroLightMat : heroHullMat;
  });
  hero.add(hg.scene); heroMeta = hmeta;
  // beacons
  const L2 = lights.lights, n = L2.length, pos = new Float32Array(n * 3), ph = new Float32Array(n), az = new Float32Array(n);
  L2.forEach((l, i) => { pos.set([l[0] + l[3] * 10, l[1] + l[4] * 10, l[2] + l[5] * 10], i * 3); ph[i] = hash(i * 3.1); az[i] = (Math.atan2(l[2], l[0]) / Math.PI + 1) / 2; });
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aPh', new THREE.BufferAttribute(ph, 1)); g.setAttribute('aAz', new THREE.BufferAttribute(az, 1));
  const bp = new THREE.Points(g, beaconMat); bp.frustumCulled = false; fortress.add(bp);
  fortress.userData.beaconPos = L2.map((l) => new THREE.Vector3(l[0], l[1], l[2]));
  await new Promise((r) => setTimeout(r, 0)); buildPlanets(); tick();
  buildMirrors();
}

/* ======================================================= fx vocabulary == */
let FX = null; // per-frame accumulators
function boom(pos, t0, size, tau, color = C.fire, shipPos = null) {
  const age = tau - t0, dur = 1.6 + size / 260;
  if (age < 0 || age > dur) return;
  const k = age / dur, a = (1 - k) * (1 - k);
  FLASH.add(pos, size * (0.6 + 1.8 * Math.sqrt(k)), C.white, a * (age < 0.15 ? 1.6 : 0.9));
  FLASH.add(pos, size * (1.5 + 2.5 * k), color, a * 0.8);
  if (k > 0.2) SMOKE.add(pos, size * (2 + 3 * k), new THREE.Color(0.35, 0.22, 0.15), (1 - k) * 0.5);
  for (let i = 0; i < 6; i++) { tmpV.set(hash(t0 + i) - 0.5, hash(t0 + i * 3) - 0.5, hash(t0 + i * 7) - 0.5).normalize().multiplyScalar(size * 2.4 * Math.sqrt(k)).add(pos); PTS.add(tmpV, C.fire, 2, a); }
  if (shipPos) {
    const d = pos.distanceTo(shipPos), near = clamp(1 - d / (size * 14));
    if (near > 0) { FX.flash = Math.max(FX.flash, near * a * 1.3); FX.flashColor.copy(color).lerp(C.white, age < 0.2 ? 0.6 : 0); FX.shake = Math.max(FX.shake, near * a); }
  }
  if (FX.events) FX.events.push({ t0, size, pos, tau });
}
// a swarm of mobile suits = little lights with short trails; pure function of time
function swarm(seed, n, center, rad, color, tau, o = {}) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const h = (k) => hash(seed * 97.3 + i * 13.7 + k);
    const dieAt = o.dieAt ? o.dieAt(i, h) : 1e9;
    const ax = tmpV2.set(h(1) - 0.5, h(2) - 0.5, h(3) - 0.5).normalize();
    const r = rad * (0.45 + 0.55 * h(4)), w = (o.speed ?? 0.25) * (0.6 + h(5)) * (h(6) < 0.5 ? -1 : 1), th0 = h(7) * 6.283;
    const pos = (t) => {
      const th = th0 + w * t, emerge = o.emerge ? smooth(h(8) * o.emerge, h(8) * o.emerge + 3, t) : 1;
      const u = new THREE.Vector3(1, 0, 0).cross(ax).normalize(), v = ax.clone().cross(u);
      const p = new THREE.Vector3().addScaledVector(u, Math.cos(th) * r).addScaledVector(v, Math.sin(th) * r * 0.7);
      p.y += Math.sin(t * 1.3 + i) * rad * 0.06;
      if (o.drift) p.addScaledVector(o.drift, t);
      return o.from ? o.from.clone().lerp(p.add(center), emerge) : p.add(center);
    };
    if (tau >= dieAt) { boom(pos(dieAt), dieAt, o.boomSize ?? 70, tau, C.fire); continue; }
    const p = pos(tau), q = pos(tau - (o.trail ?? 0.6));
    LINES.add(q, p, color, 0.55, 0.0);
    PTS.add(p, color, o.size ?? 2.6, 1);
    out.push(p);
  }
  return out;
}
// beam exchanges between two groups — deterministic slots
function exchange(seed, A, B, rate, cA, cB, tau, hitChance = 0.18) {
  if (!A.length || !B.length) return;
  const slot = 0.1, s0 = Math.floor((tau - 0.35) / slot), s1 = Math.floor(tau / slot);
  for (let s = s0; s <= s1; s++) {
    for (let k = 0; k < rate; k++) {
      const h = (j) => hash(seed * 31.1 + s * 7.7 + k * 3.3 + j);
      if (h(0) > 0.55) continue;
      const fromA = h(1) < 0.5, src = fromA ? A : B, dst = fromA ? B : A;
      const a = src[Math.floor(h(2) * src.length)], b = dst[Math.floor(h(3) * dst.length)];
      const age = tau - s * slot; if (age < 0 || age > 0.35) continue;
      const k2 = clamp(age / 0.12), end = tmpV.copy(a).lerp(b, k2);
      LINES.add(a, end, fromA ? cA : cB, 1 - age / 0.35, 0.3);
      if (k2 >= 1 && h(4) < hitChance) FLASH.add(b, 70, fromA ? cA : cB, (1 - age / 0.35) * 0.8);
    }
  }
}
function fleetFire(seed, ships, target, tau, rate, color, spread = 400) {
  const slot = 0.15, s0 = Math.floor((tau - 0.5) / slot), s1 = Math.floor(tau / slot);
  for (let s = s0; s <= s1; s++) for (let k = 0; k < rate; k++) {
    const h = (j) => hash(seed * 17.9 + s * 5.3 + k * 2.9 + j);
    const a = ships[Math.floor(h(0) * ships.length)]; if (!a) continue;
    const age = tau - s * slot; if (age < 0 || age > 0.5) continue;
    const tgt = tmpV2.set(h(1) - 0.5, h(2) - 0.5, h(3) - 0.5).multiplyScalar(spread).add(target);
    const len = clamp(age / 0.25), head = tmpV.copy(a).lerp(tgt, len), tail = a.clone().lerp(tgt, clamp((age - 0.15) / 0.25));
    LINES.add(tail, head, color, 1 - age / 0.5, 0.25);
  }
}

/* ======================================================= act directors == */
const shipPosOf = (act, tau) => {
  const D = act.D, s = ease(tau / D), P = act.path.map(V);
  if (P.length === 3) { const a = P[0].clone().lerp(P[1], s), b = P[1].clone().lerp(P[2], s); return a.lerp(b, s); }
  return P[0].lerp(P[1], s);
};
function companions(P, alive, target = ORIGIN) {
  const out = [];
  COMPANIONS.forEach((o, i) => {
    if (i < 5 && !alive.includes(i)) return;
    const p = V(o).add(P);
    if (p.length() < 2150) p.setLength(2150);          // never inside the fortress
    ship(o[3] || 'eff_cruiser', p, target); out.push(p);
  });
  return out;
}
/* ----------------------------------------------------- mobile suits ---- */
const MS_SCALE = 1.8;   // anime scale: mobile suits drawn larger than true scale so they read beside a 265 m ship
const H2W = (x, y, z) => new THREE.Vector3(x, y, z).applyMatrix4(hero.matrixWorld);
const heroFwd = () => new THREE.Vector3(0, 0, 1).transformDirection(hero.matrixWorld);
// Our squad: docked in S1–S2, launched from the catapults in S3, in formation after that.
function escorts(actIdx, t) {
  const out = []; if (!heroMeta) return out;
  const fwd = heroFwd();
  ESCORT_SLOTS.forEach((sl, i) => {
    if (actIdx < 2) return;
    const lost = ESCORT_LOST;
    if (i === lost.index && (actIdx > lost.act || (actIdx === lost.act && t > lost.at + 1.5))) return;
    const wob = new THREE.Vector3(Math.sin(t * 0.8 + i) * 7, Math.sin(t * 1.1 + i * 2) * 5, Math.sin(t * 0.6 + i * 3) * 9);
    const slot = H2W(sl[0] + wob.x, sl[1] + wob.y, sl[2] + wob.z);
    let pos = slot, boost = 0.35;
    if (actIdx === 2) {
      const Li = 1.2 + i * 0.85, cat = heroMeta.catapults[i % 2], ex = heroMeta.catapultExits[i % 2];
      if (t < Li) return;
      const a = H2W(...cat), b = H2W(ex[0], ex[1], ex[2] + 70);
      if (t < Li + 0.7) {
        const u = (t - Li) / 0.7; pos = a.lerp(b, u * u); boost = 1.4;
        const exit = H2W(...ex); FLASH.add(exit, 40 * (1 - u), C.amber, 0.9);
      } else {
        const u = ease((t - Li - 0.7) / 3.0), c = H2W(ex[0], ex[1] + 25, ex[2] + 220);
        pos = b.lerp(c, Math.min(1, u * 1.6)).lerp(slot, u); boost = 1.4 - u;
      }
    }
    if (actIdx === lost.act && i === lost.index && t > lost.at) { boom(pos, lost.at, 60, t, C.fire, hero.position); if (t > lost.at + 0.2) return; }
    ship('eff_ms', pos, pos.clone().add(fwd), { boost, scale: MS_SCALE }); out.push(pos);
  });
  return out;
}
// Zeon strafing runs past our hull; escorts shoot some down.
function raid(actIdx, t, esc) {
  const R = RAIDS[actIdx]; if (!R || !heroMeta) return [];
  const out = [], hullPts = [];
  for (let i = 0; i < R.n; i++) {
    const h = (k) => hash(R.seed * 13.1 + i * 7.3 + k);
    const dur = 4.2 + h(1) * 1.6, ti = R.t0 + (R.t1 - R.t0 - dur) * (i / Math.max(1, R.n - 1));
    const u = (t - ti) / dur; if (u < 0 || u > 1.15) continue;
    const side = h(2) < 0.5 ? -1 : 1;
    const A = [side * (500 + h(3) * 400), 120 + h(4) * 220, 1100 + h(5) * 500], B = [side * (90 + h(6) * 90), 30 + h(7) * 90, 20 + h(8) * 120], Cc = [-side * (450 + h(9) * 300), -80 + h(10) * 160, -800 - h(11) * 300];
    const at = (uu) => { const q = clamp(uu), a = 1 - q; return H2W(a * a * A[0] + 2 * a * q * B[0] + q * q * Cc[0], a * a * A[1] + 2 * a * q * B[1] + q * q * Cc[1], a * a * A[2] + 2 * a * q * B[2] + q * q * Cc[2]); };
    const killed = R.kills.includes(i), killU = 0.52 + h(12) * 0.2;
    if (killed && u > killU) { boom(at(killU), ti + killU * dur, 55, t, C.fire, hero.position); continue; }
    if (u > 1) continue;
    const p = at(u), dir = at(u + 0.02).sub(p);
    ship('zeon_ms', p, p.clone().add(dir), { boost: 1, scale: MS_SCALE }); out.push(p);
    // fires at our hull while closing
    if (u > 0.18 && u < 0.62) {
      const slot = Math.floor(t * 4 + i), age = t * 4 + i - slot;
      if (hash(slot * 3.7 + i) < 0.7 && age < 0.5) {
        const hp = H2W((hash(slot + 1) - 0.5) * 60, (hash(slot + 2) - 0.2) * 30, (hash(slot + 3) - 0.5) * 200);
        LINES.add(p, p.clone().lerp(hp, clamp(age / 0.18)), C.zeonBeam, 1 - age * 2, 0.4);
        if (age > 0.18 && hash(slot + 9) < 0.35) { FLASH.add(hp, 40, C.fire, (0.5 - age) * 2); FX.flash = Math.max(FX.flash, (0.5 - age) * 0.6); FX.shake = Math.max(FX.shake, (0.5 - age) * 0.4); }
      }
    }
  }
  if (esc.length && out.length) exchange(R.seed + 5, esc, out, 3, C.effBeam, C.zeonBeam, t, 0.3);
  return out;
}
function fleetBlock(seed, base, n, target, type = 'eff_cruiser', spacing = 560) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const h = (k) => hash(seed * 11 + i * 5.1 + k);
    const p = base.clone().add(new THREE.Vector3((i % 3 - 1) * spacing + (h(1) - 0.5) * 200, (Math.floor(i / 3) % 2 - 0.5) * spacing * 0.6 + (h(2) - 0.5) * 160, Math.floor(i / 3) * spacing * 0.9 + (h(3) - 0.5) * 200));
    if (p.length() < 2150) p.setLength(2150);
    ship(type === 'eff_cruiser' && n >= 6 && i === 1 ? 'eff_battleship' : type, p, target); out.push(p);
  }
  return out;
}
function burningWreck(p, tau, seed) {
  for (let i = 0; i < 5; i++) { tmpV.set(hash(seed + i) - 0.5, hash(seed + i * 2) - 0.5, hash(seed + i * 3) - 0.5).multiplyScalar(160).add(p); FLASH.add(tmpV, 40 + 30 * hash(i + Math.floor(tau * 8)), C.fire, 0.55 + 0.35 * Math.sin(tau * 9 + i * 2)); }
  SMOKE.add(p, 240, new THREE.Color(0.25, 0.18, 0.14), 0.25);
}
function fortressGuns(seed, tau, rate, target, spread) {
  const B = fortress.userData.beaconPos || []; if (!B.length) return;
  const slot = 0.12, s0 = Math.floor((tau - 0.4) / slot), s1 = Math.floor(tau / slot);
  for (let s = s0; s <= s1; s++) for (let k = 0; k < rate; k++) {
    const h = (j) => hash(seed * 7.3 + s * 3.9 + k * 1.7 + j);
    const a = B[Math.floor(h(0) * B.length)]; if (a.dot(tmpV.copy(target).normalize()) < 300) continue;
    const age = tau - s * slot; if (age < 0 || age > 0.4) continue;
    const tgt = tmpV2.set(h(1) - 0.5, h(2) - 0.5, h(3) - 0.5).multiplyScalar(spread).add(target);
    const head = a.clone().lerp(tgt, clamp(age / 0.4) * 0.6), tail = a.clone().lerp(tgt, clamp(age / 0.4) * 0.6 - 0.08);
    LINES.add(tail, head, C.amber, 1 - age / 0.4, 0.1);
  }
}

const DIRECTORS = {
  S1(t, P) {
    companions(P, [0, 1, 2, 3, 4]);
    swarm(11, 5, ORIGIN, 2100, C.zeon, t, { speed: 0.06, size: 2.2 });
    const k = smooth(4, 15, t);
    if (k > 0 && k < 1) { const a = P.clone().add(new THREE.Vector3(3200, 600, -2400)).lerp(P.clone().add(new THREE.Vector3(-4200, 200, -6400)), k); PTS.add(a, C.eff, 2.6); LINES.add(a.clone().add(new THREE.Vector3(500, 60, 280)), a, C.eff, 0.6, 0); }
    heatU.uHeat.value = 0;
  },
  S2(t, P) {
    companions(P, [0, 1, 2, 3, 4]);
    fleetBlock(21, new THREE.Vector3(5600, 150, 12600 - t * 70), 9, ORIGIN);
    fleetBlock(22, new THREE.Vector3(-3600, -300, 11200 - t * 70), 8, ORIGIN);
    swarm(12, 18, new THREE.Vector3(1400, 200, 900), 1500, C.zeon, t, { speed: 0.12 });
  },
  S3(t, P) {
    const comp = companions(P, [0, 1, 2, 3, 4]);
    const f1 = fleetBlock(31, new THREE.Vector3(4800, 100, 9000 - t * 60), 9, ORIGIN);
    fleetBlock(32, new THREE.Vector3(-3000, -250, 8600 - t * 60), 8, ORIGIN);
    const Z = swarm(13, 46, new THREE.Vector3(1600, 300, 1700), 1700, C.zeon, t, { speed: 0.18, emerge: 6, from: new THREE.Vector3(900, 200, 500) });
    const F = swarm(14, 30, new THREE.Vector3(3400 - t * 70, 300, 6200 - t * 140), 1300, C.eff, t, { speed: 0.22 });
    exchange(15, Z, F, 4, C.zeonBeam, C.effBeam, t);
    for (let i = 0; i < 14; i++) boom(new THREE.Vector3(2600 + (hash(i) - 0.5) * 2600, 300 + (hash(i + 1) - 0.5) * 1400, 3600 + (hash(i + 2) - 0.5) * 2600), 3.5 + i * 0.95, 50 + hash(i + 3) * 90, t, C.fire, P);
    if (t > 13.5) fleetFire(16, [...ourGuns(P), ...FX.esc, ...comp, ...f1], ORIGIN, t, 3, C.effBeam, 900);
  },
  S4(t, P) {
    const alive = t < ACTS[3].hitAt ? [0, 1, 2, 3, 4] : [1, 2, 3, 4];
    const comp = companions(P, alive);
    const f1 = fleetBlock(41, new THREE.Vector3(4200, 50, 6200 - t * 50), 9, ORIGIN);
    const f2 = fleetBlock(42, new THREE.Vector3(-2800, -200, 6000 - t * 50), 8, ORIGIN);
    const Z = [...swarm(13, 40, new THREE.Vector3(1500, 300, 1600), 1800, C.zeon, t + 16, { speed: 0.18 }),
      ...swarm(43, 34, new THREE.Vector3(200, 1500, 1700), 1500, C.zeon, t, { speed: 0.2 }),
      ...swarm(44, 34, new THREE.Vector3(-700, -1300, 1800), 1500, C.zeon, t, { speed: 0.2, emerge: 5, from: new THREE.Vector3(-300, -700, 600) })];
    const F = swarm(45, 36, new THREE.Vector3(1200, 100, 4200), 1700, C.eff, t, { speed: 0.24 });
    exchange(46, Z, F, 6, C.zeonBeam, C.effBeam, t);
    fortressGuns(47, t, 5, P.clone().add(new THREE.Vector3(0, 0, -800)), 2600);
    fleetFire(48, [...ourGuns(P), ...FX.esc, ...comp, ...f1, ...f2], ORIGIN, t, 4, C.effBeam, 1000);
    for (let i = 0; i < 16; i++) boom(new THREE.Vector3((hash(i + 40) - 0.3) * 3600, (hash(i + 41) - 0.5) * 2600, 2400 + hash(i + 42) * 3000), 1 + i * 1.05, 50 + hash(i + 43) * 110, t, C.fire, P);
    // the hit on our wingman
    const hitAt = ACTS[3].hitAt, w = V(COMPANIONS[0]).add(P);
    if (t > hitAt - 0.5 && t < hitAt + 0.2) { const a = new THREE.Vector3(600, 200, 1200); LINES.add(a, a.clone().lerp(w, clamp((t - hitAt + 0.5) / 0.45)), C.zeonBeam, 1, 0.3); }
    boom(w, hitAt, 240, t, C.fire, P);
    if (t > hitAt) burningWreck(w.clone().add(new THREE.Vector3(-30, -10, 60).multiplyScalar(t - hitAt)), t, 5);
  },
  S5(t, P) {
    companions(P, [1, 2, 3, 4]);
    fleetBlock(51, new THREE.Vector3(4000, 50, 5600), 9, ORIGIN);
    fleetBlock(52, new THREE.Vector3(-2700, -200, 5400), 8, ORIGIN);
    swarm(53, 40, new THREE.Vector3(1500, 300, 1600), 1700, C.zeon, t, { speed: 0.07 });
    swarm(54, 26, new THREE.Vector3(-500, -900, 1700), 1500, C.zeon, t, { speed: 0.07 });
    setMirrors(smooth(1, 11, t), smooth(12, 15.5, t) * 0.3);
    mirrorMat.emissiveIntensity = 0.05 + 0.1 * smooth(12, 15.5, t);
    FX.lookBias = { target: MC, w: 0.55 * bump(1.5, 5, 12, 16, t) };
  },
  S6(t, P) {
    companions(P, [1, 2, 3, 4]);
    fleetBlock(51, new THREE.Vector3(4000, 50, 5600 - t * 30), 9, ORIGIN);
    fleetBlock(52, new THREE.Vector3(-2700, -200, 5400 - t * 30), 8, ORIGIN);
    const F = ACTS[5].fireAt;
    // the near (beam-side) ring dies outside-in, then the rest
    swarm(53, 40, new THREE.Vector3(1500, 300, 1600), 1700, C.zeon, t, { speed: 0.07, dieAt: (i, h) => F + 1.0 + (1 - h(4)) * 7 + h(9) * 1.5, boomSize: 90 });
    swarm(54, 26, new THREE.Vector3(-500, -900, 1700), 1500, C.zeon, t, { speed: 0.07, dieAt: (i, h) => (h(9) < 0.6 ? F + 6 + h(4) * 8 : 1e9), boomSize: 70 });
    setMirrors(1, smooth(0.3, 3.6, t));
    mirrorMat.emissiveIntensity = 0.15 + bump(2.0, 3.9, 11, 15, t) * 0.75;
    const I = bump(F - 0.1, F + 0.25, 11, 14, t);
    beam.visible = I > 0.001; beam.children.forEach((m) => (m.material.opacity = m.userData.o * I * (0.85 + 0.15 * Math.sin(t * 40))));
    if (I > 0) { FLASH.add(HIT, 1500 * I, C.white, 0.9 * I); FLASH.add(HIT, 3600 * I, C.fire, 0.35 * I); FX.flash = Math.max(FX.flash, 0.35 * I); FX.flashColor.set(1, 0.95, 0.85); }
    FX.white = bump(F, F + 0.3, 5.5, 8.5, t);
    if (FX.white > 0) { FX.flash = Math.max(FX.flash, FX.white * 3.5); FX.flashColor.set(1, 1, 0.95); FX.shake = Math.max(FX.shake, bump(F, F + 0.2, F + 1.5, F + 3, t) * 0.7); }
    heatU.uHeat.value = smooth(F + 0.2, F + 3, t) * (1 - 0.62 * smooth(F + 8, 22, t));
    FX.lookBias = { target: HIT, w: 0.25 };
  },
  S7(t, P) {
    companions(P, [1, 2, 3, 4]);
    const f1 = fleetBlock(71, P.clone().add(new THREE.Vector3(1800, -100, -700)), 9, ORIGIN);
    const f2 = fleetBlock(72, P.clone().add(new THREE.Vector3(-1900, 150, -300)), 8, ORIGIN);
    swarm(73, 16, ORIGIN, 1900 + 1200 * (1 - smooth(0, 16, t)), C.zeon, t, { speed: 0.3 });
    fortressGuns(74, t, 2, P.clone().add(new THREE.Vector3(0, 0, -400)), 1600);
    fleetFire(75, [...f1, ...f2], ORIGIN, t, 3, C.effBeam, 700);
    for (let i = 0; i < 9; i++) { const d = new THREE.Vector3(hash(i + 70) - 0.2, hash(i + 71) - 0.5, hash(i + 72) * 0.8 + 0.2).normalize().multiplyScalar(1150); boom(d, 2 + i * 1.6, 120, t, C.fire, P); }
    heatU.uHeat.value = 0.38;
    setMirrors(1, 1); mirrorMat.emissiveIntensity = 0;
  },
  S8(t, P) {
    companions(P, [1, 2, 3, 4]);
    fleetBlock(81, new THREE.Vector3(2400, -100, 2400), 6, ORIGIN);
    fleetBlock(82, new THREE.Vector3(-1500, 200, 2600), 6, ORIGIN);
    const FA = ACTS[7].flashAt;
    const A = (s) => DUEL.clone().add(new THREE.Vector3(1300 * Math.sin(0.8 * s), 600 * Math.sin(1.6 * s + 1), 1000 * Math.cos(0.65 * s)));
    const B = (s) => A(s - 0.45).add(new THREE.Vector3(320 * Math.sin(2.3 * s), 260 * Math.cos(1.9 * s), 380 * Math.sin(1.3 * s + 2)));
    const alive = t < FA;
    if (alive) { for (let k = 0; k < 8; k++) LINES.add(A(t - (k + 1) * 0.12), A(t - k * 0.12), C.zeonBeam, 0.9 - k * 0.1, 0.5); PTS.add(A(t), C.zeonBeam, 6); FLASH.add(A(t), 320, C.zeon, 0.8); }
    for (let k = 0; k < 6; k++) LINES.add(B(t - (k + 1) * 0.12), B(t - k * 0.12), C.white, (0.8 - k * 0.12) * (alive ? 1 : 1 - smooth(FA, FA + 5, t)), 0.5);
    PTS.add(B(t), C.white, 5, alive ? 1 : 1 - smooth(FA + 1, FA + 6, t)); FLASH.add(B(t), 260, C.white, (alive ? 0.6 : 0.6 * (1 - smooth(FA + 1, FA + 6, t))));
    if (alive) {
      const bits = []; for (let i = 0; i < 6; i++) { const ph = i * 1.05, j = Math.floor(t * 1.6 + i); bits.push(B(t).add(new THREE.Vector3(Math.sin(ph + j) * 420, Math.cos(ph * 2 + j) * 300, Math.sin(ph * 3 + j * 1.7) * 420))); }
      bits.forEach((b) => PTS.add(b, C.zeon, 2.2));
      exchange(83, bits, [B(t)], 2, C.zeonBeam, C.white, t, 0.4);
    }
    boom(A(FA), FA, 900, t, C.zeon, P);
    if (t > FA) FLASH.add(A(FA), 400 * (1 - smooth(FA, FA + 6, t)), C.zeon, 0.4);
    heatU.uHeat.value = 0.34;
    FX.lookBias = { target: DUEL, w: 0.62 * bump(2, 7, 23, 26.5, t) };
    FX.commsHush = t > FA - 0.2 && t < FA + 2.8;
  },
  S9(t, P) {
    const K = ACTS[8].killAt, sinkAt = 7.0;
    const comp = companions(P, t < sinkAt ? [1, 2, 3, 4] : [1, 2, 4]);
    const f1 = fleetBlock(91, new THREE.Vector3(1300, 0, 2700), 6, ORIGIN);
    const Apos = t < 6 ? new THREE.Vector3(250, 120, 1150).lerp(new THREE.Vector3(300, 140, 1750), ease((t - 1) / 5)) : new THREE.Vector3(300, 140, 1750).lerp(new THREE.Vector3(320, 160, 1950), ease((t - 6) / 10));
    const victim3 = V(COMPANIONS[3]).add(P);
    if (t < K) {
      ship('zeon_armor', Apos, P, { scale: 3.2 });
      PTS.add(Apos.clone().add(new THREE.Vector3(0, 20, 50)), C.zeonBeam, 4, 0.8 + 0.2 * Math.sin(t * 6));
      const shot = (at, tgt) => { if (t > at && t < at + 0.8) { const a = 1 - (t - at) / 0.8; for (const o of [-14, 0, 14]) LINES.add(Apos.clone().add(new THREE.Vector3(o, 10, 0)), tgt, C.zeonBeam, a, 0.6); } };
      shot(6.2, victim3); shot(9.0, f1[1] || ORIGIN); shot(10.8, f1[4] || ORIGIN); shot(14.2, f1[2] || ORIGIN);
      if (t > 12.5) {
        fleetFire(92, [...ourGuns(P), ...FX.esc, ...comp, ...f1], Apos, t, 5, C.effBeam, 60);
        const h = Math.floor(t * 9); FLASH.add(Apos.clone().add(new THREE.Vector3(hash(h) - 0.5, hash(h + 1) - 0.5, hash(h + 2) - 0.5).multiplyScalar(80)), 60, C.amber, 0.7);
      }
    }
    boom(victim3, sinkAt, 260, t, C.fire, P);
    if (t > sinkAt) burningWreck(victim3.clone().add(new THREE.Vector3(20, -15, -30).multiplyScalar(t - sinkAt)), t, 9);
    if (f1[1]) boom(f1[1], 9.6, 200, t, C.fire, P);
    if (f1[4]) boom(f1[4], 11.4, 200, t, C.fire, P);
    boom(Apos, K, 650, t, C.fire, P);
    if (t > K) burningWreck(Apos, t, 13);
    heatU.uHeat.value = 0.3;
    FX.lookBias = { target: new THREE.Vector3(300, 140, 1700), w: 0.6 };
  },
  S10(t, P) {
    companions(P, [1, 2, 4], ORIGIN);
    for (let i = 0; i < 9; i++) {
      const a = i / 9 * Math.PI * 2 + t * 0.012, p = new THREE.Vector3(Math.cos(a) * 2700, (hash(i) - 0.5) * 900, Math.sin(a) * 2700);
      ship('eff_cruiser', p, p.clone().add(new THREE.Vector3(-Math.sin(a), 0, Math.cos(a))));
    }
    for (let i = 0; i < 2; i++) { const p = new THREE.Vector3(-800 - i * 300, -200, -1800).lerp(new THREE.Vector3(-9000, -1500, -14000), smooth(0, 20, t) * (0.8 + i * 0.2)); ship('zeon_cruiser', p, p.clone().add(new THREE.Vector3(-0.5, -0.1, -1))); }
    beaconMat.uniforms.uSwap.value = smooth(4.5, 12, t);
    heatU.uHeat.value = 0.3 - 0.15 * smooth(0, 20, t);
  },
};

/* ================================================================ state == */
const S = { T: 0, paused: false, lastT: 0, hud: true, started: false, yaw: 0, pitch: 0, dragging: false, sound: false, ended: false, view: params.get('view') === 'chase' ? 'chase' : 'bridge' };
const baseQ = new THREE.Quaternion(), headQ = new THREE.Quaternion(), shakeQ = new THREE.Quaternion(), eul = new THREE.Euler(0, 0, 0, 'YXZ');
const lookM = new THREE.Matrix4(), UP = new THREE.Vector3(0, 1, 0);
const actOf = (T) => { let i = ACTS.length - 1; for (let k = 0; k < ACTS.length; k++) if (T < CUM[k] + DURS[k]) { i = k; break; } return i; };
ACTS.forEach((a, i) => { a.D = DURS[i]; a.idx = i; });

/* ================================================================ audio == */
const bgm = document.getElementById('bgm');
let AC = null, master = null, hum = null;
function audioInit() {
  if (AC) return;
  AC = new (window.AudioContext || window.webkitAudioContext)(); master = AC.createGain(); master.gain.value = 0.9; master.connect(AC.destination);
  const len = AC.sampleRate * 2, buf = AC.createBuffer(1, len, AC.sampleRate), d = buf.getChannelData(0);
  let last = 0; for (let i = 0; i < len; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = last * 3.5; }
  const src = AC.createBufferSource(); src.buffer = buf; src.loop = true;
  const lp = AC.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 160;
  hum = AC.createGain(); hum.gain.value = 0.0; src.connect(lp).connect(hum).connect(master); src.start();
  AC.noiseBuf = buf;
}
function rumble(gain, dur = 1.6, freq = 120) {
  if (!AC || !S.sound) return;
  const s = AC.createBufferSource(); s.buffer = AC.noiseBuf; const f = AC.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq;
  const g = AC.createGain(); const n = AC.currentTime; g.gain.setValueAtTime(0, n); g.gain.linearRampToValueAtTime(gain, n + 0.03); g.gain.exponentialRampToValueAtTime(0.001, n + dur);
  s.connect(f).connect(g).connect(master); s.start(n, Math.random()); s.stop(n + dur + 0.1);
}
function beep() {
  if (!AC || !S.sound) return;
  const o = AC.createOscillator(), g = AC.createGain(), n = AC.currentTime; o.type = 'sine'; o.frequency.value = 1320;
  g.gain.setValueAtTime(0, n); g.gain.linearRampToValueAtTime(0.05, n + 0.01); g.gain.linearRampToValueAtTime(0, n + 0.09);
  o.connect(g).connect(master); o.start(n); o.stop(n + 0.12);
}

/* ================================================================== HUD == */
const $ = (id) => document.getElementById(id);
const hud = $('hud'), card = $('card'), narr = $('narr'), comms = $('comms'), fade = $('fade'), white = $('white');
const prog = $('prog'), fill = $('fill'), clock = $('clock'), playBtn = $('play'), muteBtn = $('mute'), actLabel = $('act');
const ticks = $('ticks');
ACTS.forEach((a, i) => { const t = document.createElement('i'); t.style.left = `${(CUM[i] / TOTAL) * 100}%`; t.title = `${a.id} ${a.title}`; ticks.appendChild(t); });
const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
let shownAct = -1, shownComm = '';
function updateHud(act, tau) {
  const i = act.idx;
  if (shownAct !== i) {
    shownAct = i;
    actLabel.innerHTML = `<b>${act.id.replace('S', 'S')} / ${ACTS.length}</b> ${act.title}`;
    $('card-n').textContent = `第 ${i + 1} 幕 · ACT ${i + 1}`; $('card-t').textContent = act.title; $('card-e').textContent = act.en;
    $('narr-t').textContent = act.narr; $('narr-e').textContent = act.narrEn;
    $('cc').innerHTML = act.cc.map((c) => `<span class="cc ${c.toLowerCase()}">${c}</span>`).join('');
  }
  card.style.opacity = bump(0.25, 0.9, 3.4, 4.4, tau);
  narr.style.opacity = bump(1.6, 2.4, 9.2, 10.2, tau);
  let cur = null; for (const c of act.comms) if (tau >= c[0] && tau < c[0] + 4.6) cur = c;
  const key = cur ? act.id + cur[0] : '';
  if (key !== shownComm) {
    shownComm = key;
    if (cur) { $('comms-w').textContent = cur[1]; $('comms-t').textContent = cur[2]; $('comms-e').textContent = cur[3]; }
  }
  comms.style.opacity = cur ? bump(cur[0], cur[0] + 0.25, cur[0] + 4.2, cur[0] + 4.6, tau) : 0;
  const fr = S.T / TOTAL; fill.style.width = `${fr * 100}%`; clock.textContent = `${fmt(S.T)} / ${fmt(TOTAL)}`;
}

/* =============================================================== frame == */
const clockT = new THREE.Clock();
let lastAct = -1, lastTau = 0;
function frame() {
  const dt = Math.min(clockT.getDelta(), 0.1);
  if (S.started && !S.paused && !S.ended) {
    S.T += dt;
    if (S.T >= TOTAL) { S.T = TOTAL - 0.001; end(); }
  }
  const i = actOf(S.T), act = ACTS[i], tau = S.T - CUM[i];
  FX = { flash: 0, flashColor: new THREE.Color(1, 0.6, 0.3), shake: 0, white: 0, lookBias: null, commsHush: false, events: [] };

  // ship & head
  const P = shipPosOf(act, tau);
  beam.visible = false; mirrors && (mirrors.visible = false); heatU.uTime.value = S.T; beaconMat.uniforms.uTime.value = S.T;
  beaconMat.uniforms.uSwap.value = i === 9 ? beaconMat.uniforms.uSwap.value : 0;
  if (mirrorMat) mirrorMat.emissiveIntensity = 0;
  heatU.uHeat.value = 0;
  if (i >= 6 && mirrors) setMirrors(1, 1);
  placeHero(P);
  const ESC = escorts(i, tau); FX.esc = ESC;
  DIRECTORS[act.id](tau, P);
  raid(i, tau, ESC);
  debris.visible = i >= 6; if (debris.visible) setDebris(act, tau);

  const target = FX.lookBias ? ORIGIN.clone().lerp(FX.lookBias.target, FX.lookBias.w) : ORIGIN;
  lookM.lookAt(P, target, UP); baseQ.setFromRotationMatrix(lookM);
  const sway = 0.006;
  eul.set(S.pitch + Math.sin(S.T * 0.31) * sway, S.yaw + Math.sin(S.T * 0.23) * sway, Math.sin(S.T * 0.17) * sway * 0.6); headQ.setFromEuler(eul);
  const sh = FX.shake * 0.02; eul.set((hash(S.T * 60) - 0.5) * sh, (hash(S.T * 60 + 1) - 0.5) * sh, (hash(S.T * 60 + 2) - 0.5) * sh * 2); shakeQ.setFromEuler(eul);
  const chase = S.view === 'chase';
  hero.visible = chase; passBridge.enabled = !chase;
  if (chase) {
    // third person: camera locked behind and above our ship, aim leans toward whatever the act wants us to watch
    const fwd = tmpV2.copy(ORIGIN).sub(P).normalize(), lookDir = fwd.clone();
    if (FX.lookBias) lookDir.lerp(FX.lookBias.target.clone().sub(P).normalize(), FX.lookBias.w * 0.7).normalize();
    const right = new THREE.Vector3().crossVectors(lookDir, UP).normalize();
    const orbit = new THREE.Quaternion().setFromAxisAngle(UP, S.yaw).multiply(new THREE.Quaternion().setFromAxisAngle(right, -S.pitch * 0.7));
    const camPos = lookDir.clone().multiplyScalar(-CHASE.back).addScaledVector(UP, CHASE.up).addScaledVector(right, CHASE.side).applyQuaternion(orbit).add(P);
    camPos.y += Math.sin(S.T * 0.27) * 4; camPos.x += Math.sin(S.T * 0.19) * 5;
    const aim = P.clone().addScaledVector(lookDir.clone().applyQuaternion(orbit), CHASE.ahead);
    lookM.lookAt(camPos, aim, UP); spaceCam.position.copy(camPos); spaceCam.quaternion.setFromRotationMatrix(lookM).multiply(shakeQ);
    stars.position.copy(camPos); sunGroup.position.copy(camPos);
    // the hull takes the light the bridge used to take
    heroHullMat.emissive.copy(FX.flashColor).multiplyScalar(Math.min(1.2, FX.flash * 0.3)).add(tmpC.setRGB(1, 1, 0.96).multiplyScalar(FX.white * 0.9));
    for (const [k, e] of heroEngines.entries()) FLASH.add(e, k < 2 ? 15 : 11, C.engine, 0.34 + 0.06 * Math.sin(S.T * 23 + k));
  } else {
    spaceCam.position.copy(P); spaceCam.quaternion.copy(baseQ).multiply(headQ).multiply(shakeQ);
    bridgeCam.quaternion.copy(headQ).multiply(shakeQ);
    stars.position.copy(P); sunGroup.position.copy(P);
  }

  // bridge lighting
  tmpV.copy(SUN).applyQuaternion(tmpQ.copy(baseQ).invert());   // sun in ship frame
  bSun.position.copy(tmpV).multiplyScalar(10); bSun.target.position.set(0, 0, 0); bSun.intensity = 1.6 * smooth(-0.15, 0.25, -tmpV.z);
  bFlash.color.copy(FX.flashColor); bFlash.intensity = FX.flash * 6;
  const alert = act.alert || (act.alertFrom !== undefined && tau > act.alertFrom);
  const pulse = 0.5 + 0.5 * Math.sin(S.T * 3.2);
  bAlert.intensity = alert ? 0.9 + 1.4 * pulse : 0;
  stripMat.color.setRGB(alert ? 1.6 + pulse : 1.4, alert ? 0.12 : 0.7, alert ? 0.08 : 0.2);
  screenMat.color.setRGB(0.25, 1.1 * (0.92 + 0.08 * Math.sin(S.T * 13)), 0.75);
  bHemi.intensity = 1.0 + FX.white * 2;
  heroWinMat.color.setRGB(alert ? 2.4 * (0.6 + 0.4 * pulse) : 2.2, alert ? 0.25 : 1.7, alert ? 0.15 : 0.9);
  heroLightMat.color.setScalar(fract(S.T * 0.7) < 0.12 ? 3 : 0.25);
  white.style.opacity = FX.white * 0.95;
  // fades between acts
  const f = Math.max(1 - smooth(0, 1.1, tau), i < ACTS.length - 1 ? smooth(act.D - 0.7, act.D, tau) : 0);
  fade.style.opacity = S.started ? f : 1;

  // audio cues on forward playback
  if (S.started && !S.paused && i === lastAct) {
    for (const e of FX.events) if (e.t0 > lastTau && e.t0 <= tau) { const d = e.pos.distanceTo(P); rumble(clamp(1.4 - d / (e.size * 12)) * 0.9 + 0.05, 1.2 + e.size / 300); }
    for (const c of act.comms) if (c[0] > lastTau && c[0] <= tau) beep();
    if (act.fireAt && act.fireAt > lastTau && act.fireAt <= tau) { rumble(1.6, 6, 70); rumble(0.8, 3, 400); }
  }
  if (hum) hum.gain.value = S.sound ? 0.18 + (alert ? 0.06 : 0) : 0;
  lastAct = i; lastTau = tau;

  PTS.flush(); LINES.flush(); FLASH.flush(); SMOKE.flush(); shipsFlush();
  updateHud(act, tau);
  composer.render();
  requestAnimationFrame(frame);
}

/* ============================================================== controls == */
function seekTo(T) { S.T = clamp(T, 0, TOTAL - 0.001); S.ended = false; $('end').classList.remove('on'); }
function goAct(k) { seekTo(CUM[clamp(k, 0, ACTS.length - 1)] + 0.01); }
function setPaused(p) { S.paused = p; playBtn.textContent = p ? '▶' : '❚❚'; syncMusic(); }
function syncMusic() { if (S.sound && !S.paused && S.started && !S.ended) { bgm.currentTime = Math.min(S.T, bgm.duration || 1e9) % (bgm.duration || 1e9); bgm.play().catch(() => {}); } else bgm.pause(); }
function setSound(on) { S.sound = on; bgm.muted = !on; muteBtn.textContent = on ? '🔊' : '🔇'; muteBtn.classList.toggle('off', !on); if (on) { audioInit(); AC.resume(); } syncMusic(); }
function end() { S.ended = true; $('end').classList.add('on'); bgm.pause(); }
playBtn.onclick = () => setPaused(!S.paused);
muteBtn.onclick = () => setSound(!S.sound);
$('replay').onclick = () => { seekTo(0); setPaused(false); syncMusic(); };
const frac = (e) => { const r = prog.getBoundingClientRect(); return clamp((e.clientX - r.left) / r.width); };
let scrub = false;
prog.addEventListener('pointerdown', (e) => { scrub = true; prog.setPointerCapture(e.pointerId); seekTo(frac(e) * TOTAL); });
prog.addEventListener('pointermove', (e) => { if (scrub) seekTo(frac(e) * TOTAL); });
prog.addEventListener('pointerup', () => { scrub = false; syncMusic(); });
// look around (drag), double-click to recentre
let lx = 0, ly = 0;
canvas.addEventListener('pointerdown', (e) => { S.dragging = true; lx = e.clientX; ly = e.clientY; canvas.setPointerCapture(e.pointerId); });
canvas.addEventListener('pointermove', (e) => {
  if (!S.dragging) return; const k = 0.0032 * (spaceCam.fov / 55);
  S.yaw = clamp(S.yaw + (e.clientX - lx) * k, -2.6, 2.6); S.pitch = clamp(S.pitch + (e.clientY - ly) * k, -0.7, 0.95); lx = e.clientX; ly = e.clientY;
});
canvas.addEventListener('pointerup', () => (S.dragging = false));
canvas.addEventListener('dblclick', () => { S.yaw = 0; S.pitch = 0; });
addEventListener('keydown', (e) => {
  if (e.code === 'Space') { e.preventDefault(); setPaused(!S.paused); }
  else if (e.code === 'ArrowRight') goAct(actOf(S.T) + 1);
  else if (e.code === 'ArrowLeft') goAct(actOf(S.T) - (S.T - CUM[actOf(S.T)] < 2 ? 1 : 0));
  else if (e.code === 'KeyH') { S.hud = !S.hud; document.body.classList.toggle('nohud', !S.hud); }
  else if (e.code === 'KeyM') setSound(!S.sound);
  else if (e.code === 'KeyR') { S.yaw = 0; S.pitch = 0; }
  else if (e.code === 'KeyC') setView(S.view === 'chase' ? 'bridge' : 'chase');
});
addEventListener('resize', resize);

const viewBtn = $('view-btn');
function setView(v) {
  S.view = v; S.yaw = 0; S.pitch = 0;
  viewBtn.textContent = v === 'chase' ? '追蹤 Chase' : '艦橋 Bridge';
  document.body.classList.toggle('chase', v === 'chase');
}
viewBtn.onclick = () => setView(S.view === 'chase' ? 'bridge' : 'chase');
setView(S.view);

function board(withSound, view) {
  if (view) setView(view);
  $('title').classList.add('gone'); S.started = true; hud.classList.add('on');
  setSound(withSound); setPaused(false);
}
$('board').onclick = () => board(true);
$('board-quiet').onclick = () => board(false);
$('board-chase').onclick = () => board(true, 'chase');

// test / embed hooks
window.SOLOMON = { dbg: { space, spaceCam, earth: () => earth, fortress, renderer }, seek: (T) => seekTo(T), act: (k, tau = 0) => seekTo(CUM[k] + tau), hud: (on) => { S.hud = on; document.body.classList.toggle('nohud', !on); }, pause: setPaused, view: setView, total: TOTAL, cum: CUM, start: () => board(false), state: S };

resize();
load().then(() => {
  $('loading').classList.add('gone'); $('board').disabled = false; $('board-quiet').disabled = false; $('board-chase').disabled = false;
  $('ship-name').textContent = `${SHIP_NAME.zh} ${SHIP_NAME.en}`;
  if (params.has('autostart')) board(false);
  if (params.has('t')) seekTo(parseFloat(params.get('t')));
  requestAnimationFrame(frame);
}).catch((e) => { console.error(e); $('loading').textContent = '載入失敗 · failed to load — ' + e.message; });
