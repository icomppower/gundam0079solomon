// 所羅門攻略戰 v2 — act data.
// World: metres, Y up, Solomon at the origin (R ≈ 1000, horns to ≈ 1700).
// Our ship (the fictional Federation cruiser 蒼鷺 Grey Heron) approaches from +Z.
// Each act: our ship moves along `path` over its duration D = hold + 2.4 s (same 3:30 total as v1,
// so the music still lines up). Everything inside an act is a pure function of act time,
// which is what makes the scrubber work.
// comms rows: [act time s, speaker, 中文, English, voice role, radio?]. Voice file = audio/<lang>/solomon/s<act>_<row>_<role>.wav
// (row = 1-based position in the act, time order). radio = 1 adds the band-pass radio filter in code.

export const SHIP_NAME = { zh: '蒼鷺號', en: 'Grey Heron' };

export const SUN_DIR = [0.75, 0.35, 0.55];          // direction TO the sun (normalised at runtime)
export const MIRROR_CENTER = [3000, 1100, 2400];     // Solar System mirror field centre (≈33° to starboard of the view in S5/S6)
export const MIRROR_RADIUS = 1800;
export const DUEL_CENTER = [-5200, 1400, 400];       // S8: the distant duel, seen to port

// Companion ships in our formation: offsets from our position (world axes), hull type.
// Most sit ahead of us so they show in both the bridge window and the chase view.
export const COMPANIONS = [
  [-420, 60, -200, 'eff_cruiser'],      // 0 — wingman, hit in S4
  [600, -90, -150, 'eff_cruiser'],
  [-900, -160, -700, 'eff_cruiser'],
  [650, 140, -500, 'eff_cruiser'],      // 3 — sunk by the mobile armour in S9
  [250, 280, -1150, 'eff_cruiser'],
  [-1150, 40, -1150, 'eff_battleship'], // 5+ always present
  [1250, -220, -1500, 'eff_cruiser'],
  [-250, -320, -2100, 'eff_cruiser'],
  [950, 320, -2500, 'eff_battleship'],
  [-1900, 220, -2700, 'eff_cruiser'],
];

// Our mobile suit squad: formation slots in Grey Heron's local frame (x port, y up, z forward; bow ≈ z +122).
export const ESCORT_SLOTS = [
  [80, 40, 230], [-80, 40, 230], [150, -10, 160], [-150, 20, 105], [46, 75, 60], [-115, 85, 5],
];
export const ESCORT_LOST = { act: 3, at: 11.2, index: 3 };   // S4: one escort is shot down

// Zeon mobile suit strafing runs past our ship: act index -> { t0, t1, n, kills (indices shot down), seed }
export const RAIDS = {
  2: { t0: 8.5, t1: 16, n: 3, kills: [0, 2], seed: 31 },
  3: { t0: 0.8, t1: 15.5, n: 5, kills: [0, 1, 3], seed: 41 },
  6: { t0: 2.5, t1: 16, n: 4, kills: [1, 2, 3], seed: 71 },
};

export const ACTS = [
  { id: 'S1', title: '序幕 — 要塞的沉默', en: 'Prologue — The Silent Fortress', hold: 20, cc: ['CANON'],
    narr: '奧德薩之後，吉翁全面收縮至宇宙；所羅門是本土之前最後的防線之一。聯邦艦隊集結，矛頭直指要塞。',
    narrEn: 'After Odessa, Zeon pulled back into space. Solomon is one of the last lines before its homeland. The Federation fleet gathers.',
    path: [[600, 420, 26000], [520, 380, 24400]],
    comms: [
      [2.0, '航海', '主引擎停止，慣性航行中。', 'Main engines off. Coasting.', 'helm'],   // new
      [6.0, '通訊', '第二聯合艦隊各艦，維持無線電靜默。', 'All ships, Second Combined Fleet — maintain radio silence.', 'comms'],
      [9.0, '火控', '主砲保險，鎖定。', 'Main guns — safeties on.', 'fire'],   // new
      [12.5, '觀測', '所羅門，距離兩萬六千。沒有動靜。', 'Solomon, range twenty-six thousand. No movement.', 'sensors'],
      [15.0, '通訊', '旗艦信號：保持現位，等待命令。', 'Flagship signals: hold position, await orders.', 'comms'],   // new
      [18.0, '艦長', '……太安靜了。', '…Too quiet.', 'captain'],
    ] },
  { id: 'S2', title: '聯邦集結', en: 'The Federation Gathers', hold: 18, cc: ['CANON', 'VARIANT'],
    narr: '第一、第二聯合艦隊兩翼逼近，白色基地隨隊推進；道森提督啟動所羅門的防禦配置。',
    narrEn: 'Two combined fleets close in on both flanks, White Base among them. Dozle Zabi brings Solomon’s defences up.',
    path: [[2400, 300, 19000], [2100, 250, 15400]], alertFrom: 15.5,
    comms: [
      [1.5, '司令部', '全艦隊，開始推進。', 'All ships — begin the advance.', 'hq', 1],   // new
      [5.0, '航海', '第一聯合艦隊已就位，右舷。', 'First Combined Fleet in position, starboard.', 'helm'],
      [7.5, '觀測', '要塞表面有熱源……砲台在預熱。', 'Heat on the fortress surface… their batteries are warming up.', 'sensors'],   // new
      [10.0, '通訊', '白色基地確認，加入編隊。', 'White Base confirms. Joining formation.', 'comms'],
      [12.5, '航海', '航速維持第三戰速。', 'Holding battle speed three.', 'helm'],   // new
      [15.5, '艦長', '全艦，第一戰鬥配置。', 'All hands — battle stations.', 'captain'],
    ] },
  { id: 'S3', title: '第一波接觸', en: 'First Contact', hold: 16, cc: ['CANON', 'SUPP'],
    narr: '吉翁 MS 由要塞東、北面出擊，聯邦前鋒接敵，首批交火爆發。',
    narrEn: 'Zeon mobile suits launch from the east and north faces. The Federation vanguard engages.',
    path: [[2000, 200, 13000], [1800, 180, 10400]], alert: true,
    comms: [
      [0.4, '甲板', 'MS 隊，彈射出擊！', 'Mobile suit team — launch!', 'deck'],
      [4.2, '觀測', '要塞東面，敵 MS 出擊！數量很多！', 'Enemy mobile suits launching, east face — a lot of them!', 'sensors'],
      [6.5, 'MS隊長', '蒼鷺隊，散開！不要靠近要塞砲台！', 'Heron team, spread out! Stay clear of the fortress guns!', 'msleader', 1],   // new
      [9.0, '通訊', '前鋒接敵——', 'Vanguard engaging—', 'comms'],
      [11.2, 'MS隊長', '擊墜一架！下一個——', 'One down! Next—', 'msleader', 1],   // new
      [13.5, '火控', '主砲，自由射擊。', 'Main guns, fire at will.', 'fire'],
    ] },
  { id: 'S4', title: '防禦圈全面激活', en: 'The Defence Ring Ignites', hold: 16, cc: ['CANON'],
    narr: '南圈 MS 加入，多層防禦圈成形；要塞砲火全開，兩翼艦隊頂住壓力推進。',
    narrEn: 'The southern ring joins. Every layer of the defence is up, and the fortress guns open fire.',
    path: [[1600, 100, 8800], [1500, 60, 7200]], alert: true, hitAt: 9.4,
    comms: [
      [3.0, '觀測', '南面也有反應——防禦圈全開！', 'Contacts south too — the whole ring is up!', 'sensors'],
      [6.0, '火控', '對空砲火跟不上！數量太多了！', 'Flak can’t keep up — too many of them!', 'fire'],   // new
      [9.8, '損管', '左舷中彈！僚艦起火！', 'Hit to port! Our wingman’s burning!', 'damage'],
      [12.0, '損管', '滅火班，左舷第三區！', 'Fire team to port section three!', 'damage'],   // new
      [14.5, '艦長', '穩住。不准脫隊。', 'Steady. Hold formation.', 'captain'],
    ] },
  { id: 'S5', title: '太陽系統展開', en: 'The Solar System Unfolds', hold: 15, cc: ['CANON'],
    narr: '聯邦巨型反射鏡陣列「太陽系統」於右舷高側展開，數千面鏡子開始聚焦。戰場短暫靜默。',
    narrEn: 'Off the starboard bow, thousands of mirrors of the “Solar System” array unfold and begin to focus. The battle goes quiet.',
    path: [[1500, 60, 7000], [1480, 60, 6900]], alert: true,
    comms: [
      [3.0, '通訊', '太陽系統，展開完畢。', 'Solar System deployment complete.', 'comms'],
      [8.0, '通訊', '全艦隊退出射線。重複，退出射線。', 'All ships, clear the firing line. Repeat, clear the line.', 'comms'],
      [10.5, '觀測', '……敵軍砲火，停了。', '…Enemy fire has stopped.', 'sensors'],   // new
      [13.5, '艦長', '……要來了。', '…Here it comes.', 'captain'],
    ] },
  { id: 'S6', title: '太陽系統發動', en: 'The Solar System Fires', hold: 22, cc: ['CANON'],
    narr: '鏡陣聚焦的陽光掃過要塞表面，外圈吉翁 MS 由外至內逐批蒸發；防線在數秒間崩潰。',
    narrEn: 'Focused sunlight sweeps the fortress face. The outer Zeon ring burns away from the outside in.',
    path: [[1480, 60, 6900], [1450, 60, 6800]], alert: true, fireAt: 4.0,
    comms: [
      [1.2, '通訊', '三、二、一——', 'Three, two, one—', 'comms'],
      [6.5, '損管', '光學感應器過載！外部影像中斷！', 'Optical sensors overloaded — external feed down!', 'damage'],   // new
      [10.0, '觀測', '……要塞表面溫度，超出量程。', '…Fortress surface temperature — off the scale.', 'sensors'],
      [12.5, '通訊', '……各艦，報告狀況。', '…All ships, report status.', 'comms'],   // new
      [15.0, '觀測', '敵 MS 反應……大批消失。', 'Enemy mobile suit signals… vanishing.', 'sensors'],
      [20.0, '艦長', '……記住這一刻。', '…Remember this moment.', 'captain'],
    ] },
  { id: 'S7', title: '防線崩潰突破', en: 'Breakthrough', hold: 16, cc: ['CANON'],
    narr: '聯邦乘勢突入要塞外圍，白色基地衝向側翼，吉翁殘部後退收縮。',
    narrEn: 'The Federation drives into the outer perimeter. Zeon’s survivors fall back on the fortress.',
    path: [[1400, 80, 6000], [700, 40, 3000]], alert: true,
    comms: [
      [2.5, '艦長', '全速前進。突入！', 'Full ahead. Go in!', 'captain'],
      [5.5, 'MS隊長', '蒼鷺隊，跟上！掩護艦隊突入！', 'Heron team, with me! Cover the fleet going in!', 'msleader', 1],   // new
      [8.5, '航海', '距離三千……兩千五……', 'Range three thousand… twenty-five hundred…', 'helm'],
      [11.0, '火控', '前方殘骸！副砲清路！', 'Debris ahead! Secondary guns, clear a path!', 'fire'],   // new
      [13.5, '觀測', '吉翁殘部向要塞收縮。', 'Zeon remnants pulling back to the fortress.', 'sensors'],
    ] },
  { id: 'S8', title: 'Elmeth 出擊與殞落', en: 'The Elmeth', hold: 25, cc: ['VARIANT'],
    narr: '左舷遠方，兩道高速光痕纏鬥：拉拉蘇的 Elmeth 與鋼彈。（時間線壓縮：此戰史實發生於要塞陷落之後。）',
    narrEn: 'Far to port, two fast lights duel: Lalah’s Elmeth and the Gundam. (Timeline compressed: this happened after Solomon fell.)',
    path: [[900, 350, 2900], [820, 330, 2700]], alert: true, flashAt: 18.0,
    comms: [
      [4.0, '觀測', '左舷遠方，高速反應兩個……在纏鬥。', 'Far to port — two fast signals. Dogfighting.', 'sensors'],
      [7.5, 'MS隊長', '有東西在打我們——看不見從哪裡來！', 'Something’s hitting us — I can’t see where from!', 'msleader', 1],   // new
      [11.0, '通訊', '無法識別。太快了。', 'Can’t identify. Too fast.', 'comms'],
      [14.5, '通訊', '白色基地的機體……追上去了。', 'White Base’s suit is going after it.', 'comms'],   // new
      [18.6, '觀測', '閃光！左舷遠方！', 'Flash — far to port!', 'sensors'],   // new
      [21.0, '觀測', '……其中一個，消失了。', '…One of them is gone.', 'sensors'],
    ] },
  { id: 'S9', title: 'ドズル最後一戰', en: 'Dozle’s Last Stand', hold: 20, cc: ['CANON'],
    narr: '道森乘 Big Zam 單騎出擊，掩護艦隊撤退；聯邦集火之下，巨人戰死陣前。',
    narrEn: 'Dozle sorties alone in the Big Zam to cover the retreat, and dies under the Federation’s massed fire.',
    path: [[-250, 80, 3200], [-200, 70, 2900]], alert: true, killAt: 17.5,
    comms: [
      [2.2, '觀測', '要塞正面，巨大反應！MA！', 'Huge contact, fortress front — mobile armour!', 'sensors'],
      [4.8, '火控', '我方光束……被彈開了！', 'Our beams are… bouncing off!', 'fire'],   // new
      [7.4, '損管', '前方僚艦被擊沉！', 'Ship ahead is down!', 'damage'],
      [10.0, '通訊', '它在掩護敵艦撤退！', 'It’s covering their retreat!', 'comms'],   // new
      [12.5, '艦長', '全艦，集中火力！', 'All ships — concentrate fire!', 'captain'],
      [15.0, 'MS隊長', '從下方切入！它的下面沒有防護！', 'Get underneath! It’s open below!', 'msleader', 1],   // new
      [19.0, '觀測', '……目標，沉默。', '…Target is silent.', 'sensors'],
    ] },
  { id: 'S10', title: '所羅門陷落', en: 'Solomon Falls', hold: 18, cc: ['CANON'],
    narr: '要塞易手，改名「コンペイトウ」。吉翁殘艦向暗處逃逸，聯邦兵鋒已指向 A Baoa Qu。',
    narrEn: 'The fortress changes hands and is renamed Konpeitou. Zeon’s survivors flee; the Federation turns toward A Baoa Qu.',
    path: [[-2200, 500, 1500], [-600, 700, 2900], [1300, 450, 2300]],
    comms: [
      [1.5, '觀測', '要塞砲台……全部沉默。', 'Fortress batteries… all silent.', 'sensors'],   // new
      [4.5, '通訊', '所羅門守備隊投降。要塞，已佔領。', 'Solomon garrison has surrendered. The fortress is ours.', 'comms'],
      [7.5, '損管', '損害統計：輕傷十二，戰死……三名。', 'Damage report: twelve wounded… three killed.', 'damage'],   // new
      [10.5, '通訊', '司令部命名——コンペイトウ。', 'Command designates it: Konpeitou.', 'comms'],
      [13.0, '航海', '本艦停止。', 'All stop.', 'helm'],   // new
      [15.5, '艦長', '下一站，A Baoa Qu。', 'Next stop: A Baoa Qu.', 'captain'],
    ] },
];

export const TRANSITION = 2.4;  // added to each hold → act duration
