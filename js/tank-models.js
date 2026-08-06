/*
 * Lapmodellek a forgatható páncélnézegetőhöz.
 *
 * Koordináták méterben:  X = jobbra,  Y = fel (0 = talaj),  Z = előre.
 * A négyszögek sarkai KÍVÜLRŐL NÉZVE az óramutatóval ellentétesen,
 * hogy a normálvektor kifelé mutasson.
 *
 * Az arányok a Wargaming hivatalos kontúr-ikonjaiból származnak (azok
 * pontos oldalnézeti sziluettek), a lemezszögek pedig a járművek publikált
 * adataiból. A modell SEMATIKUS: a forma felismerhető és a szögek reálisak,
 * de nem a játék hálója. Nincs benne térközös páncél és külső modul.
 */

(function (global) {
  "use strict";

  /* ---------------- építőelemek ---------------- */

  /** Téglatest. `faces` megadja lapoként a vastagságot; hiányzó lap kimarad. */
  function box(o) {
    const { x1, x2, y1, y2, z1, z2, faces, prefix, label } = o;
    const P = [];
    const add = (id, quad, nominal, lbl, decor) => {
      if (nominal == null) return;
      P.push({ id: prefix + "-" + id, label: lbl || label || id, nominal, quad, decor: !!decor });
    };
    const d = o.decor;
    add("front", [[x1,y1,z2],[x2,y1,z2],[x2,y2,z2],[x1,y2,z2]], faces.front, o.lblFront, d);
    add("rear",  [[x2,y1,z1],[x1,y1,z1],[x1,y2,z1],[x2,y2,z1]], faces.rear,  o.lblRear,  d);
    add("right", [[x2,y1,z2],[x2,y1,z1],[x2,y2,z1],[x2,y2,z2]], faces.right, o.lblSide,  d);
    add("left",  [[x1,y1,z1],[x1,y1,z2],[x1,y2,z2],[x1,y2,z1]], faces.left,  o.lblSide,  d);
    add("top",   [[x1,y2,z2],[x2,y2,z2],[x2,y2,z1],[x1,y2,z1]], faces.top,   o.lblTop,   d);
    add("bottom",[[x1,y1,z1],[x2,y1,z1],[x2,y1,z2],[x1,y1,z2]], faces.bottom, "Padló",   d);
    return P;
  }

  /**
   * Lapokra bontott forgástest (torony). A tank előre néz (+Z), a 0 fok
   * a torony eleje. Minden lap a saját irányszöge szerint kap vastagságot,
   * így a torony eleje vastagabb, mint az oldala — ahogy a valóságban.
   */
  function dome(o) {
    const { cx, cz, rx, rz, yBase, yTop, segments, rings, armor, prefix, taper } = o;
    const P = [];
    const seg = segments || 14, rg = rings || 3;
    const tp = taper == null ? 0.55 : taper;   // mennyivel szűkül a teteje

    const at = (iSeg, iRing) => {
      const a = (iSeg / seg) * Math.PI * 2;
      const t = iRing / rg;                     // 0 = alul, 1 = felül
      const shrink = 1 - tp * t * t;            // kupola-szerű befelé hajlás
      return [
        cx + Math.sin(a) * rx * shrink,
        yBase + (yTop - yBase) * t,
        cz + Math.cos(a) * rz * shrink,
      ];
    };

    // oldalfalak gyűrűnként
    for (let r = 0; r < rg; r++) {
      for (let s = 0; s < seg; s++) {
        const a = ((s + 0.5) / seg) * 360;
        const fwd = Math.abs(((a + 180) % 360) - 180);   // 0 = előre, 180 = hátra
        const zone = fwd < 55 ? "front" : fwd < 125 ? "side" : "rear";
        P.push({
          id: `${prefix}-${zone}-${r}-${s}`,
          label: armor.labels[zone],
          zone,
          nominal: armor[zone],
          quad: [at(s, r), at(s + 1, r), at(s + 1, r + 1), at(s, r + 1)],
        });
      }
    }
    // tető
    const top = [];
    for (let s = seg - 1; s >= 0; s--) top.push(at(s, rg));
    P.push({ id: prefix + "-roof", label: armor.labels.roof, zone: "roof",
             nominal: armor.roof, quad: top });
    return P;
  }

  /**
   * Oldalpáros lemez: megadod a jobb oldali sokszöget (x = +hw), és
   * legyártja a tükörképét is helyes körüljárással.
   */
  function sides(o) {
    const { hw, profile, nominal, label, id, decor } = o;
    const right = profile.map(([z, y]) => [hw, y, z]);
    const left = profile.slice().reverse().map(([z, y]) => [-hw, y, z]);
    return [
      { id: id + "-r", label, nominal, quad: right, decor: !!decor },
      { id: id + "-l", label, nominal, quad: left, decor: !!decor },
    ];
  }

  /* ---------------- IS-3 ---------------- */
  /*
   * Az oldalprofil a WG hivatalos kontúr-ikonjából származik (67x24 px),
   * 1 px = 0,15 m átváltással. Onnan: test 42 px hosszú, 11 px magas,
   * a torony 23 px hosszú és 7 px magas, a cső 18 px.
   *
   * A csukaorr két felső lemeze a középvonalon fut össze egy függőleges
   * élben, és hátra ÉS kifelé is dől — ez az összetett szögelés teszi
   * gyakorlatilag áttörhetetlenné szemből.
   */
  function is3() {
    const HW = 1.42;         // test fél-szélessége
    const TW = 1.58;         // lánctalp külső síkja
    const ROOF = 1.65;       // testtető
    const BOT = 0.28;        // testfenék
    const NOSE = 3.15;       // orr csúcsa (z)
    const REAR = -3.15;

    // A csukaorr három jellegzetes pontja a középvonalon
    const APEX_TOP = [0, 1.20, NOSE];
    const APEX_MID = [0, 0.86, NOSE - 0.30];
    const APEX_BOT = [0, BOT + 0.10, NOSE - 0.95];

    // Ahol a homloklemezek az oldalhoz érnek
    const SH_TOP = 2.05;     // felső lemez találkozása az oldallal (z)
    const SH_MID = 1.85;
    const SH_BOT = 1.60;

    const P = [];

    // — csukaorr: két felső lemez, V alakban —
    P.push({ id: "ufp-r", label: "Csukaorr (jobb felső)", nominal: 110,
             quad: [APEX_TOP, APEX_MID, [HW, 1.02, SH_MID], [HW, ROOF, SH_TOP]] });
    P.push({ id: "ufp-l", label: "Csukaorr (bal felső)", nominal: 110,
             quad: [APEX_MID, APEX_TOP, [-HW, ROOF, SH_TOP], [-HW, 1.02, SH_MID]] });

    // — alsó lemez: szintén V, de laposabb szögben —
    P.push({ id: "lfp-r", label: "Alsó lemez (jobb)", nominal: 110,
             quad: [APEX_MID, APEX_BOT, [HW, BOT, SH_BOT], [HW, 1.02, SH_MID]] });
    P.push({ id: "lfp-l", label: "Alsó lemez (bal)", nominal: 110,
             quad: [APEX_BOT, APEX_MID, [-HW, 1.02, SH_MID], [-HW, BOT, SH_BOT]] });

    // — test oldala: a kontúr profilját követő sokszög —
    P.push(...sides({
      id: "side", hw: HW, nominal: 90, label: "Oldal (test)",
      profile: [
        [SH_TOP,  ROOF],        // elöl fent, a csukaorr találkozásánál
        [SH_MID,  1.02],        // az orr oldalsó éle
        [SH_BOT,  BOT],         // alsó lemez oldalsó éle
        [-2.55,   BOT],         // fenék hátrafelé
        [REAR,    0.72],        // hátul felfelé lejtő fenéklemez
        [REAR,    ROOF],        // hátul fent
      ],
    }));

    // — testtető és hátlap —
    P.push({ id: "roof", label: "Testtető", nominal: 20,
             quad: [[-HW, ROOF, SH_TOP], [HW, ROOF, SH_TOP], [HW, ROOF, REAR], [-HW, ROOF, REAR]] });
    P.push({ id: "rear", label: "Hátulja", nominal: 60,
             quad: [[HW, 0.72, REAR], [-HW, 0.72, REAR], [-HW, ROOF, REAR], [HW, ROOF, REAR]] });

    // — lánctalpak: a testhez simulnak, kissé kilógva —
    [1, -1].forEach((s) => {
      const xo = s * TW;
      P.push(...[{
        id: `track-${s > 0 ? "r" : "l"}`, label: "Lánctalp", nominal: 20, decor: true,
        quad: (s > 0 ? (a) => a : (a) => a.slice().reverse())([
          [xo, 0.06, 2.35], [xo, 0.06, REAR + 0.15],
          [xo, 1.02, REAR + 0.15], [xo, 1.02, 2.35],
        ]).map((p) => [xo, p[1], p[2]]),
      }]);
    });

    // — torony: lapos, széles kupola (nem gömb) —
    P.push(...dome({
      prefix: "turret", cx: 0, cz: 0.55, rx: 1.30, rz: 1.62,
      yBase: ROOF - 0.05, yTop: 2.70, segments: 16, rings: 3, taper: 0.42,
      armor: {
        front: 249, side: 172, rear: 100, roof: 30,
        labels: { front: "Torony homlok", side: "Torony oldal",
                  rear: "Torony hátulja", roof: "Toronytető" },
      },
    }));

    // — ágyúpajzs és cső —
    P.push(...box({
      prefix: "mantlet", x1: -0.44, x2: 0.44, y1: 1.85, y2: 2.40, z1: 1.60, z2: 2.30,
      faces: { front: 249, right: 200, left: 200, top: 100 },
      lblFront: "Ágyúpajzs", lblSide: "Ágyúpajzs", lblTop: "Ágyúpajzs",
    }));
    P.push(...box({
      prefix: "gun", x1: -0.15, x2: 0.15, y1: 1.98, y2: 2.28, z1: 2.20, z2: 6.00,
      faces: { front: 999, right: 999, left: 999, top: 999, bottom: 999 },
      label: "Löveg", decor: true,
    }));

    return { name: "IS-3", extent: 9.0, plates: P };
  }

  global.TANK_MODELS = { "is-3": is3() };
  global.TankModelKit = { box, dome };
})(window);
