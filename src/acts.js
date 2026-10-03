// 所羅門攻略戰 v2 — act data.
// World: metres, Y up, Solomon at the origin (R ≈ 1000, horns to ≈ 1700).
// Our ship (the fictional Federation cruiser 蒼鷺 Grey Heron) approaches from +Z.
// Each act: our ship moves along `path` over its duration D = hold + 2.4 s (same 3:30 total as v1,
// so the music still lines up). Everything inside an act is a pure function of act time,
// which is what makes the scrubber work.

export const SHIP_NAME = { zh: '蒼鷺號', en: 'Grey Heron' };

export const SUN_DIR = [0.75, 0.35, 0.55];          // direction TO the sun (normalised at runtime)
export const MIRROR_CENTER = [3000, 1100, 2400];     // Solar System mirror field centre (≈33° to starboard of the view in S5/S6)
export const MIRROR_RADIUS = 1800;
export const DUEL_CENTER = [-5200, 1400, 400];       // S8: the distant duel, seen to port

// Companion ships in our formation, offsets from our position (world axes).
export const COMPANIONS = [
  [-420, 60, -200],   // 0 — wingman, hit in S4
  [380, -40, 150],
  [-700, -120, 500],
  [650, 140, -500],   // 3 — sunk by the mobile armour in S9
  [160, 240, 800],
];

export const ACTS = [
  { id: 'S1', title: '序幕 — 要塞的沉默', en: 'Prologue — The Silent Fortress', hold: 20, cc: ['CANON'],
    narr: '奧德薩之後，吉翁全面收縮至宇宙；所羅門是本土之前最後的防線之一。聯邦艦隊集結，矛頭直指要塞。',
    narrEn: 'After Odessa, Zeon pulled back into space. Solomon is one of the last lines before its homeland. The Federation fleet gathers.',
    path: [[600, 420, 26000], [520, 380, 24400]],
    comms: [
      [6.0, '通訊', '第二聯合艦隊各艦，維持無線電靜默。', 'All ships, Second Combined Fleet — maintain radio silence.'],
      [12.5, '觀測', '所羅門，距離兩萬六千。沒有動靜。', 'Solomon, range twenty-six thousand. No movement.'],
      [18.0, '艦長', '……太安靜了。', '…Too quiet.'],
    ] },
  { id: 'S2', title: '聯邦集結', en: 'The Federation Gathers', hold: 18, cc: ['CANON', 'VARIANT'],
    narr: '第一、第二聯合艦隊兩翼逼近，白色基地隨隊推進；道森提督啟動所羅門的防禦配置。',
    narrEn: 'Two combined fleets close in on both flanks, White Base among them. Dozle Zabi brings Solomon’s defences up.',
    path: [[2400, 300, 19000], [2100, 250, 15400]], alertFrom: 15.5,
    comms: [
      [5.0, '航海', '第一聯合艦隊已就位，右舷。', 'First Combined Fleet in position, starboard.'],
      [10.0, '通訊', '白色基地確認，加入編隊。', 'White Base confirms. Joining formation.'],
      [15.5, '艦長', '全艦，第一戰鬥配置。', 'All hands — battle stations.'],
    ] },
  { id: 'S3', title: '第一波接觸', en: 'First Contact', hold: 16, cc: ['CANON', 'SUPP'],
    narr: '吉翁 MS 由要塞東、北面出擊，聯邦前鋒接敵，首批交火爆發。',
    narrEn: 'Zeon mobile suits launch from the east and north faces. The Federation vanguard engages.',
    path: [[2000, 200, 13000], [1800, 180, 10400]], alert: true,
    comms: [
      [3.5, '觀測', '要塞東面，MS 出擊！數量很多！', 'Mobile suits launching, east face — a lot of them!'],
      [9.0, '通訊', '前鋒接敵——', 'Vanguard engaging—'],
      [13.5, '火控', '主砲，自由射擊。', 'Main guns, fire at will.'],
    ] },
  { id: 'S4', title: '防禦圈全面激活', en: 'The Defence Ring Ignites', hold: 16, cc: ['CANON'],
    narr: '南圈 MS 加入，多層防禦圈成形；要塞砲火全開，兩翼艦隊頂住壓力推進。',
    narrEn: 'The southern ring joins. Every layer of the defence is up, and the fortress guns open fire.',
    path: [[1600, 100, 8800], [1500, 60, 7200]], alert: true, hitAt: 9.4,
    comms: [
      [3.0, '觀測', '南面也有反應——防禦圈全開！', 'Contacts south too — the whole ring is up!'],
      [9.8, '損管', '左舷中彈！僚艦起火！', 'Hit to port! Our wingman’s burning!'],
      [14.5, '艦長', '穩住。不准脫隊。', 'Steady. Hold formation.'],
    ] },
  { id: 'S5', title: '太陽系統展開', en: 'The Solar System Unfolds', hold: 15, cc: ['CANON'],
    narr: '聯邦巨型反射鏡陣列「太陽系統」於右舷高側展開，數千面鏡子開始聚焦。戰場短暫靜默。',
    narrEn: 'Off the starboard bow, thousands of mirrors of the “Solar System” array unfold and begin to focus. The battle goes quiet.',
    path: [[1500, 60, 7000], [1480, 60, 6900]], alert: true,
    comms: [
      [3.0, '通訊', '太陽系統，展開完畢。', 'Solar System deployment complete.'],
      [8.0, '通訊', '全艦隊退出射線。重複，退出射線。', 'All ships, clear the firing line. Repeat, clear the line.'],
      [13.5, '艦長', '……要來了。', '…Here it comes.'],
    ] },
  { id: 'S6', title: '太陽系統發動', en: 'The Solar System Fires', hold: 22, cc: ['CANON'],
    narr: '鏡陣聚焦的陽光掃過要塞表面，外圈吉翁 MS 由外至內逐批蒸發；防線在數秒間崩潰。',
    narrEn: 'Focused sunlight sweeps the fortress face. The outer Zeon ring burns away from the outside in.',
    path: [[1480, 60, 6900], [1450, 60, 6800]], alert: true, fireAt: 4.0,
    comms: [
      [1.2, '通訊', '三、二、一——', 'Three, two, one—'],
      [10.0, '觀測', '……要塞表面溫度，超出量程。', '…Fortress surface temperature — off the scale.'],
      [15.0, '觀測', '敵 MS 反應……大批消失。', 'Enemy mobile suit signals… vanishing.'],
      [20.0, '艦長', '……記住這一刻。', '…Remember this moment.'],
    ] },
  { id: 'S7', title: '防線崩潰突破', en: 'Breakthrough', hold: 16, cc: ['CANON'],
    narr: '聯邦乘勢突入要塞外圍，白色基地衝向側翼，吉翁殘部後退收縮。',
    narrEn: 'The Federation drives into the outer perimeter. Zeon’s survivors fall back on the fortress.',
    path: [[1400, 80, 6000], [700, 40, 3000]], alert: true,
    comms: [
      [2.5, '艦長', '全速前進。突入！', 'Full ahead. Go in!'],
      [8.5, '航海', '距離三千……兩千五……', 'Range three thousand… twenty-five hundred…'],
      [13.5, '觀測', '吉翁殘部向要塞收縮。', 'Zeon remnants pulling back to the fortress.'],
    ] },
  { id: 'S8', title: 'Elmeth 出擊與殞落', en: 'The Elmeth', hold: 25, cc: ['VARIANT'],
    narr: '左舷遠方，兩道高速光痕纏鬥：拉拉蘇的 Elmeth 與鋼彈。（時間線壓縮：此戰史實發生於要塞陷落之後。）',
    narrEn: 'Far to port, two fast lights duel: Lalah’s Elmeth and the Gundam. (Timeline compressed: this happened after Solomon fell.)',
    path: [[900, 350, 2900], [820, 330, 2700]], alert: true, flashAt: 18.0,
    comms: [
      [4.0, '觀測', '左舷遠方，高速反應兩個……在纏鬥。', 'Far to port — two fast signals. Dogfighting.'],
      [11.0, '通訊', '無法識別。太快了。', 'Can’t identify. Too fast.'],
      [21.0, '觀測', '……其中一個，消失了。', '…One of them is gone.'],
    ] },
  { id: 'S9', title: 'ドズル最後一戰', en: 'Dozle’s Last Stand', hold: 20, cc: ['CANON'],
    narr: '道森乘 Big Zam 單騎出擊，掩護艦隊撤退；聯邦集火之下，巨人戰死陣前。',
    narrEn: 'Dozle sorties alone in the Big Zam to cover the retreat, and dies under the Federation’s massed fire.',
    path: [[-250, 80, 3200], [-200, 70, 2900]], alert: true, killAt: 17.5,
    comms: [
      [2.2, '觀測', '要塞正面，巨大反應！MA！', 'Huge contact, fortress front — mobile armour!'],
      [7.4, '損管', '前方僚艦被擊沉！', 'Ship ahead is down!'],
      [12.5, '艦長', '全艦，集中火力！', 'All ships — concentrate fire!'],
      [19.0, '觀測', '……目標，沉默。', '…Target is silent.'],
    ] },
  { id: 'S10', title: '所羅門陷落', en: 'Solomon Falls', hold: 18, cc: ['CANON'],
    narr: '要塞易手，改名「コンペイトウ」。吉翁殘艦向暗處逃逸，聯邦兵鋒已指向 A Baoa Qu。',
    narrEn: 'The fortress changes hands and is renamed Konpeitou. Zeon’s survivors flee; the Federation turns toward A Baoa Qu.',
    path: [[-2200, 500, 1500], [-600, 700, 2900], [1300, 450, 2300]],
    comms: [
      [4.5, '通訊', '所羅門守備隊投降。要塞，已佔領。', 'Solomon garrison has surrendered. The fortress is ours.'],
      [10.5, '通訊', '司令部命名——コンペイトウ。', 'Command designates it: Konpeitou.'],
      [15.5, '艦長', '下一站，A Baoa Qu。', 'Next stop: A Baoa Qu.'],
    ] },
];

export const TRANSITION = 2.4;  // added to each hold → act duration
