// Voiced bridge comms (EN / 粵語 / 日本語).
// Each comms line in acts.js plays audio/<lang>/solomon/sNN_NN_<role>.wav at its act time.
// NN_NN = act number and the line's row within that act (1-based, time order), matching the voice script.
// Lines flagged radio go through a band-pass (~300–3400 Hz) so one clean recording works both ways.
// Missing files are skipped silently. Subtitles are unaffected (always 繁中 + English).

export const VOICE_LANGS = ['en', 'yue', 'ja'];
export const VOICE_LABEL = { en: 'EN', yue: '粵', ja: '日' };
const KEY = 'solomon.voiceLang';
const POOL = 3;   // a few overlapping voices, so a long line is never cut off by the next one

const pad = (n) => String(n).padStart(2, '0');

export function createVoice(game) {
  let lang = 'en';
  try { const s = localStorage.getItem(KEY); if (VOICE_LANGS.includes(s)) lang = s; } catch (e) {}
  const missing = new Set();
  const slots = [];
  let AC = null, out = null, onActive = null;

  function attach(ctx, dest) {
    if (AC) return;
    AC = ctx;
    out = AC.createGain(); out.gain.value = 1.0; out.connect(dest);
    for (let k = 0; k < POOL; k++) {
      const el = new Audio(); el.preload = 'auto';
      const src = AC.createMediaElementSource(el);
      const dry = AC.createGain();
      const wet = AC.createGain();
      const hp = AC.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 300; hp.Q.value = 0.7;
      const lp = AC.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3400; lp.Q.value = 0.7;
      const drive = AC.createWaveShaper(); drive.curve = softClip(); drive.oversample = '2x';
      src.connect(dry).connect(out);
      src.connect(hp).connect(lp).connect(drive).connect(wet).connect(out);
      const slot = { el, dry, wet, url: '', live: false };
      el.addEventListener('ended', () => { slot.live = false; changed(); });
      el.addEventListener('error', () => { if (slot.url) missing.add(slot.url); slot.live = false; changed(); });
      slots.push(slot);
    }
  }

  function softClip() {
    const n = 1024, c = new Float32Array(n);
    for (let i = 0; i < n; i++) { const x = (i / (n - 1)) * 2 - 1; c[i] = Math.tanh(2.2 * x) / Math.tanh(2.2); }
    return c;
  }

  function changed() { if (onActive) onActive(slots.some((s) => s.live)); }

  function url(actNo, row, role) { return `audio/${lang}/${game}/s${pad(actNo)}_${pad(row)}_${role}.wav`; }

  function play(actNo, row, role, radio) {
    if (!AC) return;
    const u = url(actNo, row, role);
    if (missing.has(u)) return;
    const slot = slots.find((s) => !s.live) || slots.reduce((a, b) => (a.el.currentTime > b.el.currentTime ? a : b));
    slot.url = u; slot.live = true;
    const now = AC.currentTime;
    slot.dry.gain.setValueAtTime(radio ? 0 : 1, now);
    slot.wet.gain.setValueAtTime(radio ? 1.25 : 0, now);
    slot.el.src = u;
    slot.el.play().catch(() => { slot.live = false; changed(); });
    changed();
  }

  function stop() { for (const s of slots) { s.el.pause(); s.live = false; } changed(); }
  function pause() { for (const s of slots) if (s.live) s.el.pause(); }
  function resume() { for (const s of slots) if (s.live && !s.el.ended) s.el.play().catch(() => {}); }

  function setLang(l) {
    if (!VOICE_LANGS.includes(l)) return;
    lang = l; stop();
    try { localStorage.setItem(KEY, l); } catch (e) {}
  }
  function cycle() { setLang(VOICE_LANGS[(VOICE_LANGS.indexOf(lang) + 1) % VOICE_LANGS.length]); return lang; }

  return {
    attach, play, stop, pause, resume, setLang, cycle,
    get lang() { return lang; },
    set onActive(fn) { onActive = fn; },
  };
}
