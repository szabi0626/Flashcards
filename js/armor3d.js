/*
 * Forgatható páncélnézegető.
 *
 * Minden lemez egy sík négyszög a térben, saját vastagsággal. Ahogy forgatod
 * a tankot, kiszámoljuk minden lemezre, milyen szögben érné a lövedék, és
 * ebből az EFFEKTÍV vastagságot:
 *
 *     effektív = vastagság / cos(becsapódási szög)
 *
 * Egy 110 mm-es lemez merőlegesen 110, 60 fokban 220, 75 fokban 425 mm.
 * Ezért vált színt a lemez forgatás közben — pontosan ez történik a játékban is.
 *
 * A World of Tanks két további szabályát is alkalmazzuk:
 *
 *  - NORMALIZÁCIÓ: a lövedék becsapódáskor kissé "beleharap" a páncélba,
 *    ami csökkenti a tényleges szöget. AP 5°, APCR 2°, HEAT 0°.
 *
 *  - LEPATTANÁS: 70° fölött az AP/APCR automatikusan lepattan (HEAT 85°),
 *    akármekkora a penetrációja.
 *
 *  - ÁTÜTÉSI SZABÁLY (overmatch): ha a lövedék kalibere legalább a lemez
 *    vastagságának háromszorosa, nincs lepattanás; kétszerese fölött pedig
 *    a normalizáció is megnő. Ezért üt át egy 122 mm-es löveg egy 20 mm-es
 *    tetőt bármilyen szögben.
 *
 * Nincs külső könyvtár: a lapok síkok, egyszínűek, textúra és fény nélkül —
 * ehhez elég a saját vetítés és mélység szerinti rendezés.
 */

(function (global) {
  "use strict";

  const RAD = Math.PI / 180;
  const DEG = 180 / Math.PI;

  const SHELL = {
    AP:   { norm: 5, ricochet: 70, label: "AP" },
    APCR: { norm: 2, ricochet: 70, label: "APCR" },
    HEAT: { norm: 0, ricochet: 85, label: "HEAT" },
    HE:   { norm: 0, ricochet: 90, label: "HE" },
  };

  /* ---------------- vektorműveletek ---------------- */
  const sub = (a, b) => [a[0]-b[0], a[1]-b[1], a[2]-b[2]];
  const cross = (a, b) => [
    a[1]*b[2] - a[2]*b[1],
    a[2]*b[0] - a[0]*b[2],
    a[0]*b[1] - a[1]*b[0],
  ];
  const dot = (a, b) => a[0]*b[0] + a[1]*b[1] + a[2]*b[2];
  function norm(v) {
    const l = Math.hypot(v[0], v[1], v[2]) || 1;
    return [v[0]/l, v[1]/l, v[2]/l];
  }

  /** A négyszög kifelé mutató normálvektora (a sarkok az óramutatóval
   *  ellentétesen vannak megadva kívülről nézve). */
  function quadNormal(q) {
    return norm(cross(sub(q[1], q[0]), sub(q[2], q[0])));
  }

  /* ---------------- páncélszámítás ---------------- */

  /**
   * Mennyi páncélt kell átütni, ha `angle` fokos szögben érjük a lemezt.
   * Visszaadja az effektív vastagságot és hogy lepattan-e.
   */
  function penetrationCheck(nominal, angleDeg, shellType, caliber) {
    const s = SHELL[shellType] || SHELL.AP;
    let normalization = s.norm;
    let ricochetAt = s.ricochet;

    if (caliber) {
      // Kétszeres kaliber fölött nő a normalizáció
      if (caliber > 2 * nominal) {
        normalization = normalization * 1.4 * caliber / (2 * nominal);
      }
      // Háromszoros kaliber fölött nincs lepattanás
      if (caliber >= 3 * nominal) ricochetAt = 90;
    }

    if (angleDeg >= ricochetAt) {
      return { effective: Infinity, ricochet: true };
    }
    const eff = Math.max(0, angleDeg - normalization) * RAD;
    return { effective: nominal / Math.cos(eff), ricochet: false };
  }

  /* ---------------- nézegető ---------------- */

  function Viewer(canvas, opts) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.model = null;
    this.yaw = 25;      // fok, vízszintes körbeforgatás
    this.pitch = 18;    // fok, felülről/alulról
    this.zoom = 1;
    this.shell = "AP";
    this.pen = null;    // a választott lövedék penetrációja (mm); null = csak vastagság
    this.caliber = null;
    this.onPick = (opts && opts.onPick) || null;
    this.picked = null;
    this._faces = [];
    this._bind();
  }

  Viewer.prototype.setModel = function (model) {
    this.model = model;
    this.picked = null;
    this.draw();
  };

  Viewer.prototype.setShell = function (type, pen, caliber) {
    this.shell = type;
    this.pen = pen;
    this.caliber = caliber;
    this.draw();
  };

  Viewer.prototype.setAngles = function (yaw, pitch) {
    this.yaw = yaw;
    this.pitch = Math.max(-80, Math.min(80, pitch));
    this.draw();
  };

  /** Modell-koordinátából nézeti koordináta (forgatás yaw, majd pitch). */
  Viewer.prototype._toView = function (p) {
    const cy = Math.cos(this.yaw * RAD), sy = Math.sin(this.yaw * RAD);
    const cp = Math.cos(this.pitch * RAD), sp = Math.sin(this.pitch * RAD);
    // Y tengely körül (vízszintes forgatás)
    const x1 =  p[0]*cy + p[2]*sy;
    const z1 = -p[0]*sy + p[2]*cy;
    // X tengely körül (billentés)
    const y2 = p[1]*cp - z1*sp;
    const z2 = p[1]*sp + z1*cp;
    return [x1, y2, z2];
  };

  Viewer.prototype._project = function (v) {
    const w = this.canvas.width, h = this.canvas.height;
    const s = Math.min(w, h) / (this.model.extent || 8) * this.zoom;
    return [w/2 + v[0]*s, h/2 - v[1]*s];
  };

  /** A színt az dönti el, át tudod-e ütni — nem a puszta vastagság. */
  Viewer.prototype._colorFor = function (eff, ricochet) {
    if (ricochet) return { fill: "#7d2b20", cls: "ricochet" };
    if (this.pen == null) {
      // Nincs választott lövedék: általános tier 8 mérce
      if (eff < 180) return { fill: "#4caf50", cls: "easy" };
      if (eff <= 250) return { fill: "#e0a020", cls: "hard" };
      return { fill: "#c0392b", cls: "no" };
    }
    const ratio = this.pen / eff;
    if (ratio >= 1.15) return { fill: "#4caf50", cls: "easy" };   // biztosan átmegy
    if (ratio >= 0.95) return { fill: "#e0a020", cls: "hard" };   // szórás dönti el
    return { fill: "#c0392b", cls: "no" };                        // nem megy át
  };

  Viewer.prototype.draw = function () {
    const ctx = this.ctx, m = this.model;
    const w = this.canvas.width, h = this.canvas.height;
    ctx.clearRect(0, 0, w, h);
    if (!m) return;

    // A kamera a nézeti tér +Z felől néz a origó felé.
    const viewDir = [0, 0, 1];
    const faces = [];

    m.plates.forEach((plate) => {
      const view = plate.quad.map((p) => this._toView(p));
      const n = quadNormal(view);
      const facing = dot(n, viewDir);
      if (facing <= 0.001) return;                 // hátrafelé néz, nem látszik

      const angle = Math.acos(Math.min(1, facing)) * DEG;
      const r = penetrationCheck(plate.nominal, angle, this.shell, this.caliber);
      const depth = view.reduce((s, p) => s + p[2], 0) / view.length;

      faces.push({
        plate, view, angle, depth,
        effective: r.effective, ricochet: r.ricochet,
        // A lánctalp és a löveg nem páncél — semlegesen jelenik meg,
        // csak azért van ott, hogy a sziluett felismerhető legyen.
        color: plate.decor ? { fill: "#39412c", cls: "decor" }
                           : this._colorFor(r.effective, r.ricochet),
        pts: view.map((p) => this._project(p)),
      });
    });

    // Festő-algoritmus: a távoli lapok előbb
    faces.sort((a, b) => a.depth - b.depth);
    this._faces = faces;

    faces.forEach((f) => {
      ctx.beginPath();
      ctx.moveTo(f.pts[0][0], f.pts[0][1]);
      for (let i = 1; i < f.pts.length; i++) ctx.lineTo(f.pts[i][0], f.pts[i][1]);
      ctx.closePath();
      ctx.fillStyle = f.color.fill;
      ctx.fill();
      const active = this.picked && this.picked === f.plate.id;
      ctx.strokeStyle = active ? "#ffffff" : "rgba(0,0,0,0.55)";
      ctx.lineWidth = active ? 3 : 1;
      ctx.stroke();
    });
  };

  /* ---------------- találat-vizsgálat ---------------- */

  function pointInPoly(x, y, pts) {
    let inside = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, yi] = pts[i], [xj, yj] = pts[j];
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }

  Viewer.prototype.pickAt = function (cx, cy) {
    // A legközelebbi (utoljára rajzolt) lap nyer
    for (let i = this._faces.length - 1; i >= 0; i--) {
      const f = this._faces[i];
      if (pointInPoly(cx, cy, f.pts)) {
        this.picked = f.plate.id;
        this.draw();
        if (this.onPick) this.onPick(f);
        return f;
      }
    }
    return null;
  };

  /* ---------------- érintés / egér ---------------- */

  Viewer.prototype._bind = function () {
    const c = this.canvas;
    let drag = null, moved = 0;

    const start = (x, y) => { drag = { x, y }; moved = 0; };
    const move = (x, y) => {
      if (!drag) return;
      const dx = x - drag.x, dy = y - drag.y;
      moved += Math.abs(dx) + Math.abs(dy);
      this.setAngles(this.yaw - dx * 0.6, this.pitch + dy * 0.6);
      drag = { x, y };
    };
    const end = (x, y) => {
      // Rövid érintés = koppintás, nem forgatás
      if (drag && moved < 6) {
        const r = c.getBoundingClientRect();
        this.pickAt((x - r.left) * c.width / r.width, (y - r.top) * c.height / r.height);
      }
      drag = null;
    };

    c.addEventListener("touchstart", (e) => {
      e.preventDefault();
      start(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: false });
    c.addEventListener("touchmove", (e) => {
      e.preventDefault();
      move(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: false });
    c.addEventListener("touchend", (e) => {
      const t = e.changedTouches[0];
      end(t.clientX, t.clientY);
    });

    c.addEventListener("mousedown", (e) => start(e.clientX, e.clientY));
    window.addEventListener("mousemove", (e) => move(e.clientX, e.clientY));
    window.addEventListener("mouseup", (e) => end(e.clientX, e.clientY));
  };

  global.Armor3D = { Viewer, penetrationCheck, SHELL, quadNormal };
})(window);
