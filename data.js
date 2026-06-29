/* =====================================================================
 *  data.js: 所羅門攻略戰 · BATTLE OF SOLOMON (U.C. 0079).
 *  A self-playing 3D documentary.
 *  ---------------------------------------------------------------------
 *  A FICTIONAL space battle from "Mobile Suit Gundam" (機動戰士高達,
 *  Sunrise, 1979), set in late November U.C. 0079, during the One Year
 *  War. The Earth Federation Forces, under General Revil, assault the
 *  Principality of Zeon's space fortress Solomon in the Side 5 asteroid
 *  belt. The Solar System weapon obliterates Zeon's outer perimeter;
 *  Vice Admiral Dozle Zabi dies in the Big Zam; Solomon falls.
 *
 *  The map uses deep Pacific coordinates as an engine anchor. Under
 *  Space Trick mode the terrain is invisible — the result reads as
 *  space. Coordinates are a rendering anchor only, not real locations.
 *
 *  Faithfulness over invention: every depicted force, commander and beat
 *  traces to the cited Gundam canon (see notes.sources). Canon-confidence
 *  chips in narration_en disclose adaptation variants and supplements.
 *  The engine is never edited.
 *
 *  Bilingual slots: `_zh` = Traditional Chinese (primary), `_en` = English.
 * ===================================================================== */
window.BATTLE_DATA = (function () {

  const factions = {
    eff:  { main:0x3b6fd8, glow:0x6f9bff, dim:0x1f3a78, css:"#3b6fd8", name_zh:"地球聯邦軍", name_en:"Earth Federation Forces", role:"attacker", maxStrength:3000, defaultFlag:"eff" },
    zeon: { main:0xcf2a2a, glow:0xff6a55, dim:0x7a1717, css:"#cf2a2a", name_zh:"自護公國軍", name_en:"Principality of Zeon",     role:"defender",  maxStrength:3000, defaultFlag:"zeon" },
  };

  /* Deep Pacific (175–178°E, 2–5°S) — all-black under Space Trick. */
  const meta = {
    geo:{ minLng:175.0, maxLng:178.0, minLat:-5.0, maxLat:-2.0, Z:6 },
    dayMin:1, dayMax:10.9, year:79, month:11, lastDay:10,
    vexag:2.0,
    title:"所羅門攻略戰", subtitle:"機動戰士高達 · 一年戰爭 · Battle of Solomon · U.C.0079.11",
    theme:{
      grade:{ vignette:0.05, grain:0.0, brightness:0.4, filter:"contrast(1.2)" },
      sky:{ day:"#000005", night:"#000000" },
      sea:"#000000",
      fog:0.00001,
    },
  };

  const ui = {
    boot:{ dem:"載入星域空間…", imagery:"載入宇宙圖層…", terrain:"建構戰場…", music:"載入配樂…", starting:"啟動中…" },
    frontLine:{ zh:"戰線", en:"Battle line" },
    strengthUnit:"", endLabel:"終", sceneLabel:"U.C.00{year}.{month}",
    notesCaveatsHeader:"說明與限制 Caveats", notesSourcesHeader:"資料來源 Sources",
    langToggle:{ both:"中·EN", zh:"中", en:"EN" },
    notesBtn:"ⓘ 註記 Notes", notesHeader:"註記與資料來源 NOTES & SOURCES", resume:"▶ 繼續導覽 Resume",
    hint:{ autoplay:"自動播放中 Auto-playing", drag:"拖曳可自由視角（會暫停導覽）Drag to free-look" },
    legend:{ symbolsHeader:"圖例 Symbols", flagsHeader:"勢力旗幟 Flags",
      advance:"進攻 Advance", hq:"司令部 HQ", infantry:"機動戰士 Mobile Suit", air:"高速機動 High-speed", navy:"主力艦 Capital ships", artillery:"遠程火力 Long-range",
      contact:"接敵 In contact", strength:"戰力 Strength",
      movement:"移動 Movement", combat:"交戰・火力 Combat", lost:"損失・撤退 Lost" },
    disclaimer:"虛構宇宙戰役（機動戰士高達, U.C.0079），依原作設定重現。此為一九七九年動畫之愛好者致敬作品，與任何真實事件毫無關聯。"
      +"<br>Fictional space battle (Mobile Suit Gundam, U.C. 0079) reconstructed from canon. A fan tribute to a 1979 anime — not a depiction of any real-world event."
      +"<br>地形底圖 Imagery © EOX Sentinel-2 cloudless 2016 (CC BY 4.0, s2maps.eu) · 高程 Elevation SRTM courtesy USGS",
  };

  const intro = {
    title_zh:"所羅門攻略戰", title_en:"Battle of Solomon",
    sub_zh:"機動戰士高達 · 一年戰爭 · U.C.0079.11 · 下旬", sub_en:"Mobile Suit Gundam · One Year War · U.C. 0079",
    cam:{ lng:176.5, lat:-3.5, dist:3000, az:0, el:55 },
  };

  const outro = {
    title_zh:"所羅門陷落", title_en:"Solomon Falls",
    narration_zh:"所羅門陷落，改名コンペイトウ（金平糖），成為聯邦最終決戰前進基地。道森・ザビ英勇捐軀，一年戰爭進入最後倒數——A Baoa Qu 之戰，即將開始。",
    narration_en:"Solomon falls and is renamed Conpeito. The Earth Federation makes it their final staging base. Dozle Zabi dies in glory. The One Year War counts down to its end — A Baoa Qu awaits.",
    cam:{ lng:176.5, lat:-3.5, dist:3200, az:0, el:50, orbit:0.8, tween:3.6 },
  };

  const flagLegend = [
    { flag:"eff",  zh:"地球聯邦軍", en:"Earth Federation Forces", faction:"eff"  },
    { flag:"zeon", zh:"自護公國軍", en:"Principality of Zeon",     faction:"zeon" },
  ];

  const geography = {
    regions:[
      { name_zh:"宇宙虛空", name_en:"The Void", type:"region", lng:176.0, lat:-2.5 },
    ],
    points:[
      { name_zh:"所羅門要塞", name_en:"Solomon Fortress", type:"fort", lng:176.5, lat:-3.5 },
      { name_zh:"太陽系統", name_en:"Solar System Array", type:"fort", lng:177.7, lat:-2.4 },
    ],
    lines:[
      { name_zh:"吉翁初始防禦圈", name_en:"Zeon defence perimeter", color:"#cf2a2a",
        path:[[176.1,-3.0],[176.5,-2.7],[176.9,-3.0],[177.2,-3.5],[176.9,-4.0],[176.5,-4.3],[176.1,-4.0],[175.8,-3.5],[176.1,-3.0]] },
    ],
  };

  const units = [

    // ---- PRINCIPALITY OF ZEON (defender, red) ----

    { id:"zeon_solomon", faction:"zeon", kind:"command", flag:"zeon", cf:false,
      name_zh:"所羅門要塞（道森・ザビ 中將）", name_en:"Solomon Fortress — V.Adm. Dozle Zabi",
      type:"Space fortress",
      track:[ {d:1.0, lng:176.5, lat:-3.5, s:3000, st:"hold"} ] },

    { id:"zeon_patrol_ms", faction:"zeon", kind:"air", flag:"zeon", cf:true,
      name_zh:"吉翁巡邏 MS 隊", name_en:"Zeon patrol MS",
      type:"Mobile Suit patrol",
      track:[ {d:1.0, lng:176.8, lat:-3.2, s:800, st:"hold"},
              {d:1.4, lng:176.2, lat:-3.8, s:800, st:"hold"},
              {d:1.8, lng:176.5, lat:-3.2, s:800, st:"hold"} ] },

    { id:"zeon_sentry", faction:"zeon", kind:"air", flag:"zeon", cf:true,
      name_zh:"吉翁外圈警戒線", name_en:"Zeon outer perimeter watch",
      type:"Early-warning MS",
      track:[ {d:2.0, lng:176.9, lat:-3.5, s:400, st:"hold"},
              {d:2.5, lng:177.1, lat:-3.5, s:400, st:"hold"},
              {d:3.0, lng:177.1, lat:-3.5, s:200, st:"retreat"} ] },

    { id:"zeon_east_ms", faction:"zeon", kind:"air", flag:"zeon", cf:true,
      name_zh:"東圈 MS 迎擊隊", name_en:"East-ring MS intercept",
      type:"Mobile Suit",
      track:[ {d:2.0, lng:177.0, lat:-3.5, s:900, st:"hold"},
              {d:3.0, lng:177.2, lat:-3.5, s:900, st:"attack"},
              {d:4.0, lng:177.1, lat:-3.3, s:800, st:"attack"},
              {d:6.1, lng:177.1, lat:-3.3, s:0,   st:"dead"} ] },

    { id:"zeon_north_ms", faction:"zeon", kind:"air", flag:"zeon", cf:true,
      name_zh:"北圈 MS 迎擊隊", name_en:"North-ring MS intercept",
      type:"Mobile Suit",
      track:[ {d:3.5, lng:176.5, lat:-2.8, s:800, st:"hold"},
              {d:4.0, lng:176.7, lat:-3.0, s:800, st:"attack"},
              {d:6.3, lng:176.7, lat:-2.9, s:0,   st:"dead"} ] },

    { id:"zeon_south_ms", faction:"zeon", kind:"air", flag:"zeon", cf:true,
      name_zh:"南圈 MS 迎擊隊", name_en:"South-ring MS intercept",
      type:"Mobile Suit",
      track:[ {d:3.5, lng:176.5, lat:-4.2, s:800, st:"hold"},
              {d:4.0, lng:176.3, lat:-4.0, s:800, st:"attack"},
              {d:6.6, lng:176.3, lat:-4.1, s:0,   st:"dead"} ] },

    { id:"zeon_remnant_ms", faction:"zeon", kind:"air", flag:"zeon", cf:true,
      name_zh:"吉翁殘兵 MS", name_en:"Zeon remnant MS",
      type:"Mobile Suit",
      track:[ {d:5.0, lng:176.9, lat:-3.5, s:500, st:"hold"},
              {d:7.0, lng:176.6, lat:-3.5, s:400, st:"retreat"} ] },

    { id:"zeon_remnant_fleet", faction:"zeon", kind:"navy", flag:"zeon", cf:true,
      name_zh:"吉翁殘存艦隊", name_en:"Zeon remnant fleet",
      type:"Warships",
      track:[ {d:5.0, lng:176.8, lat:-3.6, s:600, st:"hold"},
              {d:7.0, lng:176.6, lat:-3.6, s:500, st:"retreat"} ] },

    { id:"zeon_guard_ms", faction:"zeon", kind:"air", flag:"zeon", cf:true,
      name_zh:"要塞守備 MS", name_en:"Fortress guard MS",
      type:"Mobile Suit",
      track:[ {d:8.0, lng:176.6, lat:-3.4, s:400, st:"hold"},
              {d:8.5, lng:176.6, lat:-3.5, s:400, st:"hold"} ] },

    /* Elmeth — high-speed arc, then st:dead (Lalah killed — CANON) */
    { id:"zeon_elmeth", faction:"zeon", kind:"air", flag:"zeon", cf:true,
      name_zh:"Elmeth（拉拉蘇・阿斯納布爾）", name_en:"MAN-08 Elmeth — Lalah Sune",
      type:"Newtype-use mobile armour",
      track:[ {d:8.0, lng:176.3, lat:-3.2, s:600, st:"march"},
              {d:8.5, lng:177.3, lat:-2.6, s:0,   st:"dead"} ] },

    /* Big Zam: split into two objects per Notion spec.
       Object 1 — charge trajectory; Object 2 — stationary death. */
    { id:"zeon_big_zam_charge", faction:"zeon", kind:"command", flag:"zeon", cf:true,
      name_zh:"Big Zam（道森・ザビ 中將）", name_en:"MA-08 Big Zam — V.Adm. Dozle Zabi",
      type:"Mobile armour",
      track:[ {d:9.0, lng:176.5, lat:-3.4, s:1200, st:"march"},
              {d:9.6, lng:176.8, lat:-3.4, s:1200, st:"attack"} ] },

    { id:"zeon_big_zam_dead", faction:"zeon", kind:"command", flag:"zeon", cf:true,
      name_zh:"Big Zam 爆炸", name_en:"Big Zam — destroyed",
      type:"Mobile armour",
      track:[ {d:9.7, lng:176.9, lat:-3.4, s:0, st:"dead"} ] },

    { id:"zeon_retreat_a", faction:"zeon", kind:"navy", flag:"zeon", cf:true,
      name_zh:"吉翁撤退艦 A", name_en:"Zeon withdrawal A",
      type:"Zeon warship",
      track:[ {d:10.0, lng:176.6, lat:-3.5, s:300, st:"retreat"},
              {d:10.8, lng:175.4, lat:-4.7, s:300, st:"retreat"} ] },

    { id:"zeon_retreat_b", faction:"zeon", kind:"navy", flag:"zeon", cf:true,
      name_zh:"吉翁撤退艦 B", name_en:"Zeon withdrawal B",
      type:"Zeon warship",
      track:[ {d:10.0, lng:176.4, lat:-3.6, s:300, st:"retreat"},
              {d:10.8, lng:175.3, lat:-4.5, s:300, st:"retreat"} ] },

    // ---- EARTH FEDERATION FORCES (attacker, blue) ----

    { id:"eff_recon", faction:"eff", kind:"air", flag:"eff", cf:true,
      name_zh:"聯邦偵察機", name_en:"EFF recon craft",
      type:"Scout",
      track:[ {d:1.0, lng:177.6, lat:-2.4, s:200, st:"march"},
              {d:1.5, lng:175.4, lat:-4.6, s:200, st:"march"} ] },

    { id:"eff_fleet1", faction:"eff", kind:"navy", flag:"eff", cf:true,
      name_zh:"第一聯合艦隊", name_en:"1st Combined Fleet",
      type:"Federation capital ships",
      track:[ {d:2.0, lng:177.6, lat:-3.5, s:2800, st:"march"},
              {d:2.5, lng:177.0, lat:-3.5, s:2800, st:"hold"},
              {d:5.0, lng:177.0, lat:-3.5, s:2600, st:"hold"},
              {d:6.0, lng:177.0, lat:-3.5, s:2600, st:"march"},
              {d:6.5, lng:176.7, lat:-3.5, s:2400, st:"march"},
              {d:7.0, lng:176.4, lat:-3.5, s:2200, st:"attack"},
              {d:8.0, lng:176.35,lat:-3.5, s:2000, st:"hold"},
              {d:10.0,lng:176.3, lat:-3.5, s:1800, st:"hold"} ] },

    { id:"eff_fleet1_ms", faction:"eff", kind:"air", flag:"eff", cf:true,
      name_zh:"第一艦隊 MS 護航隊", name_en:"1st Fleet MS escort",
      type:"Mobile Suit",
      track:[ {d:2.0, lng:177.5, lat:-3.2, s:800, st:"march"},
              {d:2.5, lng:176.9, lat:-3.2, s:800, st:"hold"},
              {d:3.0, lng:176.9, lat:-3.3, s:800, st:"attack"},
              {d:7.0, lng:176.4, lat:-3.0, s:700, st:"attack"},
              {d:10.0,lng:176.5, lat:-3.3, s:600, st:"hold"} ] },

    { id:"eff_fleet2", faction:"eff", kind:"navy", flag:"eff", cf:true,
      name_zh:"第二聯合艦隊", name_en:"2nd Combined Fleet",
      type:"Federation capital ships",
      track:[ {d:2.0, lng:175.4, lat:-4.6, s:2200, st:"march"},
              {d:2.5, lng:176.0, lat:-4.0, s:2200, st:"hold"},
              {d:6.5, lng:176.2, lat:-3.8, s:2000, st:"march"},
              {d:7.0, lng:176.3, lat:-3.6, s:1800, st:"attack"},
              {d:8.0, lng:176.3, lat:-3.6, s:1600, st:"hold"},
              {d:10.0,lng:176.4, lat:-3.7, s:1400, st:"hold"} ] },

    { id:"eff_white_base", faction:"eff", kind:"command", flag:"eff", cf:true,
      name_zh:"白色基地（阿姆羅・雷）", name_en:"White Base — Amuro Ray",
      type:"SCV-70 assault carrier",
      track:[ {d:2.0, lng:175.5, lat:-4.3, s:900, st:"march"},
              {d:2.5, lng:176.1, lat:-3.8, s:900, st:"hold"},
              {d:7.0, lng:176.3, lat:-3.4, s:800, st:"march"},
              {d:8.0, lng:176.3, lat:-3.4, s:800, st:"hold"} ] },

    { id:"eff_solar_system", faction:"eff", kind:"artillery", flag:"eff", cf:true,
      name_zh:"太陽系統（Solar System）", name_en:"Solar System reflector array",
      type:"Mega-particle beam system",
      track:[ {d:5.0, lng:177.7, lat:-2.4, s:500, st:"hold"},
              {d:6.9, lng:177.7, lat:-2.4, s:500, st:"hold"} ] },

    { id:"eff_gundam", faction:"eff", kind:"air", flag:"eff", cf:true,
      name_zh:"高達（阿姆羅・雷）", name_en:"RX-78-2 Gundam — Amuro Ray",
      type:"Mobile Suit",
      track:[ {d:8.0, lng:176.5, lat:-3.0, s:700, st:"march"},
              {d:8.4, lng:177.0, lat:-2.8, s:700, st:"attack"} ] },

    { id:"eff_vanguard_a", faction:"eff", kind:"navy", flag:"eff", cf:true,
      name_zh:"聯邦前鋒艦 A", name_en:"EFF vanguard A",
      type:"Federation warship",
      track:[ {d:8.5, lng:176.6, lat:-3.4, s:600, st:"hold"},
              {d:9.2, lng:176.6, lat:-3.4, s:0,   st:"dead"} ] },

    { id:"eff_vanguard_b", faction:"eff", kind:"navy", flag:"eff", cf:true,
      name_zh:"聯邦前鋒艦 B", name_en:"EFF vanguard B",
      type:"Federation warship",
      track:[ {d:8.5, lng:176.7, lat:-3.3, s:600, st:"hold"},
              {d:9.3, lng:176.7, lat:-3.3, s:0,   st:"dead"} ] },

    { id:"eff_ms_counter", faction:"eff", kind:"air", flag:"eff", cf:true,
      name_zh:"聯邦 MS 反擊隊", name_en:"EFF MS counter-attack",
      type:"Mobile Suit",
      track:[ {d:9.0, lng:176.7, lat:-3.2, s:600, st:"attack"},
              {d:9.5, lng:176.8, lat:-3.3, s:600, st:"attack"} ] },

    { id:"eff_ms_occupation", faction:"eff", kind:"air", flag:"eff", cf:true,
      name_zh:"聯邦佔領 MS 隊", name_en:"EFF occupation MS",
      type:"Mobile Suit",
      track:[ {d:10.0, lng:176.4, lat:-3.3, s:400, st:"hold"},
              {d:10.5, lng:176.5, lat:-3.3, s:400, st:"hold"} ] },

  ];

  const arrows = [
    { f:"eff",  from:[177.5,-3.5], to:[177.0,-3.5], d:2.0, kind:"attack",  label:"第一艦隊正面推進 1st Fleet advance" },
    { f:"eff",  from:[175.6,-4.4], to:[176.1,-3.8], d:2.0, kind:"attack",  label:"第二艦隊南翼包抄 2nd Fleet southern wing" },
    { f:"zeon", from:[176.5,-3.5], to:[177.1,-3.5], d:3.0, kind:"attack",  label:"東圈迎擊 East-ring intercept" },
    { f:"zeon", from:[176.5,-3.5], to:[176.7,-2.9], d:4.0, kind:"attack",  label:"北圈出擊 North-ring sortie" },
    { f:"zeon", from:[176.5,-3.5], to:[176.3,-4.1], d:4.0, kind:"attack",  label:"南圈出擊 South-ring sortie" },
    { f:"eff",  from:[177.7,-2.4], to:[177.1,-3.3], d:6.0, kind:"attack",  label:"太陽系統炮擊 Solar System volley" },
    { f:"eff",  from:[177.0,-3.5], to:[176.4,-3.5], d:7.0, kind:"attack",  label:"全面突破 Breakthrough" },
    { f:"zeon", from:[176.5,-3.4], to:[176.9,-3.4], d:9.0, kind:"attack",  label:"Big Zam 出擊 Big Zam sorties" },
    { f:"zeon", from:[176.5,-3.5], to:[175.5,-4.5], d:10.0, kind:"retreat", label:"吉翁殘軍撤退 Zeon withdrawal" },
  ];

  const fronts = [
    { d:1,  path:[[176.1,-3.0],[176.5,-2.7],[176.9,-3.0],[177.2,-3.5],[176.9,-4.0],[176.5,-4.3],[176.1,-4.0],[175.8,-3.5],[176.1,-3.0]] },
    { d:4,  path:[[176.2,-3.1],[176.6,-2.8],[177.0,-3.2],[177.2,-3.5],[177.0,-3.9],[176.6,-4.2],[176.2,-4.0],[175.9,-3.5],[176.2,-3.1]] },
    { d:7,  path:[[176.3,-3.2],[176.5,-3.0],[176.8,-3.2],[177.0,-3.5],[176.8,-3.9],[176.5,-4.1],[176.3,-3.9],[176.1,-3.5],[176.3,-3.2]] },
    { d:10, path:[[176.3,-3.3],[176.5,-3.1],[176.7,-3.3],[176.8,-3.5],[176.7,-3.7],[176.5,-3.9],[176.3,-3.7],[176.2,-3.5],[176.3,-3.3]] },
  ];

  const weather = [
    { d:1,  night:0.0, fog:0.0, rain:0.0, smoke:0.00, zh:"宇宙虛空",    en:"The void" },
    { d:4,  night:0.0, fog:0.0, rain:0.0, smoke:0.05, zh:"接戰煙塵",    en:"Contact smoke" },
    { d:6,  night:0.0, fog:0.0, rain:0.0, smoke:0.15, zh:"太陽系統炮火", en:"Solar System barrage" },
    { d:8,  night:0.0, fog:0.0, rain:0.0, smoke:0.10, zh:"激戰殘影",    en:"Battle haze" },
    { d:10, night:0.0, fog:0.0, rain:0.0, smoke:0.06, zh:"戰後虛空",    en:"Aftermath" },
  ];

  const hotspots = [
    { a:3.0, b:4.5, kind:"firefight",  lng:177.1, lat:-3.3, i:0.5 },
    { a:4.0, b:5.0, kind:"firefight",  lng:176.5, lat:-2.9, i:0.4 },
    { a:4.0, b:5.0, kind:"firefight",  lng:176.3, lat:-4.0, i:0.4 },
    { a:6.0, b:6.4, kind:"explosion",  lng:177.1, lat:-3.3, i:0.9 },
    { a:6.2, b:6.6, kind:"explosion",  lng:176.7, lat:-2.9, i:0.9 },
    { a:6.5, b:6.9, kind:"explosion",  lng:176.3, lat:-4.1, i:0.9 },
    { a:7.0, b:7.5, kind:"artillery",  lng:176.6, lat:-3.5, i:0.6 },
    { a:8.4, b:8.8, kind:"explosion",  lng:177.2, lat:-2.7, i:0.8 },
    { a:9.1, b:9.5, kind:"explosion",  lng:176.6, lat:-3.4, i:0.8 },
    { a:9.2, b:9.6, kind:"explosion",  lng:176.7, lat:-3.3, i:0.8 },
    { a:9.7, b:9.9, kind:"explosion",  lng:176.9, lat:-3.4, i:1.0 },
  ];

  const storyboard = [

    // S1 · 序幕 — 要塞的沉默 · hold:20s
    { day:1.0, hold:20, cam:{lng:176.5, lat:-3.5, dist:2400, az:5, el:55, orbit:0.6},
      title_zh:"序幕 — 要塞的沉默", title_en:"Prelude — The Silence of the Fortress",
      dateLabel:"U.C. 0079.11 · 下旬",
      narration_zh:"奧德薩之後，吉翁放棄地球，全面收縮宇宙防線。所羅門要塞——Side 5 小行星帶中的鋼鐵巨城——是最後一道防壁。道森・ザビ 中將鎮守此地，等待聯邦的鋼鐵洪流。",
      narration_en:'<span class="cc canon">CANON</span> After Odessa, Zeon abandons Earth and contracts to space. Solomon Fortress — the iron citadel in the Side 5 asteroid belt — stands as the last great bulwark. Vice Admiral Dozle Zabi holds the line, awaiting the Federation tide.',
      side:"zeon", focus:["zeon_solomon"], commanders:[{zh:"道森・ザビ 中將",en:"V.Adm. Dozle Zabi"}] },

    // S2 · 聯邦集結 · hold:18s
    { day:2.0, hold:18, cam:{lng:176.8, lat:-3.8, dist:2100, az:-18, el:48, orbit:0.7},
      title_zh:"聯邦集結", title_en:"The Federation Assembles",
      dateLabel:"U.C. 0079.11 · 下旬",
      narration_zh:"雷比爾將軍率第一、第二聯合艦隊從東南兩路逼近。白色基地隨第二艦隊南翼推進。道森警覺敵情，啟動要塞防禦配置。",
      narration_en:'<span class="cc canon">CANON</span> General Revil\'s 1st and 2nd Combined Fleets converge on two axes. White Base advances with the 2nd Fleet\'s southern wing. Dozle reads the approach and activates the fortress defence formation.',
      side:"eff", focus:["eff_fleet1","eff_fleet2","eff_white_base"], commanders:[{zh:"雷比爾將軍",en:"Gen. Revil"}] },

    // S3 · 第一波接觸 · hold:16s
    { day:3.0, hold:16, cam:{lng:177.0, lat:-3.4, dist:1200, az:30, el:42, orbit:0.9},
      title_zh:"第一波接觸", title_en:"First Contact",
      dateLabel:"U.C. 0079.11 · 下旬",
      narration_zh:"吉翁東圈 MS 部隊出擊迎擊聯邦前鋒。每一公里都要以機體換來——鋼鐵在虛空中燃燒。",
      narration_en:'<span class="cc canon">CANON</span> Zeon\'s east-ring MS forces sortie to intercept the Federation vanguard. Every kilometre is bought with Mobile Suits — steel burns in the void.',
      side:"zeon", focus:["zeon_east_ms","eff_fleet1_ms"], commanders:[] },

    // S4 · 防禦圈全面激活 · hold:16s
    { day:4.0, hold:16, cam:{lng:176.5, lat:-3.5, dist:1700, az:70, el:50, orbit:0.8},
      title_zh:"防禦圈全面激活", title_en:"Full Defence Perimeter Activated",
      dateLabel:"U.C. 0079.11 · 下旬",
      narration_zh:"道森下令全線出擊。北圈、東圈、南圈三路 MS 部隊同時輻射出擊，形成立體包圍網。聯邦艦隊正面承壓。",
      narration_en:'<span class="cc canon">CANON</span> Dozle orders a full-perimeter sortie. North, east and south MS rings radiate simultaneously — a three-dimensional encirclement. The Federation fleet faces pressure on all axes.',
      side:"zeon", focus:["zeon_north_ms","zeon_east_ms","zeon_south_ms"], commanders:[{zh:"道森・ザビ 中將",en:"V.Adm. Dozle Zabi"}] },

    // S5 · 太陽系統展開 · hold:15s
    { day:5.0, hold:15, cam:{lng:177.5, lat:-2.7, dist:1500, az:-15, el:44, orbit:0.7},
      title_zh:"太陽系統展開", title_en:"Solar System Deploys",
      dateLabel:"U.C. 0079.11 · 下旬",
      narration_zh:"聯邦秘密武器——太陽系統超大型反射砲陣列——緩緩展開就位。艦隊後退讓路。吉翁的末日，在光速之中悄然到來。",
      narration_en:'<span class="cc canon">CANON</span> The Federation\'s secret weapon — the Solar System mega-particle reflector array — deploys into position. Federation fleets step back to clear the field of fire. Zeon\'s reckoning arrives at the speed of light.',
      side:"eff", focus:["eff_solar_system","eff_fleet1"], commanders:[] },

    // S6 · 太陽系統發動 · hold:22s
    { day:6.0, hold:22, cam:{lng:177.0, lat:-3.1, dist:1100, az:10, el:40, orbit:1.2},
      title_zh:"太陽系統發動", title_en:"Solar System Fires",
      dateLabel:"U.C. 0079.11 · 下旬",
      narration_zh:"反射砲陣列對準所羅門外圈——一擊。光束橫掃：東圈 MS 先蒸發，北圈次之，南圈再次。吉翁三道防禦圈，瓦解於一瞬之間。聯邦艦隊乘勢急推。",
      narration_en:'<span class="cc canon">CANON</span> The reflector array locks onto Solomon\'s outer perimeter — one shot. The beam sweeps: east-ring first, north-ring second, south-ring third. All three Zeon defence rings evaporate in a single instant. The Federation fleet surges forward.',
      side:"eff", focus:["eff_solar_system","zeon_east_ms","zeon_north_ms","zeon_south_ms"], commanders:[] },

    // S7 · 防線崩潰突破 · hold:16s
    { day:7.0, hold:16, cam:{lng:176.5, lat:-3.5, dist:1000, az:50, el:38, orbit:1.0},
      title_zh:"防線崩潰突破", title_en:"Defence Line Collapses",
      dateLabel:"U.C. 0079.11 · 下旬",
      narration_zh:"外圈盡失，聯邦全線衝入。第一艦隊正面突破，第二艦隊南翼包抄，白色基地衝入要塞側翼。吉翁殘兵節節後退，收縮至所羅門核心。",
      narration_en:'<span class="cc canon">CANON</span> The outer ring gone, the Federation surges inward on all axes. 1st Fleet breaks the centre; 2nd Fleet flanks from the south; White Base drives into the fortress perimeter. Zeon\'s survivors contract toward Solomon\'s core.',
      side:"eff", focus:["eff_fleet1","eff_fleet2","eff_white_base","zeon_remnant_ms"], commanders:[{zh:"雷比爾將軍",en:"Gen. Revil"}] },

    // S8 · Elmeth 出擊與殞落 · hold:25s
    { day:8.0, hold:25, cam:{lng:176.8, lat:-2.9, dist:800, az:140, el:34, orbit:1.5},
      title_zh:"Elmeth 出擊與殞落", title_en:"Elmeth Sorties — and Falls",
      dateLabel:"U.C. 0079.11 · 下旬",
      narration_zh:"夏亞命拉拉蘇駕駛試驗型 Elmeth 出擊，以新人類感應攻擊聯邦艦隊。阿姆羅的高達截擊——兩個新人類的感應在虛空中交錯。拉拉蘇陣亡。所羅門的棋局，已成定局。",
      narration_en:'<span class="cc canon">CANON</span> Char deploys Lalah Sune in the experimental Elmeth, using Newtype telepathy against the Federation fleet. Amuro\'s Gundam intercepts — two Newtype presences cross in the void. <span class="cc variant">VARIANT</span> Lalah is killed. The outcome at Solomon is sealed.',
      side:"zeon", focus:["zeon_elmeth","eff_gundam"], commanders:[{zh:"夏亞・アズナブル",en:"Char Aznable"},{zh:"拉拉蘇・阿斯納布爾",en:"Lalah Sune"}] },

    // S9 · ドズル最後一戰 · hold:20s
    { day:9.0, hold:20, cam:{lng:176.7, lat:-3.4, dist:600, az:180, el:32, orbit:1.6},
      title_zh:"ドズル最後一戰", title_en:"Dozle's Last Stand",
      dateLabel:"U.C. 0079.11 · 下旬",
      narration_zh:"道森・ザビ 中將親自乘坐 Big Zam——宇宙最強巨型機動裝甲——衝出要塞，以一己之力壓制聯邦艦隊，掩護所羅門撤退。聯邦前鋒艦接連撃沉。最終，Big Zam 爆炸，道森壯烈戰死。",
      narration_en:'<span class="cc canon">CANON</span> Dozle Zabi himself pilots the MA-08 Big Zam — the most powerful mobile armour in space — out of Solomon to hold back the Federation fleet alone and cover the withdrawal. Federation vanguard ships fall one by one. Then Big Zam explodes. Dozle Zabi dies at his post.',
      side:"zeon", focus:["zeon_big_zam_charge","eff_vanguard_a","eff_vanguard_b"], commanders:[{zh:"道森・ザビ 中將",en:"V.Adm. Dozle Zabi"}] },

    // S10 · 所羅門陷落 · hold:18s
    { day:10.0, hold:18, cam:{lng:176.5, lat:-3.5, dist:2300, az:10, el:52, orbit:0.7},
      title_zh:"所羅門陷落", title_en:"Solomon Falls",
      dateLabel:"U.C. 0079.11 · 下旬",
      narration_zh:"所羅門陷落。地球聯邦旗升起，要塞改名コンペイトウ（金平糖），成為聯邦最終決戰前進基地。吉翁殘艦在暗夜中消散——一年戰爭，進入最後倒數。",
      narration_en:'<span class="cc canon">CANON</span> Solomon falls. The Earth Federation flag rises. The fortress is renamed Conpeito and becomes the Federation\'s final advance base for the last battle. Zeon\'s survivors scatter into the dark. The One Year War enters its final countdown.',
      side:"eff", focus:["zeon_solomon","eff_fleet1","eff_fleet2","eff_ms_occupation"], commanders:[{zh:"雷比爾將軍",en:"Gen. Revil"}] },

  ];

  const notes = {
    summary:"「所羅門攻略戰（Battle of Solomon）」是動畫《機動戰士高達》（Sunrise, 1979）中的虛構宇宙戰役，發生於宇宙世紀（U.C.）0079年11月下旬一年戰爭期間。"
      +"地球聯邦軍在雷比爾將軍率領下，對自護公國軍宇宙要塞所羅門（Side 5 小行星帶）發動大規模攻略作戰。"
      +"聯邦投入秘密武器太陽系統一擊蒸發大量吉翁戰力；道森提督以 Big Zam 力戰陣亡；所羅門陷落，改名コンペイトウ，成為聯邦最終決戰基地。"
      +" The 'Battle of Solomon' is a fictional space engagement from Mobile Suit Gundam (Sunrise, 1979)."
      +" The Earth Federation under General Revil assaults Solomon Fortress. The Solar System weapon devastates Zeon's outer perimeter; Dozle Zabi dies heroically in the Big Zam; Solomon falls and becomes Federation base Conpeito.",
    caveats:[
      "虛構宇宙戰役：所有部隊、事件與人物均出自《機動戰士高達》（Sunrise, 1979），並非真實歷史。 Fictional space battle: all forces, events and characters are from Mobile Suit Gundam (Sunrise, 1979).",
      "地圖以太平洋深海（西太平洋，約 175–178°E、2–5°S）為工程坐標基底，在 Space Trick 模式下地形全黑，視覺上呈現宇宙虛空。坐標僅為引擎渲染所需，不代表任何真實地點。 Map uses deep Pacific coordinates as an engine anchor. Under Space Trick mode terrain is invisible; the visual reads as deep space. Coordinates are a rendering anchor only, not real locations.",
      "所羅門要塞的確切規模與內部結構，各媒體設定有出入，本片採TV動畫主線設定。 The scale and layout of Solomon Fortress vary across adaptations; this production follows TV series canon.",
      "太陽系統的射程、陣列規模及操作細節，TV動畫與後繼媒體描繪不同，本片以TV為準並標記CANON。 Solar System details differ across media; TV version followed, tagged CANON.",
      "拉拉蘇・阿斯納布爾之死及 Elmeth 細節，在TV動畫、劇場版及《THE ORIGIN》間各有不同描繪，以VARIANT標記。 Lalah's death and Elmeth details vary across TV, movies and The Origin — tagged VARIANT.",
      "Big Zam 的戰鬥細節（擊沉艦數等）依TV動畫，設定資料集數字有出入，標記CANON/SUPP。 Big Zam battle details follow TV canon; guidebook figures vary — tagged accordingly.",
      "旗幟為虛構徽記（自護紅底金徽；聯邦藍底金徽），皆非任何真實世界的違禁標誌。 Emblems are fictional insignia; neither resembles any real-world prohibited symbol.",
    ],
    sources:"主要依據 Primary canon: 《機動戰士高達》電視動畫（日本播映第36–37話前後所羅門攻略戰段落，Sunrise, 1979）。"
      +" Other canon: 《機動戰士高達 THE ORIGIN》漫畫/OVA（Yasuhiko, Sunrise）；《機動戰士高達 MS IGLOO》OVA。"
      +" References: Gundam Wiki (Battle of Solomon, Solomon Fortress, Dozle Zabi, Big Zam, Solar System, Lalah Sune, MAN-08 Elmeth, White Base, Char Aznable, Amuro Ray); Wikipedia (Mobile Suit Gundam, One Year War)."
      +" Imagery: Sentinel-2 cloudless 2016 © EOX IT Services GmbH (s2maps.eu, CC BY 4.0, modified Copernicus Sentinel data). Terrain: AWS Terrain Tiles (Mapzen Terrarium / SRTM, courtesy USGS).",
  };

  return { meta, factions, ui, intro, outro, flagLegend, geography, units, arrows, fronts, weather, hotspots, storyboard, notes };
})();
