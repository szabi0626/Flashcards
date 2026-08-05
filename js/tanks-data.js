/*
 * Tank adatbázis.
 *
 * FONTOS: az értékek emlékezetből származnak és patchenként változnak.
 * Minden tanknál van egy `verified` mező — állítsd true-ra, miután
 * összevetetted a tanks.gg / wiki adataival. Az appban a nem ellenőrzött
 * tankok jelölést kapnak.
 *
 * Páncélzóna mezők:
 *   part      – melyik alkatrészhez tartozik a sémán (lásd js/app.js)
 *   nominal   – vastagság mm-ben, ahogy a wiki írja
 *   angle     – dőlésszög fokban (0 = merőleges)
 *   effective – tényleges átütendő vastagság mm-ben, szemből nézve
 *   note      – rövid magyarázat / mire figyelj
 *
 * A színkód (zöld/sárga/piros) az `effective` értékből SZÁMÍTÓDIK,
 * nem kézzel van megadva — így nem tud elcsúszni.
 */

const TANKS = [
  /* ------------------------------------------------------------------ */
  {
    id: "is-3",
    name: "IS-3",
    nation: "USSR",
    nationHu: "Szovjet",
    flag: "🇷🇺",
    tier: 8,
    type: "heavy",
    typeHu: "Nehéz harckocsi",
    hp: 1500,
    weight: 48.6,
    image: null, // pl. "img/is-3.jpg"
    verified: false,
    lesson: "A csukaorr (pike nose) miatt szemből gyakorlatilag áttörhetetlen. Az alsó lemezt keresd, vagy kerüld meg.",

    armor: {
      hull: { front: 110, side: 90, rear: 60 },
      turret: { front: 220, side: 110, rear: 90 },
      zones: [
        { id: "turret-front", part: "turretFront", label: "Torony homlok", nominal: 220, angle: 30, effective: 290, note: "Lekerekített, gyakran lepattan. Ne lődd." },
        { id: "mantlet", part: "mantlet", label: "Ágyúpajzs", nominal: 250, angle: 0, effective: 300, note: "A legvastagabb pont." },
        { id: "ufp", part: "ufp", label: "Csukaorr (felső)", nominal: 110, angle: 60, effective: 220, note: "Két ferde lap V alakban — szinte mindig lepattan." },
        { id: "lfp", part: "lfp", label: "Alsó lemez", nominal: 110, angle: 45, effective: 165, note: "★ IDE LŐJ. Közelről, ha nem tudja elrejteni." },
        { id: "side", part: "side", label: "Oldal (test)", nominal: 90, angle: 0, effective: 90, note: "Ha kifordul, szabad préda." },
        { id: "roof", part: "roof", label: "Toronytető", nominal: 20, angle: 0, effective: 20, note: "Felülről / HE-vel." },
      ],
    },

    guns: [
      {
        name: "122 mm D-25T", stock: true,
        alpha: 390, penAP: 175, penAPCR: 217, penHE: 61,
        reload: 15.4, dpm: 1520, accuracy: 0.46, aimTime: 3.4, depression: -5,
      },
      {
        name: "122 mm BL-9", stock: false,
        alpha: 390, penAP: 225, penAPCR: 265, penHE: 68,
        reload: 13.7, dpm: 1710, accuracy: 0.40, aimTime: 3.4, depression: -5,
      },
    ],

    mobility: { topSpeed: 38, reverse: 15, hpPerTon: 12.3, traverse: 26 },
    vision: { viewRange: 350, camoStill: 8.9, camoMoving: 5.3 },

    silhouette: {
      viewBox: "0 0 240 120",
      paths: [
        // hegyes csukaorr: a test elöl ékbe fut össze
        { d: "M16 62 L44 52 L190 52 L206 60 L206 70 L20 70 Z", fill: "hull" },
        { d: "M88 52 Q92 30 122 30 Q152 30 156 52 Z", fill: "turret" },
        { d: "M150 38 L236 40 L236 45 L150 47 Z", fill: "turret" },
      ],
      wheels: { count: 6, x0: 36, x1: 186, y: 84, r: 9 },
      track: { x0: 16, x1: 210, yTop: 68, yBot: 94 },
    },
  },

  /* ------------------------------------------------------------------ */
  {
    id: "tiger-ii",
    name: "Tiger II",
    nation: "Germany",
    nationHu: "Német",
    flag: "🇩🇪",
    tier: 8,
    type: "heavy",
    typeHu: "Nehéz harckocsi",
    hp: 1600,
    weight: 69.8,
    image: null,
    verified: false,
    lesson: "Erős felső lemez és torony, de hatalmas és jól látható alsó lemez. Magas sziluett — nehezen bújik el.",

    armor: {
      hull: { front: 150, side: 80, rear: 80 },
      turret: { front: 185, side: 80, rear: 80 },
      zones: [
        { id: "turret-front", part: "turretFront", label: "Torony homlok", nominal: 185, angle: 10, effective: 200, note: "Lapos. Jó pennel átmegy." },
        { id: "mantlet", part: "mantlet", label: "Ágyúpajzs", nominal: 185, angle: 0, effective: 240, note: "Mögötte dupla lemez." },
        { id: "ufp", part: "ufp", label: "Felső lemez", nominal: 150, angle: 50, effective: 235, note: "Ferde, kemény. Kerüld." },
        { id: "lfp", part: "lfp", label: "Alsó lemez", nominal: 100, angle: 50, effective: 155, note: "★ IDE LŐJ. Nagy felület, könnyen eltalálható." },
        { id: "side", part: "side", label: "Oldal (test)", nominal: 80, angle: 0, effective: 80, note: "Papírvékony a méretéhez képest." },
        { id: "roof", part: "roof", label: "Toronytető", nominal: 40, angle: 0, effective: 40, note: "Magasabb pozícióból sebezhető." },
      ],
    },

    guns: [
      {
        name: "8,8 cm KwK 43 L/71", stock: true,
        alpha: 240, penAP: 203, penAPCR: 237, penHE: 44,
        reload: 7.4, dpm: 1950, accuracy: 0.34, aimTime: 2.3, depression: -8,
      },
      {
        name: "10,5 cm KwK 45 L/52", stock: false,
        alpha: 320, penAP: 225, penAPCR: 269, penHE: 53,
        reload: 10.9, dpm: 1760, accuracy: 0.35, aimTime: 2.9, depression: -8,
      },
    ],

    mobility: { topSpeed: 38, reverse: 15, hpPerTon: 12.5, traverse: 26 },
    vision: { viewRange: 390, camoStill: 5.9, camoMoving: 3.5 },

    silhouette: {
      viewBox: "0 0 240 120",
      paths: [
        { d: "M18 66 L46 44 L196 44 L212 54 L212 68 L18 68 Z", fill: "hull" },
        { d: "M94 44 L98 22 L162 22 L168 44 Z", fill: "turret" },
        { d: "M164 29 L238 31 L238 36 L164 38 Z", fill: "turret" },
      ],
      wheels: { count: 9, x0: 32, x1: 196, y: 84, r: 8 },
      track: { x0: 14, x1: 214, yTop: 66, yBot: 94 },
    },
  },

  /* ------------------------------------------------------------------ */
  {
    id: "t32",
    name: "T32",
    nation: "USA",
    nationHu: "Amerikai",
    flag: "🇺🇸",
    tier: 8,
    type: "heavy",
    typeHu: "Nehéz harckocsi",
    hp: 1500,
    weight: 55.0,
    image: null,
    verified: false,
    lesson: "Hull-down szörny: −10° csőbólintással eltűnik a teste, a tornyát meg alig lehet átütni. Ha dombon áll, ne is próbáld — várd meg, míg lejön.",

    armor: {
      hull: { front: 127, side: 76, rear: 51 },
      turret: { front: 298, side: 152, rear: 152 },
      zones: [
        { id: "mantlet", part: "mantlet", label: "Ágyúpajzs", nominal: 298, angle: 0, effective: 330, note: "Gyakorlatilag áttörhetetlen tier 8-on." },
        { id: "turret-front", part: "turretFront", label: "Torony arc", nominal: 190, angle: 25, effective: 260, note: "Lekerekített, erős." },
        { id: "cupola", part: "cupola", label: "Parancsnoki kupola", nominal: 152, angle: 0, effective: 175, note: "★ Az EGYETLEN esély hull-down ellen. Kicsi, de megvan." },
        { id: "ufp", part: "ufp", label: "Felső lemez", nominal: 127, angle: 54, effective: 216, note: "Erősen ferde." },
        { id: "lfp", part: "lfp", label: "Alsó lemez", nominal: 102, angle: 45, effective: 150, note: "★ Ha látod a testét, ide lőj." },
        { id: "side", part: "side", label: "Oldal (test)", nominal: 76, angle: 0, effective: 76, note: "Nagyon vékony." },
      ],
    },

    guns: [
      {
        name: "90 mm M3", stock: true,
        alpha: 240, penAP: 173, penAPCR: 243, penHE: 45,
        reload: 8.6, dpm: 1670, accuracy: 0.38, aimTime: 2.3, depression: -10,
      },
      {
        name: "105 mm T5E1", stock: false,
        alpha: 320, penAP: 198, penAPCR: 245, penHE: 53,
        reload: 11.5, dpm: 1670, accuracy: 0.39, aimTime: 2.9, depression: -10,
      },
    ],

    mobility: { topSpeed: 35, reverse: 12, hpPerTon: 13.6, traverse: 26 },
    vision: { viewRange: 370, camoStill: 6.8, camoMoving: 4.1 },

    silhouette: {
      viewBox: "0 0 240 120",
      paths: [
        { d: "M20 66 L48 50 L188 50 L202 58 L202 68 L20 68 Z", fill: "hull" },
        { d: "M84 50 Q86 26 120 26 Q154 26 156 50 Z", fill: "turret" },
        // parancsnoki kupola — a T32 legjellegzetesebb felismerési pontja
        { d: "M96 26 L98 14 L118 14 L120 26 Z", fill: "turret" },
        { d: "M150 34 Q162 34 162 41 Q162 47 150 47 Z", fill: "turret" },
        { d: "M160 37 L234 38 L234 43 L160 44 Z", fill: "turret" },
      ],
      wheels: { count: 7, x0: 34, x1: 184, y: 84, r: 8 },
      track: { x0: 16, x1: 206, yTop: 66, yBot: 94 },
    },
  },

  /* ------------------------------------------------------------------ */
  {
    id: "t-44",
    name: "T-44",
    nation: "USSR",
    nationHu: "Szovjet",
    flag: "🇷🇺",
    tier: 8,
    type: "medium",
    typeHu: "Közepes harckocsi",
    hp: 1300,
    weight: 32.0,
    image: null,
    verified: false,
    lesson: "Nincs komoly páncélja — bárhol átlövöd. Viszont gyors és alacsony: mozgásból és oldalról támad. Rossz a csőbólintása (−5°), ezért dombon rosszul harcol.",

    armor: {
      hull: { front: 90, side: 75, rear: 45 },
      turret: { front: 120, side: 100, rear: 75 },
      zones: [
        { id: "turret-front", part: "turretFront", label: "Torony homlok", nominal: 120, angle: 30, effective: 175, note: "Lekerekített, néha lepattan — de általában átmegy." },
        { id: "mantlet", part: "mantlet", label: "Ágyúpajzs", nominal: 120, angle: 0, effective: 190, note: "A legerősebb pontja, és az sem sok." },
        { id: "ufp", part: "ufp", label: "Felső lemez", nominal: 90, angle: 60, effective: 180, note: "Meredek, de tier 8 pennel átmegy." },
        { id: "lfp", part: "lfp", label: "Alsó lemez", nominal: 90, angle: 45, effective: 130, note: "★ Biztos átütés." },
        { id: "side", part: "side", label: "Oldal (test)", nominal: 75, angle: 0, effective: 75, note: "Bármi átmegy rajta." },
        { id: "roof", part: "roof", label: "Toronytető", nominal: 20, angle: 0, effective: 20, note: "Nagyon vékony." },
      ],
    },

    guns: [
      {
        name: "85 mm ZiS-S-53", stock: true,
        alpha: 180, penAP: 144, penAPCR: 194, penHE: 44,
        reload: 5.5, dpm: 1960, accuracy: 0.39, aimTime: 2.3, depression: -5,
      },
      {
        name: "100 mm LB-1", stock: false,
        alpha: 300, penAP: 219, penAPCR: 263, penHE: 50,
        reload: 8.7, dpm: 2070, accuracy: 0.35, aimTime: 2.3, depression: -5,
      },
    ],

    mobility: { topSpeed: 51, reverse: 20, hpPerTon: 16.3, traverse: 48 },
    vision: { viewRange: 370, camoStill: 12.6, camoMoving: 9.5 },

    silhouette: {
      viewBox: "0 0 240 120",
      paths: [
        { d: "M26 68 L48 54 L184 54 L196 62 L196 70 L26 70 Z", fill: "hull" },
        { d: "M86 54 Q88 34 118 34 Q148 34 150 54 Z", fill: "turret" },
        { d: "M146 41 L226 42 L226 47 L146 48 Z", fill: "turret" },
      ],
      wheels: { count: 5, x0: 44, x1: 178, y: 84, r: 11 },
      track: { x0: 22, x1: 200, yTop: 70, yBot: 94 },
    },
  },

  /* ------------------------------------------------------------------ */
  {
    id: "amx-50-100",
    name: "AMX 50 100",
    nation: "France",
    nationHu: "Francia",
    flag: "🇫🇷",
    tier: 8,
    type: "heavy",
    typeHu: "Nehéz harckocsi (autoloader)",
    hp: 1450,
    weight: 53.7,
    image: null,
    verified: false,
    lesson: "Papírpáncél, de 4 lövedéket ürít rád ~9 másodperc alatt (1200 sebzés). A klip után ~28 mp-ig védtelen — AKKOR támadd. Ha látod, hogy elkezdte kiüríteni, menj fedezékbe és számolj.",

    armor: {
      hull: { front: 90, side: 30, rear: 30 },
      turret: { front: 100, side: 30, rear: 30 },
      zones: [
        { id: "turret-front", part: "turretFront", label: "Torony homlok", nominal: 100, angle: 20, effective: 120, note: "Billenőtorony, gyenge." },
        { id: "mantlet", part: "mantlet", label: "Ágyúpajzs", nominal: 100, angle: 0, effective: 130, note: "A legerősebb pontja." },
        { id: "ufp", part: "ufp", label: "Felső lemez", nominal: 90, angle: 45, effective: 130, note: "Bármi átmegy rajta." },
        { id: "lfp", part: "lfp", label: "Alsó lemez", nominal: 90, angle: 30, effective: 105, note: "★ Biztos átütés." },
        { id: "side", part: "side", label: "Oldal (test)", nominal: 30, angle: 0, effective: 30, note: "Még géppuska is karcolja. HE is sebzi." },
        { id: "roof", part: "roof", label: "Toronytető", nominal: 20, angle: 0, effective: 20, note: "Vékony." },
      ],
    },

    guns: [
      {
        name: "90 mm F3", stock: true,
        alpha: 240, penAP: 212, penAPCR: 259, penHE: 45,
        clip: 6, intraClip: 2.0, clipReload: 34.0,
        dpm: 1580, accuracy: 0.36, aimTime: 2.9, depression: -6,
      },
      {
        name: "100 mm SA47", stock: false,
        alpha: 300, penAP: 232, penAPCR: 263, penHE: 50,
        clip: 4, intraClip: 3.0, clipReload: 28.0,
        dpm: 1660, accuracy: 0.35, aimTime: 2.9, depression: -6,
      },
    ],

    mobility: { topSpeed: 51, reverse: 20, hpPerTon: 15.3, traverse: 30 },
    vision: { viewRange: 390, camoStill: 6.7, camoMoving: 4.0 },

    silhouette: {
      viewBox: "0 0 240 120",
      paths: [
        { d: "M18 68 L44 54 L196 54 L210 62 L210 70 L18 70 Z", fill: "hull" },
        // billenőtorony: alsó gyűrű + felső billenő rész
        { d: "M92 54 L96 44 L164 44 L168 54 Z", fill: "turret" },
        { d: "M98 44 L104 28 L158 28 L162 44 Z", fill: "turret" },
        { d: "M158 32 L238 34 L238 39 L158 41 Z", fill: "turret" },
      ],
      wheels: { count: 8, x0: 34, x1: 194, y: 84, r: 8 },
      track: { x0: 16, x1: 212, yTop: 68, yBot: 94 },
    },
  },
];

if (typeof window !== "undefined") window.TANKS = TANKS;
if (typeof module !== "undefined") module.exports = { TANKS };
