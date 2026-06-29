/* =====================================================================
 *  data.example.js — a MINIMAL, VALID skeleton battle.
 *  ---------------------------------------------------------------------
 *  COPY this file to data.js and fill it in with your OWN researched, SOURCED
 *  scenario. This is a tiny SYNTHETIC example (2 sides, ~2 days, a few events) —
 *  NOT a real battle. Every value is a placeholder that shows the SHAPE of the
 *  data; replace all of it.
 *
 *  Validate as you author (no browser, no tiles needed):
 *      node tools/validate.mjs data.example.js
 *  The engine refuses to boot a battle that fails this contract, and the error
 *  names the exact field. Full field reference: PLAYBOOK.md. Procedure: AGENTS.md.
 *
 *  Bilingual slots: `_zh` = your PRIMARY / local language (ANY script — set
 *  meta.fonts + meta.dir:"rtl" for non-Latin / right-to-left); `_en` = the
 *  SECONDARY language (conventionally English). This example uses English in both.
 *
 *  GOLDEN RULE: history must be SOURCED, never invented. notes.sources is required;
 *  the engine will not start without it. (Here it is honestly marked as example data.)
 *  Fictional-but-canon subjects are fine too (the engine ships a fictional demo): cite the
 *  canon as your sources and disclose any stand-ins in caveats. See AGENTS.md.
 * ===================================================================== */
window.BATTLE_DATA = (function () {

  /* -- the two sides. The faction <key> ("blue"/"red") becomes a CSS variable
   *    (--fac-<key>) and a class; keep it a simple lowercase identifier.
   *    role drives attacker/defender behaviour (front/retreat colour, the strength
   *    bars, the progress gradient). N sides are allowed — add more keys. -------- */
  const factions = {
    blue: { main:0x3b7be2, glow:0x5aa0ff, dim:0x1f3f7a, css:"#3b7be2", name_zh:"Blue Force", name_en:"Blue Force", role:"attacker", maxStrength:5000, defaultFlag:"blue" },
    red:  { main:0xe23b3b, glow:0xff6a5a, dim:0x7a1f1f, css:"#e23b3b", name_zh:"Red Force",  name_en:"Red Force",  role:"defender",  maxStrength:5000, defaultFlag:"red"  },
  };

  /* -- the map box (REAL WGS84 lng/lat) + the clock window + identity.
   *    meta.geo IS the map box and the single source of truth: tools/fetch_tiles reads it directly (no box to set there).
   *    `Z` is the tile zoom (13 is a good default). day keys below live in [dayMin..dayMax]. */
  const meta = {
    geo:{ minLng:9.00, maxLng:9.14, minLat:44.32, maxLat:44.43, Z:13 },   // example: a small coastal/hill area — REPLACE with your battle's box
    dayMin:1, dayMax:2.5, year:2000, month:1, lastDay:2,                  // clock window + the scene-label date prefix/clamp
    title:"Example Battle", subtitle:"A TEMPLATE SKELETON — replace with your battle",
    // OPTIONAL (delete to use engine defaults): dir:"rtl" for RTL narration; fonts:{display,mono} for a non-Latin script;
    // theme:{ sky:{...}, sea, sun:{...}, amb:{...}, grade:{...} } for a custom cinematic look (deep-merged over the default).
  };

  // -- ui is OPTIONAL: omit it and every engine-rendered string defaults to English. Provide it to translate them.
  //    e.g. ui:{ sceneLabel:false } hides the running date chip; ui:{ sceneLabel:"{year}.{month}.{day}" } formats it via tokens.

  /* -- intro: the opening title card + its establishing camera.
   *    cam.dist is in WORLD UNITS (the whole bbox is 2000 units wide), so a shot frames roughly
   *    bbox-width x dist/4800: ~1200 is a close action shot (a quarter of the box), ~2400 a wide
   *    establisher. Scale dist to your bbox, not a fixed number. --------------------- */
  const intro = { title_zh:"Example Battle", title_en:"Example Battle",
    sub_zh:"A skeleton scenario — replace with your own", sub_en:"A skeleton scenario — replace with your own",
    cam:{ lng:9.07, lat:44.37, dist:2200, az:0, el:52 } };

  /* -- outro: the closing pull-back camera. ------------------------------------- */
  const outro = { title_zh:"The End", title_en:"The End",
    narration_zh:"Replace with your closing line.", narration_en:"Replace with your closing line.",
    cam:{ lng:9.07, lat:44.37, dist:2400, az:0, el:48, orbit:1.0, tween:3.4 } };

  /* -- flagLegend: the flag swatches in the legend (each names a flag id + faction).
   *    Define the flag art for these ids in flags.js (unknown ids fall back to a default). */
  const flagLegend = [
    { flag:"blue", zh:"Blue Force", en:"Blue Force", faction:"blue" },
    { flag:"red",  zh:"Red Force",  en:"Red Force",  faction:"red"  },
  ];

  /* -- geography: place labels + (optional) defensive lines. regions/points/lines
   *    are all OPTIONAL — a sparse battle may have few or none. ------------------ */
  const geography = {
    points: [
      { name_en:"Hill 100", name_zh:"Hill 100", type:"hill", lng:9.06, lat:44.375, h:100 },
    ],
    // lines: [ { name_zh:"Defence Line", name_en:"Defence Line", color:"#e0b85a",
    //           path:[[9.10,44.41],[9.09,44.38],[9.10,44.36]], fade:{ holdUntil:1.5, collapseBy:2.2, span:0.5 } } ],
  };

  /* -- units: each force, moving along its track of keyframes {d,lng,lat,s,st}.
   *    st (state) ∈ march | hold | attack | retreat | landing | dead.
   *    One keyframe = a fixed unit; two+ = it glides between them. -------------- */
  const units = [
    { id:"blue_1", faction:"blue", kind:"infantry", flag:"blue", cf:true,
      name_zh:"Blue Battalion", name_en:"Blue Battalion", type:"Infantry",
      track:[ {d:1, lng:9.02, lat:44.34, s:4000, st:"march"},
              {d:2, lng:9.075, lat:44.385, s:3600, st:"attack"} ] },
    { id:"red_1", faction:"red", kind:"infantry", flag:"red", cf:true,
      name_zh:"Red Battalion", name_en:"Red Battalion", type:"Infantry",
      track:[ {d:1, lng:9.10, lat:44.40, s:3000, st:"hold"},
              {d:2, lng:9.09, lat:44.39, s:2400, st:"retreat"} ] },
  ];

  /* -- arrows: dated movement annotations {f,from,to,d,kind,label}. ------------- */
  const arrows = [
    { f:"blue", from:[9.02,44.34], to:[9.075,44.385], d:1.6, kind:"attack", label:"Advance" },
  ];

  /* -- OPTIONAL scenario arrays. Delete any you do not use. -------------------- */
  // fronts: dated front-line polylines, each { d, path:[[lng,lat],…] }.
  const fronts = [
    { d:1, path:[[9.10,44.41],[9.09,44.38],[9.10,44.355]] },
    { d:2, path:[[9.085,44.40],[9.08,44.385],[9.085,44.36]] },
  ];
  // weather: per-day { d, night, fog, rain, smoke } (each 0..1). Absent → clear day.
  const weather = [
    { d:1, night:0.0, fog:0.1, rain:0.0, smoke:0.0, zh:"Clear", en:"Clear" },
    { d:2, night:0.0, fog:0.2, rain:0.1, smoke:0.1, zh:"Overcast", en:"Overcast" },
  ];
  // hotspots: dated combat FX { a, b, kind, lng, lat, i } (kind ∈ firefight|artillery|explosion|landing|air|oilfire).
  const hotspots = [
    { a:1.6, b:2.0, kind:"firefight", lng:9.075, lat:44.385, i:0.6 },
  ];

  /* -- storyboard: the directed shots the camera plays in order. Each shot:
   *    { day, hold, cam:{lng,lat,dist,az,el,orbit}, title_zh, title_en, dateLabel,
   *      narration_zh?, narration_en?, side?, focus?:[unit ids], commanders?:[{zh,en}] } */
  const storyboard = [
    { day:1, hold:8, cam:{lng:9.05, lat:44.36, dist:1800, az:0, el:48, orbit:0.8},
      title_zh:"The Approach", title_en:"The Approach", dateLabel:"DAY 1",
      narration_zh:"Blue Force advances from the south.", narration_en:"Blue Force advances from the south.",
      side:"blue", focus:["blue_1"] },
    { day:2, hold:9, cam:{lng:9.08, lat:44.385, dist:1200, az:200, el:46, orbit:0.8},
      title_zh:"The Clash", title_en:"The Clash", dateLabel:"DAY 2",
      narration_zh:"The two forces meet at Hill 100.", narration_en:"The two forces meet at Hill 100.",
      side:"both", focus:["blue_1","red_1"] },
  ];

  /* -- notes: REQUIRED. summary + caveats[] + sources. sources MUST be non-empty —
   *    the engine refuses to boot without it, because history must be sourced, not invented. */
  const notes = {
    summary:"This is example template data, not a real battle. Replace it with your researched scenario.",
    caveats:[ "All units, movements and events here are placeholders for the template.",
              "If you use present-day satellite imagery, disclose it (coastlines/terrain may have changed)." ],
    sources:"EXAMPLE DATA — no sources (this is a template skeleton). Replace with your real, cited sources before publishing.",
  };

  return { meta, factions, intro, outro, flagLegend, geography, units, arrows, fronts, weather, hotspots, storyboard, notes };
})();
