/*
 * KÉZI ADATOK — ezeket én írtam, nem az API.
 *
 * A Wargaming API csak NOMINÁLIS páncélvastagságot ad (hat szám tankonként:
 * test és torony elöl/oldalt/hátul). Nem ad dőlésszöget, effektív értéket,
 * gyenge pontot (kupola, ágyúpajzs, alsó lemez), sem álcát vagy autoloader
 * klip adatot. Ezek a részletes páncélmodellből jönnek, amit publikus API
 * nem szolgáltat.
 *
 * Ezért ez a fájl a gyenge láncszem. A nominális értékek a js/tanks-data.js-ből
 * hitelesek; az itteni `effective` és `angle` értékek BECSLÉSEK.
 *
 * Ha ellenőrizted egy tank zónáit (pl. tanks.gg páncélnézegetőjével),
 * állítsd a `verified` mezőjét true-ra — az appból eltűnik a figyelmeztetés.
 *
 * effective = mennyi mm páncélt kell ténylegesen átütni szemből, a szögelés
 * figyelembevételével. Egy 110 mm-es lemez 60 fokban ~220 mm-nek felel meg.
 */

const ARMOR_ZONES = {
  "is-3": {
    verified: false,
    lesson:
      "A csukaorr két ferde lapja V alakban áll — szemből gyakorlatilag " +
      "áttörhetetlen, és minél jobban fordul feléd, annál rosszabb. " +
      "Az alsó lemezt keresd, vagy kerüld meg. Ha lejtőn áll, a lemez eltűnik.",
    zones: [
      { id: "mantlet",      part: "mantlet",     label: "Ágyúpajzs",        nominal: 249, angle: 0,  effective: 300, note: "A legvastagabb pontja." },
      { id: "turret-front", part: "turretFront", label: "Torony homlok",    nominal: 249, angle: 30, effective: 270, note: "Lekerekített, gyakran lepattan." },
      { id: "ufp",          part: "ufp",         label: "Csukaorr (felső)", nominal: 110, angle: 60, effective: 230, note: "Két ferde lap V alakban. Ne lődd." },
      { id: "lfp",          part: "lfp",         label: "Alsó lemez",       nominal: 110, angle: 45, effective: 155, note: "★ IDE LŐJ. Közelről, ha nem tudja elrejteni." },
      { id: "side",         part: "side",        label: "Oldal (test)",     nominal: 90,  angle: 0,  effective: 90,  note: "Ha kifordul, szabad préda." },
      { id: "roof",         part: "roof",        label: "Toronytető",       nominal: 20,  angle: 0,  effective: 20,  note: "Felülről vagy HE-vel." },
    ],
  },

  "tiger-ii": {
    verified: false,
    lesson:
      "Erős felső lemez és torony, de hatalmas, jól látható alsó lemez — és " +
      "nagyon magas sziluett, alig tud fedezékbe bújni. Ha szemből áll, az " +
      "alsó lemez a válasz; ha oldalra fordul, mindenhol átmegy.",
    zones: [
      { id: "mantlet",      part: "mantlet",     label: "Ágyúpajzs",     nominal: 245, angle: 0,  effective: 250, note: "Mögötte dupla lemez." },
      { id: "turret-front", part: "turretFront", label: "Torony homlok", nominal: 245, angle: 10, effective: 250, note: "Lapos és vastag." },
      { id: "ufp",          part: "ufp",         label: "Felső lemez",   nominal: 160, angle: 50, effective: 250, note: "Ferde, kemény. Kerüld." },
      { id: "lfp",          part: "lfp",         label: "Alsó lemez",    nominal: 120, angle: 50, effective: 185, note: "★ IDE LŐJ. Nagy felület, könnyű eltalálni." },
      { id: "side",         part: "side",        label: "Oldal (test)",  nominal: 80,  angle: 0,  effective: 80,  note: "Papírvékony a méretéhez képest." },
      { id: "roof",         part: "roof",        label: "Toronytető",    nominal: 40,  angle: 0,  effective: 40,  note: "Magasabb pozícióból sebezhető." },
    ],
  },

  t32: {
    verified: false,
    lesson:
      "Hull-down szörny: −10° csőbólintással eltűnik a teste, a tornyát meg " +
      "alig lehet átütni. Ha dombon áll, csak a kupola marad — kicsi célpont. " +
      "Ne pazarold rá a lövedéket, várd meg, míg lejön vagy kerüld meg.",
    zones: [
      { id: "mantlet",      part: "mantlet",     label: "Ágyúpajzs",           nominal: 298, angle: 0,  effective: 330, note: "Gyakorlatilag áttörhetetlen tier 8-on." },
      { id: "turret-front", part: "turretFront", label: "Torony arc",          nominal: 197, angle: 25, effective: 240, note: "Lekerekített, erős." },
      { id: "cupola",       part: "cupola",      label: "Parancsnoki kupola",  nominal: 152, angle: 0,  effective: 175, note: "★ Az EGYETLEN esély hull-down ellen. Kicsi, de megvan." },
      { id: "ufp",          part: "ufp",         label: "Felső lemez",         nominal: 127, angle: 54, effective: 215, note: "Erősen ferde." },
      { id: "lfp",          part: "lfp",         label: "Alsó lemez",          nominal: 102, angle: 45, effective: 145, note: "★ Ha látod a testét, ide lőj." },
      { id: "side",         part: "side",        label: "Oldal (test)",        nominal: 76,  angle: 0,  effective: 76,  note: "Nagyon vékony." },
    ],
  },

  "t-44": {
    verified: false,
    lesson:
      "Nincs komoly páncélja — tier 8-on bárhol átlövöd. Cserébe gyors és " +
      "alacsony: mozgásból és oldalról támad. Rossz a csőbólintása (−7°), " +
      "ezért dombon rosszul harcol. Ne hagyd, hogy oldalra kerüljön.",
    zones: [
      { id: "mantlet",      part: "mantlet",     label: "Ágyúpajzs",     nominal: 200, angle: 0,  effective: 230, note: "A legerősebb pontja, és az sem sok." },
      { id: "turret-front", part: "turretFront", label: "Torony homlok", nominal: 200, angle: 30, effective: 210, note: "Lekerekített, néha lepattan." },
      { id: "ufp",          part: "ufp",         label: "Felső lemez",   nominal: 105, angle: 60, effective: 205, note: "Meredek, de jó pennel átmegy." },
      { id: "lfp",          part: "lfp",         label: "Alsó lemez",    nominal: 105, angle: 45, effective: 148, note: "★ Biztos átütés." },
      { id: "side",         part: "side",        label: "Oldal (test)",  nominal: 75,  angle: 0,  effective: 75,  note: "Bármi átmegy rajta." },
      { id: "roof",         part: "roof",        label: "Toronytető",    nominal: 20,  angle: 0,  effective: 20,  note: "Nagyon vékony." },
    ],
  },

  "amx-50-100": {
    verified: false,
    lesson:
      "Papírpáncél mindenhol — de 4 lövedéket ürít rád ~52 másodperc alatt " +
      "1200 sebzéssel. A klip után ~43 mp-ig védtelen: AKKOR támadd. " +
      "Ha látod, hogy elkezdte kiüríteni, menj fedezékbe és számolj.",
    zones: [
      { id: "mantlet",      part: "mantlet",     label: "Ágyúpajzs",     nominal: 90, angle: 0,  effective: 120, note: "A legerősebb pontja." },
      { id: "turret-front", part: "turretFront", label: "Torony homlok", nominal: 90, angle: 20, effective: 100, note: "Billenőtorony, gyenge." },
      { id: "ufp",          part: "ufp",         label: "Felső lemez",   nominal: 90, angle: 45, effective: 127, note: "Bármi átmegy rajta." },
      { id: "lfp",          part: "lfp",         label: "Alsó lemez",    nominal: 90, angle: 30, effective: 104, note: "★ Biztos átütés." },
      { id: "side",         part: "side",        label: "Oldal (test)",  nominal: 35, angle: 0,  effective: 35,  note: "Még HE is átüti. Ne is célozz gyenge pontot." },
      { id: "roof",         part: "roof",        label: "Toronytető",    nominal: 20, angle: 0,  effective: 20,  note: "Vékony." },
    ],
  },
};

/*
 * Autoloader klip adatok — az API ezeket sem adja.
 * A `reload` (teljes klip újratöltés) a tanks-data.js-ből jön, az hiteles.
 * Itt csak a klip mérete és a lövések közti idő szerepel, becsülve.
 */
const CLIPS = {
  "amx-50-100": {
    "90 mm DCA 45 (50 100)":  { shells: 6, intraClip: 2.0 },
    "100 mm SA47 (50 100)":   { shells: 4, intraClip: 3.0 },
  },
};

/*
 * Álca értékek — az API nem adja, ezek is becslések.
 * Százalék, álló helyzetben / mozgás közben.
 */
const CAMO = {
  "is-3":       { still: 8.9,  moving: 5.3 },
  "tiger-ii":   { still: 5.9,  moving: 3.5 },
  "t32":        { still: 6.8,  moving: 4.1 },
  "t-44":       { still: 12.6, moving: 9.5 },
  "amx-50-100": { still: 6.7,  moving: 4.0 },
};

if (typeof window !== "undefined") {
  window.ARMOR_ZONES = ARMOR_ZONES;
  window.CLIPS = CLIPS;
  window.CAMO = CAMO;
}
if (typeof module !== "undefined") module.exports = { ARMOR_ZONES, CLIPS, CAMO };
