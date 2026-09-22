/*
 * Forgatható páncélnézegető — WebGL.
 *
 * A modell a JÁTÉK SAJÁT ütközési hálója (lásd tools/build_armor_models.py és
 * CREDITS.md): minden háromszög egy páncéllemezhez tartozik, és minden
 * lemeznek megvan a játékbeli nominális vastagsága. A lényeg, hogy a SZÍNT
 * nem előre számoljuk ki, hanem a shader dönti el képpontonként az AKTUÁLIS
 * nézőszögből:
 *
 *     effektív = vastagság / cos(becsapódási szög)
 *
 * Ezért vált egy lemez zöldből pirosba, ahogy a tank elfordul — pontosan ez
 * történik a játékban is. A World of Tanks három szabályát alkalmazzuk:
 *
 *   NORMALIZÁCIÓ  a lövedék becsapódáskor "beleharap": AP 5°, APCR 2°, HEAT 0°
 *   LEPATTANÁS    70° fölött AP/APCR automatikusan lepattan (HEAT 85°)
 *   ÁTÜTÉS        ha a kaliber >= vastagság 3-szorosa, nincs lepattanás;
 *                 2-szeres fölött a normalizáció is megnő
 *
 * A fájl indexelt (kicsi), de betöltéskor szétbontjuk osztatlan csúcsokra:
 * így a normál és a lemez a lapon belül végig azonos — lapos árnyalás külön
 * "flat" minősítő nélkül, WebGL 1 alatt is.
 *
 * A forrásháló körüljárása NEM egységes (a lánctalpnál kb. fele-fele), ezért
 * nincs hátlap-eldobás: a mélységpuffer dönti el, mi látszik, a becsapódási
 * szöghöz pedig a normál és a nézőirány szögének ABSZOLÚT értékét vesszük.
 */

(function (global) {
  "use strict";

  /* ------------------------- kis mátrix könyvtár ------------------------- */
  const M4 = {
    ident: () => new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]),
    mul(a, b) {
      const o = new Float32Array(16);
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
        let s = 0;
        for (let k = 0; k < 4; k++) s += a[k*4+j] * b[i*4+k];
        o[i*4+j] = s;
      }
      return o;
    },
    perspective(fovy, aspect, near, far) {
      const f = 1 / Math.tan(fovy / 2), nf = 1 / (near - far);
      return new Float32Array([
        f/aspect,0,0,0, 0,f,0,0, 0,0,(far+near)*nf,-1, 0,0,2*far*near*nf,0,
      ]);
    },
    rotY(a) {
      const c = Math.cos(a), s = Math.sin(a);
      return new Float32Array([c,0,-s,0, 0,1,0,0, s,0,c,0, 0,0,0,1]);
    },
    rotX(a) {
      const c = Math.cos(a), s = Math.sin(a);
      return new Float32Array([1,0,0,0, 0,c,s,0, 0,-s,c,0, 0,0,0,1]);
    },
    translate(x, y, z) {
      return new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, x,y,z,1]);
    },
    scale(s) {
      return new Float32Array([s,0,0,0, 0,s,0,0, 0,0,s,0, 0,0,0,1]);
    },
  };

  /* ------------------------------ shaderek ------------------------------ */

  // aKind: 0 = páncél, 1 = térelválasztott páncél, 2 = lánctalp,
  //        3 = nem páncél (löveg, optika, 0 mm-es lemez)
  const VERT = `
    attribute vec3 aPos;
    attribute vec3 aNormal;
    attribute float aPlate;
    attribute float aMM;
    attribute float aKind;
    uniform mat4 uMVP;
    uniform mat4 uModelView;
    varying vec3 vNormalView;
    varying vec3 vViewPos;
    varying float vPlate;
    varying float vMM;
    varying float vKind;
    void main() {
      gl_Position = uMVP * vec4(aPos, 1.0);
      vViewPos = (uModelView * vec4(aPos, 1.0)).xyz;
      // forgatás + eltolás: a normálhoz elég a 3x3 rész
      vNormalView = mat3(uModelView) * aNormal;
      vPlate = aPlate; vMM = aMM; vKind = aKind;
    }`;

  const FRAG = `
    precision highp float;
    varying vec3 vNormalView;
    varying vec3 vViewPos;
    varying float vPlate;
    varying float vMM;
    varying float vKind;

    uniform float uPen;       // a lövedék átütése, mm
    uniform float uNorm;      // normalizáció, fok
    uniform float uRico;      // lepattanási szög, fok
    uniform float uCaliber;   // mm
    uniform float uPickMode;  // 1 = lemez/szög kiolvasás

    void main() {
      // A lövedék a kamerából a képpont felé repül.
      vec3 n = normalize(vNormalView);
      vec3 toCam = normalize(-vViewPos);
      float facing = clamp(abs(dot(n, toCam)), 0.0, 1.0);
      float angle = degrees(acos(facing));
      float lit = 0.5 + 0.5 * facing;

      if (uPickMode > 0.5) {
        // R = lemez sorszáma, G = becsapódási szög (0-90 -> 0-1), B = találat
        gl_FragColor = vec4(vPlate / 255.0, angle / 90.0, 1.0, 1.0);
        return;
      }

      float kind = floor(vKind + 0.5);
      if (kind > 2.5) { gl_FragColor = vec4(vec3(0.40, 0.41, 0.40) * lit, 1.0); return; }
      if (kind > 1.5) { gl_FragColor = vec4(vec3(0.24, 0.24, 0.22) * lit, 1.0); return; }

      float mm = vMM, norm = uNorm, rico = uRico;
      if (uCaliber > 0.0) {
        // átfedés (overmatch): 2x fölött nő a normalizáció, 3x fölött nincs lepattanás
        if (uCaliber > 2.0 * mm) norm = norm * 1.4 * uCaliber / (2.0 * mm);
        if (uCaliber >= 3.0 * mm) rico = 90.0;
      }

      vec3 col;
      if (angle >= rico) {
        col = vec3(0.45, 0.14, 0.12);                       // lepattan
      } else {
        float eff = mm / max(cos(radians(max(angle - norm, 0.0))), 0.02);
        float r = uPen / eff;
        col = r >= 1.1  ? vec3(0.30, 0.70, 0.30)            // átmegy
            : r >= 0.9  ? vec3(0.90, 0.64, 0.14)            // bizonytalan (±10% szórás)
                        : vec3(0.78, 0.22, 0.17);           // nem megy át
      }
      // térelválasztott páncél: kékes árnyalat — nem sebez, csak elnyel
      if (kind > 0.5) col = mix(col, vec3(0.25, 0.45, 0.85), 0.55);
      gl_FragColor = vec4(col * lit, 1.0);
    }`;

  function compile(gl, type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      throw new Error("shader: " + gl.getShaderInfoLog(s));
    }
    return s;
  }

  /* ------------------------------ nézegető ------------------------------ */

  function Viewer(canvas, opts) {
    opts = opts || {};
    const gl = canvas.getContext("webgl", { antialias: true, alpha: false })
            || canvas.getContext("experimental-webgl");
    if (!gl) throw new Error("Ebben a böngészőben nincs WebGL.");
    this.gl = gl; this.canvas = canvas;
    this.yaw = 30; this.pitch = 18;
    this.shell = "AP"; this.pen = 200; this.caliber = 0;
    this.onPick = opts.onPick || null;
    this.model = null;
    this.ready = false;

    const p = gl.createProgram();
    gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, VERT));
    gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
      throw new Error("program: " + gl.getProgramInfoLog(p));
    }
    this.prog = p;
    this.loc = {
      aPos: gl.getAttribLocation(p, "aPos"),
      aNormal: gl.getAttribLocation(p, "aNormal"),
      aPlate: gl.getAttribLocation(p, "aPlate"),
      aMM: gl.getAttribLocation(p, "aMM"),
      aKind: gl.getAttribLocation(p, "aKind"),
      uMVP: gl.getUniformLocation(p, "uMVP"),
      uModelView: gl.getUniformLocation(p, "uModelView"),
      uPen: gl.getUniformLocation(p, "uPen"),
      uNorm: gl.getUniformLocation(p, "uNorm"),
      uRico: gl.getUniformLocation(p, "uRico"),
      uCaliber: gl.getUniformLocation(p, "uCaliber"),
      uPickMode: gl.getUniformLocation(p, "uPickMode"),
    };

    gl.enable(gl.DEPTH_TEST);
    this._bindInput();
  }

  Viewer.SHELLS = {
    AP:   { norm: 5, rico: 70 },
    APCR: { norm: 2, rico: 70 },
    HEAT: { norm: 0, rico: 85 },
    HE:   { norm: 0, rico: 90 },
  };

  /**
   * Betölti a tools/build_armor_models.py által készített modellt.
   * A .bin (2. formátum): int16 x3 csúcsok, uint16 x3 indexek, uint8 lemez/háromszög.
   */
  Viewer.prototype.load = async function (base) {
    const [meta, buf] = await Promise.all([
      fetch(base + ".json").then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); }),
      fetch(base + ".bin").then((r) => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); }),
    ]);
    const V = meta.vertexCount, T = meta.triCount, sc = meta.scale;
    const verts = new Int16Array(buf, 0, V * 3);
    const idx = new Uint16Array(buf, V * 6, T * 3);
    const plateOf = new Uint8Array(buf, V * 6 + T * 6, T);

    const KIND = { armor: 0, track: 2, gun: 3, optics: 3 };
    const plates = meta.plates;
    const n = T * 3;
    const pos = new Float32Array(n * 3), nrm = new Float32Array(n * 3);
    const pl = new Float32Array(n), mm = new Float32Array(n), kind = new Float32Array(n);
    const bb = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];

    for (let t = 0; t < T; t++) {
      const p = [0, 1, 2].map((k) => {
        const i = idx[t * 3 + k] * 3;
        return [verts[i] / sc, verts[i + 1] / sc, verts[i + 2] / sc];
      });
      const u = [p[1][0]-p[0][0], p[1][1]-p[0][1], p[1][2]-p[0][2]];
      const w = [p[2][0]-p[0][0], p[2][1]-p[0][1], p[2][2]-p[0][2]];
      let nx = u[1]*w[2]-u[2]*w[1], ny = u[2]*w[0]-u[0]*w[2], nz = u[0]*w[1]-u[1]*w[0];
      const L = Math.hypot(nx, ny, nz) || 1; nx /= L; ny /= L; nz /= L;

      const plate = plates[plateOf[t]] || { mm: 0, kind: "gun" };
      let k = KIND[plate.kind] != null ? KIND[plate.kind] : 0;
      if (k === 0 && plate.spaced) k = 1;
      if (k <= 1 && !(plate.mm > 0)) k = 3;       // 0 mm-es lemez: nem páncél

      for (let v = 0; v < 3; v++) {
        const o = (t * 3 + v);
        for (let c = 0; c < 3; c++) {
          pos[o * 3 + c] = p[v][c];
          if (p[v][c] < bb[c]) bb[c] = p[v][c];
          if (p[v][c] > bb[3 + c]) bb[3 + c] = p[v][c];
        }
        nrm[o * 3] = nx; nrm[o * 3 + 1] = ny; nrm[o * 3 + 2] = nz;
        pl[o] = plateOf[t]; mm[o] = plate.mm || 0; kind[o] = k;
      }
    }

    const gl = this.gl;
    const mk = (data) => {
      const b = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, b);
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
      return b;
    };
    // A keretezéshez a csúcsok egy mintája (legfeljebb ~3000 pont)
    const step = Math.max(1, Math.floor(n / 3000));
    const fit = [];
    for (let i = 0; i < n; i += step) fit.push(pos[i*3], pos[i*3+1], pos[i*3+2]);
    this.model = {
      meta, count: n, bbox: bb, fit: new Float32Array(fit),
      pos: mk(pos), nrm: mk(nrm), pl: mk(pl), mm: mk(mm), kind: mk(kind),
    };
    this.ready = true;
    this.draw();
    return meta;
  };

  Viewer.prototype.setShell = function (type, pen, caliber) {
    this.shell = type;
    this.pen = pen == null ? 0 : pen;
    this.caliber = caliber || 0;
    this.draw();
  };

  Viewer.prototype.setAngles = function (yaw, pitch) {
    this.yaw = ((yaw % 360) + 360) % 360;
    this.pitch = Math.max(-85, Math.min(85, pitch));
    this.draw();
  };

  Viewer.prototype._matrices = function () {
    const c = this.canvas;
    const aspect = c.width / c.height;
    // Szűk látószög (≈17°, „teleobjektív”): szemből így a kamera felé álló
    // lövegcső nem nő óriásira, és nem takarja el a tornyot.
    const fov = 0.3;
    const proj = M4.perspective(fov, aspect, 0.5, 200);
    const rot = M4.mul(M4.rotX(this.pitch * Math.PI / 180), M4.rotY(this.yaw * Math.PI / 180));

    // A befoglaló doboz nyolc sarkát elforgatjuk, és abból számoljuk, milyen
    // messziről fér bele a képbe — így minden nézetben kitölti a keretet.
    // Pontonként kiszámoljuk, milyen messze kell lennie a kamerának, hogy
    // az a pont még beleférjen a képbe (a kamera felé eső pontoknak több hely
    // kell). A befoglaló doboz sarkai helyett a tényleges csúcsokat nézzük:
    // szemből a doboz sarka a lövegcső végének magasságában a lánctalp
    // szélessége lenne — ilyen pont nincs, és feleslegesen eltolná a kamerát.
    const f = (this.model && this.model.fit) || new Float32Array([-1,-1,-1, 1,1,1]);
    const ty = Math.tan(fov / 2), tx = ty * aspect;
    let dist = 0;
    for (let i = 0; i < f.length; i += 3) {
      const x = rot[0]*f[i] + rot[4]*f[i+1] + rot[8]*f[i+2];
      const y = rot[1]*f[i] + rot[5]*f[i+1] + rot[9]*f[i+2];
      const z = rot[2]*f[i] + rot[6]*f[i+1] + rot[10]*f[i+2];
      dist = Math.max(dist, z + Math.abs(x) / tx, z + Math.abs(y) / ty);
    }
    dist *= 1.06;                                // kis margó
    const mv = M4.mul(M4.translate(0, 0, -dist), rot);
    return { mv, mvp: M4.mul(proj, mv) };
  };

  Viewer.prototype._render = function (pickMode) {
    const gl = this.gl, m = this.model;
    if (!m) return;
    const { mv, mvp } = this._matrices();

    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(0.10, 0.13, 0.09, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(this.prog);

    const attr = (buf, loc, size) => {
      if (loc < 0) return;
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
    };
    attr(m.pos, this.loc.aPos, 3);
    attr(m.nrm, this.loc.aNormal, 3);
    attr(m.pl, this.loc.aPlate, 1);
    attr(m.mm, this.loc.aMM, 1);
    attr(m.kind, this.loc.aKind, 1);

    gl.uniformMatrix4fv(this.loc.uMVP, false, mvp);
    gl.uniformMatrix4fv(this.loc.uModelView, false, mv);
    const s = Viewer.SHELLS[this.shell] || Viewer.SHELLS.AP;
    gl.uniform1f(this.loc.uPen, this.pen);
    gl.uniform1f(this.loc.uNorm, s.norm);
    gl.uniform1f(this.loc.uRico, s.rico);
    gl.uniform1f(this.loc.uCaliber, this.caliber);
    gl.uniform1f(this.loc.uPickMode, pickMode ? 1 : 0);

    gl.drawArrays(gl.TRIANGLES, 0, m.count);
  };

  Viewer.prototype.draw = function () { this._render(false); };

  /**
   * A kiolvasáshoz külön képpuffer kell: az alapértelmezett rajzpuffer
   * élsimított, és a böngésző a kompozitálás után törli, ezért a readPixels
   * ott megbízhatatlan.
   */
  Viewer.prototype._pickBuffer = function () {
    const gl = this.gl, w = this.canvas.width, h = this.canvas.height;
    if (this._fbo && this._fboW === w && this._fboH === h) return this._fbo;
    if (this._fbo) {
      gl.deleteFramebuffer(this._fbo);
      gl.deleteTexture(this._fboTex);
      gl.deleteRenderbuffer(this._fboDepth);
    }
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    const depth = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, depth);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, w, h);
    const fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depth);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    this._fbo = fbo; this._fboTex = tex; this._fboDepth = depth;
    this._fboW = w; this._fboH = h;
    return fbo;
  };

  /** Koppintás: a zónát és a becsapódási szöget a képpontból olvassuk vissza. */
  Viewer.prototype.pickAt = function (px, py) {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this._pickBuffer());
    this._render(true);
    const buf = new Uint8Array(4);
    gl.readPixels(px, this.canvas.height - py, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, buf);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    this.draw();
    if (buf[2] === 0) return null;             // háttér
    const plate = this.model.meta.plates[buf[0]];
    if (!plate) return null;
    const angle = buf[1] / 255 * 90;
    const nominal = plate.mm || 0;
    const decor = plate.kind !== "armor" || !(nominal > 0);
    const s = Viewer.SHELLS[this.shell] || Viewer.SHELLS.AP;
    let norm = s.norm, rico = s.rico;
    if (this.caliber > 0 && nominal > 0) {
      if (this.caliber > 2 * nominal) norm = norm * 1.4 * this.caliber / (2 * nominal);
      if (this.caliber >= 3 * nominal) rico = 90;
    }
    const ricochet = !decor && angle >= rico;
    const effective = ricochet ? Infinity
      : nominal / Math.max(Math.cos((Math.max(angle - norm, 0)) * Math.PI / 180), 0.02);
    const info = { plate, angle, nominal, effective, ricochet, decor,
                   spaced: !!plate.spaced, overmatch: this.caliber >= 3 * nominal && nominal > 0 };
    if (this.onPick) this.onPick(info);
    return info;
  };

  /* --------------------------- érintés / egér --------------------------- */

  Viewer.prototype._bindInput = function () {
    const c = this.canvas;
    let drag = null, moved = 0;
    const start = (x, y) => { drag = { x, y }; moved = 0; };
    const move = (x, y) => {
      if (!drag) return;
      const dx = x - drag.x, dy = y - drag.y;
      moved += Math.abs(dx) + Math.abs(dy);
      this.setAngles(this.yaw - dx * 0.55, this.pitch + dy * 0.55);
      drag = { x, y };
    };
    const end = (x, y) => {
      if (drag && moved < 7) {
        const r = c.getBoundingClientRect();
        this.pickAt(Math.round((x - r.left) * c.width / r.width),
                    Math.round((y - r.top) * c.height / r.height));
      }
      drag = null;
    };
    c.addEventListener("touchstart", (e) => { e.preventDefault(); start(e.touches[0].clientX, e.touches[0].clientY); }, { passive: false });
    c.addEventListener("touchmove", (e) => { e.preventDefault(); move(e.touches[0].clientX, e.touches[0].clientY); }, { passive: false });
    c.addEventListener("touchend", (e) => { const t = e.changedTouches[0]; end(t.clientX, t.clientY); });
    c.addEventListener("mousedown", (e) => start(e.clientX, e.clientY));
    window.addEventListener("mousemove", (e) => move(e.clientX, e.clientY));
    window.addEventListener("mouseup", (e) => end(e.clientX, e.clientY));
  };

  global.ArmorGL = { Viewer, M4 };
})(window);
