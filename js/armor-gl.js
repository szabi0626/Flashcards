/*
 * Forgatható páncélnézegető — WebGL.
 *
 * A modell valódi 3D háló (lásd CREDITS.md). Minden háromszög tartozik egy
 * páncélzónához, és a zónához tartozik egy nominális vastagság. A lényeg,
 * hogy a SZÍNT nem előre számoljuk ki, hanem a shader dönti el képpontonként
 * az AKTUÁLIS nézőszögből:
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
 * A csúcsok nincsenek megosztva a háromszögek között, ezért a normál és a
 * zóna a lapon belül végig azonos — így lapos árnyalást kapunk külön
 * "flat" minősítő nélkül, és WebGL 1 alatt is működik.
 */

(function (global) {
  "use strict";

  const MAX_ZONES = 16;

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

  const VERT = `
    attribute vec3 aPos;
    attribute vec3 aNormal;
    attribute float aZone;
    uniform mat4 uMVP;
    uniform mat4 uModelView;
    varying vec3 vNormalView;
    varying float vZone;
    varying float vDepthShade;
    void main() {
      gl_Position = uMVP * vec4(aPos, 1.0);
      // A normált nézeti térbe visszük; forgatás-only mátrix, így elég a 3x3.
      vNormalView = normalize(mat3(uModelView) * aNormal);
      vZone = aZone;
      vDepthShade = 1.0;
    }`;

  const FRAG = `
    precision highp float;
    varying vec3 vNormalView;
    varying float vZone;

    uniform float uNominal[${MAX_ZONES}];   // mm, zónánként
    uniform float uDecor[${MAX_ZONES}];     // 1 = nem páncél (löveg, lánctalp)
    uniform float uPen;                     // a lövedék penetrációja, mm (<0 = nincs)
    uniform float uNorm;                    // normalizáció, fok
    uniform float uRico;                    // lepattanási szög, fok
    uniform float uCaliber;                 // mm
    uniform float uPickMode;                // 1 = zóna/szög kiolvasás

    const float PI = 3.14159265;

    void main() {
      int zi = int(vZone + 0.5);
      float nominal = 0.0, decor = 0.0;
      for (int i = 0; i < ${MAX_ZONES}; i++) {
        if (i == zi) { nominal = uNominal[i]; decor = uDecor[i]; }
      }

      // A kamera a nézeti tér +Z felől néz; a lövedék -Z irányban halad.
      vec3 n = normalize(vNormalView);
      float facing = clamp(n.z, 0.0, 1.0);
      float angle = degrees(acos(facing));

      // Fény: a felület dőlése adja az árnyalást, hogy a forma olvasható legyen
      float lit = 0.55 + 0.45 * facing;

      if (uPickMode > 0.5) {
        // R = zóna index, G = becsapódási szög (0-90 -> 0-1)
        gl_FragColor = vec4(float(zi) / 255.0, angle / 90.0, 1.0, 1.0);
        return;
      }

      if (decor > 0.5) {                       // löveg, lánctalp: semleges
        gl_FragColor = vec4(vec3(0.34, 0.36, 0.30) * lit, 1.0);
        return;
      }

      float norm = uNorm, rico = uRico;
      if (uCaliber > 0.0) {
        if (uCaliber > 2.0 * nominal) norm = norm * 1.4 * uCaliber / (2.0 * nominal);
        if (uCaliber >= 3.0 * nominal) rico = 90.0;
      }

      vec3 col;
      if (angle >= rico) {
        col = vec3(0.42, 0.13, 0.10);          // lepattan: sötét bordó
      } else {
        float eff = nominal / max(cos(radians(max(angle - norm, 0.0))), 0.02);
        if (uPen < 0.0) {
          col = eff < 180.0 ? vec3(0.30,0.69,0.31)
              : eff <= 250.0 ? vec3(0.88,0.63,0.13)
                             : vec3(0.75,0.22,0.17);
        } else {
          float r = uPen / eff;
          col = r >= 1.15 ? vec3(0.30,0.69,0.31)
              : r >= 0.95 ? vec3(0.88,0.63,0.13)
                          : vec3(0.75,0.22,0.17);
        }
      }
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
    this.shell = "AP"; this.pen = -1; this.caliber = 0;
    this.zoneInfo = opts.zones || {};
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
      aZone: gl.getAttribLocation(p, "aZone"),
      uMVP: gl.getUniformLocation(p, "uMVP"),
      uModelView: gl.getUniformLocation(p, "uModelView"),
      uPen: gl.getUniformLocation(p, "uPen"),
      uNorm: gl.getUniformLocation(p, "uNorm"),
      uRico: gl.getUniformLocation(p, "uRico"),
      uCaliber: gl.getUniformLocation(p, "uCaliber"),
      uPickMode: gl.getUniformLocation(p, "uPickMode"),
      uNominal: gl.getUniformLocation(p, "uNominal[0]"),
      uDecor: gl.getUniformLocation(p, "uDecor[0]"),
    };

    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);
    this._bindInput();
  }

  Viewer.SHELLS = {
    AP:   { norm: 5, rico: 70 },
    APCR: { norm: 2, rico: 70 },
    HEAT: { norm: 0, rico: 85 },
    HE:   { norm: 0, rico: 90 },
  };

  /**
   * Betölti a tools/export_model.py által készített bináris modellt.
   * A .bin felépítése: int16 pozíciók, int8 normálok, uint8 zónaindexek.
   */
  Viewer.prototype.load = async function (base) {
    const [meta, buf] = await Promise.all([
      fetch(base + ".json").then((r) => r.json()),
      fetch(base + ".bin").then((r) => r.arrayBuffer()),
    ]);
    const n = meta.vertexCount;
    const gl = this.gl;
    let off = 0;
    const pos = new Int16Array(buf, off, n * 3); off += n * 3 * 2;
    const nrm = new Int8Array(buf, off, n * 3);  off += n * 3;
    const zon = new Uint8Array(buf, off, n);

    const mk = (data, type) => {
      const b = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, b);
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
      return b;
    };
    // Befoglaló doboz a keretezéshez. A löveg miatt a modell sokkal
    // hosszabb, mint amilyen széles, ezért a kamera távolságát nézetenként
    // kell igazítani — különben szemből parányi lesz a tank.
    let bb = [Infinity,Infinity,Infinity,-Infinity,-Infinity,-Infinity];
    for (let i = 0; i < n; i++) {
      for (let k = 0; k < 3; k++) {
        const v = pos[i*3+k] / 32767;
        if (v < bb[k]) bb[k] = v;
        if (v > bb[3+k]) bb[3+k] = v;
      }
    }
    this.model = {
      meta, count: n, bbox: bb,
      pos: mk(pos), nrm: mk(nrm), zon: mk(new Float32Array(zon)),
    };
    this.ready = true;
    this.draw();
    return meta;
  };

  /** Zónánkénti vastagság és "nem páncél" jelzés beállítása. */
  Viewer.prototype.setZoneArmor = function (nominalByZone, decorZones) {
    const zones = (this.model && this.model.meta.zones) || [];
    const nom = new Float32Array(MAX_ZONES);
    const dec = new Float32Array(MAX_ZONES);
    zones.forEach((z, i) => {
      nom[i] = nominalByZone[z] || 0;
      dec[i] = decorZones.indexOf(z) >= 0 ? 1 : 0;
    });
    this.nominal = nom; this.decor = dec;
    this.draw();
  };

  Viewer.prototype.setShell = function (type, pen, caliber) {
    this.shell = type;
    this.pen = pen == null ? -1 : pen;
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
    const fov = 0.62;
    const proj = M4.perspective(fov, aspect, 0.05, 60);
    const rot = M4.mul(M4.rotX(this.pitch * Math.PI / 180), M4.rotY(this.yaw * Math.PI / 180));

    // A befoglaló doboz nyolc sarkát elforgatjuk, és abból számoljuk, milyen
    // messziről fér bele a képbe — így minden nézetben kitölti a keretet.
    const b = (this.model && this.model.bbox) || [-1,-1,-1,1,1,1];
    let mx = 0, my = 0, mz = 0;
    for (let i = 0; i < 8; i++) {
      const p = [b[(i&1)?3:0], b[(i&2)?4:1], b[(i&4)?5:2]];
      const x = rot[0]*p[0] + rot[4]*p[1] + rot[8]*p[2];
      const y = rot[1]*p[0] + rot[5]*p[1] + rot[9]*p[2];
      const z = rot[2]*p[0] + rot[6]*p[1] + rot[10]*p[2];
      mx = Math.max(mx, Math.abs(x)); my = Math.max(my, Math.abs(y)); mz = Math.max(mz, Math.abs(z));
    }
    const need = Math.max(my / Math.tan(fov/2), mx / (Math.tan(fov/2) * aspect));
    const dist = need * 1.18 + mz;
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

    gl.bindBuffer(gl.ARRAY_BUFFER, m.pos);
    gl.enableVertexAttribArray(this.loc.aPos);
    gl.vertexAttribPointer(this.loc.aPos, 3, gl.SHORT, true, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, m.nrm);
    gl.enableVertexAttribArray(this.loc.aNormal);
    gl.vertexAttribPointer(this.loc.aNormal, 3, gl.BYTE, true, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, m.zon);
    gl.enableVertexAttribArray(this.loc.aZone);
    gl.vertexAttribPointer(this.loc.aZone, 1, gl.FLOAT, false, 0, 0);

    gl.uniformMatrix4fv(this.loc.uMVP, false, mvp);
    gl.uniformMatrix4fv(this.loc.uModelView, false, mv);
    gl.uniform1fv(this.loc.uNominal, this.nominal || new Float32Array(MAX_ZONES));
    gl.uniform1fv(this.loc.uDecor, this.decor || new Float32Array(MAX_ZONES));
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
    const zones = this.model.meta.zones;
    const zone = zones[buf[0]] || null;
    if (!zone) return null;
    const angle = buf[1] / 255 * 90;
    const nominal = (this.nominal || [])[buf[0]] || 0;
    const isDecor = ((this.decor || [])[buf[0]] || 0) > 0.5;
    const s = Viewer.SHELLS[this.shell] || Viewer.SHELLS.AP;
    let norm = s.norm, rico = s.rico;
    if (this.caliber > 0 && nominal > 0) {
      if (this.caliber > 2 * nominal) norm = norm * 1.4 * this.caliber / (2 * nominal);
      if (this.caliber >= 3 * nominal) rico = 90;
    }
    const ricochet = angle >= rico;
    const effective = ricochet ? Infinity
      : nominal / Math.max(Math.cos((Math.max(angle - norm, 0)) * Math.PI / 180), 0.02);
    const info = { zone, angle, nominal, effective, ricochet, decor: isDecor };
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
