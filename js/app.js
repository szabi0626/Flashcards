(function () {
  "use strict";

  const deck = Array.isArray(window.TANKS) ? window.TANKS : [];

  /* ---------------------------------------------------------------- */
  /* Páncél értékelés — a színkód az effektív vastagságból számítódik,  */
  /* hogy ne lehessen kézzel elrontani.                                 */
  /* ---------------------------------------------------------------- */
  const PEN_EASY = 180; // egy átlagos tier 8 AP lövedék ennyit tud
  const PEN_HARD = 250; // efölött csak prémium lőszerrel, ha egyáltalán

  function verdictOf(effective) {
    if (effective < PEN_EASY) return "easy";
    if (effective <= PEN_HARD) return "hard";
    return "no";
  }

  const VERDICT_TEXT = {
    easy: "Átlövöd",
    hard: "Nehéz",
    no: "Ne is próbáld",
  };

  /* ---------------------------------------------------------------- */
  /* Paklik                                                            */
  /* ---------------------------------------------------------------- */
  const DECKS = {
    armor: { label: "Páncél", question: "Hova lősz?", render: renderArmor },
    gun: { label: "Fegyver", question: "Mivel lő rád?", render: renderGun },
    mobility: { label: "Mobilitás", question: "Hogy mozog, meglát?", render: renderMobility },
  };

  let deckKey = "armor";
  let order = deck.map((_, i) => i);
  let pos = 0;
  let flipped = false;
  let gunChoice = "top"; // "stock" | "top"

  /* ---------------------------------------------------------------- */
  /* DOM                                                               */
  /* ---------------------------------------------------------------- */
  const el = {
    card: document.getElementById("card"),
    front: document.getElementById("cardFront"),
    back: document.getElementById("cardBack"),
    progress: document.getElementById("progress"),
    tabs: document.getElementById("deckTabs"),
    btnPrev: document.getElementById("btnPrev"),
    btnNext: document.getElementById("btnNext"),
    btnFlip: document.getElementById("btnFlip"),
    btnShuffle: document.getElementById("btnShuffle"),
  };

  function esc(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));
  }

  function currentTank() {
    return deck[order[pos]];
  }

  /* ---------------------------------------------------------------- */
  /* Sziluett rajzoló                                                  */
  /* ---------------------------------------------------------------- */
  // Képet nem kell beállítani sehol: ha az img/ mappában ott van a tank
  // id-jével elnevezett fájl, magától megtalálja. Ha nincs, marad a rajz.
  //
  // A keresés eredményét tankonként megjegyezzük, hogy lapozgatás közben
  // ne próbálkozzon újra minden kiterjesztéssel (resolved: útvonal, vagy
  // null ha nincs kép).
  const imageCache = new Map();

  function imageCandidates(tank) {
    const auto = ["jpg", "png", "webp"].map((x) => `img/${tank.id}.${x}`);
    return tank.image ? [tank.image, ...auto] : auto;
  }

  function renderSilhouette(tank) {
    const svg = silhouetteSvg(tank);
    const known = imageCache.get(tank.id);

    // Már tudjuk, hogy nincs kép — meg se próbáljuk
    if (known === null) return svg;

    const src = known || imageCandidates(tank)[0];
    return `<img class="tank-photo" src="${esc(src)}" alt="${esc(tank.name)}"${known ? "" : " hidden"}>
            ${known ? "" : `<span class="silhouette-fallback">${svg}</span>`}`;
  }

  function bindImageFallback(root, tank) {
    const img = root.querySelector(".tank-photo");
    if (!img || imageCache.get(tank.id)) return;

    const srcs = imageCandidates(tank);
    let i = 0;

    img.addEventListener("load", () => {
      imageCache.set(tank.id, srcs[i]);
      img.hidden = false;
      const fb = root.querySelector(".silhouette-fallback");
      if (fb) fb.remove();
    });

    img.addEventListener("error", () => {
      i++;
      if (i < srcs.length) {
        img.src = srcs[i];
      } else {
        imageCache.set(tank.id, null); // nincs kép — marad a sziluett
        img.remove();
      }
    });
  }

  function silhouetteSvg(tank) {
    const s = tank.silhouette;
    if (!s) return "";

    let parts = "";

    // lánctalp
    if (s.track) {
      const t = s.track;
      parts += `<rect class="sil-track" x="${t.x0}" y="${t.yTop}" width="${t.x1 - t.x0}" height="${t.yBot - t.yTop}" rx="10"/>`;
    }

    // futógörgők
    if (s.wheels) {
      const w = s.wheels;
      const step = w.count > 1 ? (w.x1 - w.x0) / (w.count - 1) : 0;
      for (let i = 0; i < w.count; i++) {
        parts += `<circle class="sil-wheel" cx="${w.x0 + i * step}" cy="${w.y}" r="${w.r}"/>`;
      }
    }

    // test / torony / cső
    (s.paths || []).forEach((p) => {
      parts += `<path class="sil-${p.fill}" d="${p.d}"/>`;
    });

    return `<svg class="silhouette" viewBox="${s.viewBox}" role="img"
              aria-label="${esc(tank.name)} oldalnézeti sziluett">${parts}</svg>`;
  }

  /* ---------------------------------------------------------------- */
  /* Páncél séma (elölnézet) — a zónák a `part` mező alapján kapják    */
  /* meg a helyüket, így a data fájlban nem kell SVG-t írni.           */
  /* ---------------------------------------------------------------- */
  const FRONT_PARTS = {
    trackL: { shape: "rect", x: 6, y: 96, w: 30, h: 66, rx: 6 },
    trackR: { shape: "rect", x: 164, y: 96, w: 30, h: 66, rx: 6 },
    lfp: { shape: "poly", points: "36,128 164,128 164,162 36,162" },
    ufp: { shape: "poly", points: "40,92 160,92 164,128 36,128" },
    turretFront: { shape: "poly", points: "56,44 144,44 160,92 40,92" },
    mantlet: { shape: "circle", cx: 100, cy: 72, r: 21 },
    cupola: { shape: "rect", x: 116, y: 28, w: 26, h: 17, rx: 3 },
    roof: { shape: "rect", x: 56, y: 36, w: 88, h: 9, rx: 2 },
    side: { shape: "none" },
    rear: { shape: "none" },
  };

  function shapeSvg(part, cls, zoneId) {
    const p = FRONT_PARTS[part];
    if (!p || p.shape === "none") return "";
    const attrs = `class="${cls}" data-zone="${esc(zoneId)}"`;
    if (p.shape === "rect")
      return `<rect ${attrs} x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" rx="${p.rx || 0}"/>`;
    if (p.shape === "poly") return `<polygon ${attrs} points="${p.points}"/>`;
    if (p.shape === "circle")
      return `<circle ${attrs} cx="${p.cx}" cy="${p.cy}" r="${p.r}"/>`;
    return "";
  }

  function renderSchematic(tank) {
    const zones = tank.armor.zones || [];
    // A rajzolási sorrend számít: a nagy lapok előbb, a rájuk kerülő
    // részletek (ágyúpajzs, kupola) utoljára.
    const drawOrder = ["trackL", "trackR", "lfp", "ufp", "turretFront", "roof", "mantlet", "cupola"];

    let shapes = "";
    drawOrder.forEach((part) => {
      const zone = zones.find((z) => z.part === part);
      if (zone) {
        shapes += shapeSvg(part, `zone zone-${verdictOf(zone.effective)}`, zone.id);
      } else if (part === "trackL" || part === "trackR") {
        shapes += shapeSvg(part, "zone zone-inert", "");
      }
    });

    return `<svg class="schematic" viewBox="0 0 200 172" role="img"
              aria-label="${esc(tank.name)} páncélzónák elölnézetben">${shapes}</svg>`;
  }

  /* ---------------------------------------------------------------- */
  /* Kártya hátlapok                                                   */
  /* ---------------------------------------------------------------- */
  function renderArmor(tank) {
    const zones = tank.armor.zones || [];

    const rows = zones.map((z) => {
      const v = verdictOf(z.effective);
      const angle = z.angle ? ` @${z.angle}°` : "";
      return `
        <div class="zone-row zone-row-${v}" data-zone="${esc(z.id)}">
          <span class="dot dot-${v}"></span>
          <div class="zone-main">
            <div class="zone-label">${esc(z.label)}</div>
            <div class="zone-note">${esc(z.note || "")}</div>
          </div>
          <div class="zone-nums">
            <div class="zone-eff">${z.effective}</div>
            <div class="zone-nom">${z.nominal}mm${angle}</div>
          </div>
        </div>`;
    }).join("");

    return `
      ${renderSchematic(tank)}
      <div class="legend">
        <span><i class="dot dot-easy"></i>&lt;${PEN_EASY} átlövöd</span>
        <span><i class="dot dot-hard"></i>${PEN_EASY}–${PEN_HARD} nehéz</span>
        <span><i class="dot dot-no"></i>&gt;${PEN_HARD} soha</span>
      </div>
      <div class="zone-list">${rows}</div>
      ${tank.lesson ? `<p class="lesson">💡 ${esc(tank.lesson)}</p>` : ""}`;
  }

  function fmt(v, unit) {
    return v === undefined || v === null ? "–" : `${v}${unit || ""}`;
  }

  function renderGun(tank) {
    const guns = tank.guns || [];
    const stockGun = guns.find((g) => g.stock);
    const topGun = guns.find((g) => !g.stock) || stockGun;
    const gun = gunChoice === "stock" ? stockGun || topGun : topGun;
    const other = gun === topGun ? stockGun : topGun;

    // Ha van másik fegyver, mutatjuk a különbséget.
    // A nyíl a szám előjelét jelzi, a szín azt, hogy ez előny-e.
    function delta(key, higherIsBetter) {
      if (!other || other[key] === undefined || gun[key] === undefined) return "";
      const d = Math.round((gun[key] - other[key]) * 100) / 100;
      if (!d) return "";
      const good = higherIsBetter ? d > 0 : d < 0;
      const arrow = d > 0 ? "▲" : "▼";
      const sign = d > 0 ? "+" : "−";
      return `<span class="delta ${good ? "delta-good" : "delta-bad"}">${arrow} ${sign}${Math.abs(d)}</span>`;
    }

    function row(label, value, key, higherIsBetter) {
      return `<div class="stat-row">
        <span class="label">${label}</span>
        <span class="value">${value}${key ? delta(key, higherIsBetter) : ""}</span>
      </div>`;
    }

    const isClip = !!gun.clip;
    const clipRows = isClip
      ? row("Klip", `${gun.clip} lövedék`, "clip", true) +
        row("Klip sebzés", `${gun.clip * gun.alpha}`, null) +
        row("Lövés a klipben", `${gun.intraClip} s`, "intraClip", false) +
        row("Klip újratöltés", `${gun.clipReload} s`, "clipReload", false)
      : row("Újratöltés", `${gun.reload} s`, "reload", false);

    const toggle = guns.length > 1
      ? `<div class="gun-toggle" id="gunToggle">
           <button class="${gunChoice === "stock" ? "on" : ""}" data-gun="stock">Stock</button>
           <button class="${gunChoice === "top" ? "on" : ""}" data-gun="top">Fejlesztett</button>
         </div>`
      : "";

    return `
      ${toggle}
      <div class="gun-name">${esc(gun.name)}</div>
      <div class="stats-block">
        ${row("Alpha (sebzés)", gun.alpha, "alpha", true)}
        ${row("Pen AP", `${gun.penAP} mm`, "penAP", true)}
        ${row("Pen APCR/prém.", `${gun.penAPCR} mm`, "penAPCR", true)}
        ${row("Pen HE", `${gun.penHE} mm`, "penHE", true)}
        ${clipRows}
        ${row("DPM", gun.dpm, "dpm", true)}
        ${row("Szórás", gun.accuracy.toFixed(2), "accuracy", false)}
        ${row("Célzási idő", `${gun.aimTime} s`, "aimTime", false)}
        ${row("Csőbólintás", `${gun.depression}°`, null)}
      </div>
      ${other ? `<p class="lesson">A szám a másik fegyverhez képesti különbség.
        <b style="color:var(--easy)">Zöld</b> = ez a fegyver jobb ebben,
        <b style="color:var(--no)">piros</b> = rosszabb.</p>` : ""}`;
  }

  function renderMobility(tank) {
    const m = tank.mobility || {};
    const v = tank.vision || {};
    return `
      <div class="stats-block">
        <div class="stat-row"><span class="label">Életerő</span><span class="value">${tank.hp} HP</span></div>
        <div class="stat-row"><span class="label">Tömeg</span><span class="value">${fmt(tank.weight, " t")}</span></div>
        <div class="stat-row"><span class="label">Végsebesség</span><span class="value">${fmt(m.topSpeed, " km/h")}</span></div>
        <div class="stat-row"><span class="label">Hátramenet</span><span class="value">${fmt(m.reverse, " km/h")}</span></div>
        <div class="stat-row"><span class="label">Teljesítmény</span><span class="value">${fmt(m.hpPerTon, " LE/t")}</span></div>
        <div class="stat-row"><span class="label">Fordulás</span><span class="value">${fmt(m.traverse, " °/s")}</span></div>
      </div>
      <div class="block-title">Felderítés</div>
      <div class="stats-block">
        <div class="stat-row"><span class="label">Nézőtáv</span><span class="value">${fmt(v.viewRange, " m")}</span></div>
        <div class="stat-row"><span class="label">Álca (állva)</span><span class="value">${fmt(v.camoStill, "%")}</span></div>
        <div class="stat-row"><span class="label">Álca (mozgás)</span><span class="value">${fmt(v.camoMoving, "%")}</span></div>
      </div>`;
  }

  /* ---------------------------------------------------------------- */
  /* Fő render                                                         */
  /* ---------------------------------------------------------------- */
  function render() {
    const tank = currentTank();
    const cfg = DECKS[deckKey];

    if (!tank) {
      el.front.innerHTML = `<p class="placeholder">Üres a pakli.</p>`;
      el.back.innerHTML = "";
      el.progress.textContent = "0 / 0";
      return;
    }

    el.front.innerHTML = `
      <div class="tank-meta-top">${tank.flag || ""} ${esc(tank.nationHu)} · Tier ${tank.tier} · ${esc(tank.typeHu)}</div>
      ${renderSilhouette(tank)}
      <div class="tank-name">${esc(tank.name)}</div>
      <div class="question">${esc(cfg.question)}</div>
      ${tank.verified ? "" : `<div class="unverified" title="Az adatok nincsenek ellenőrizve">⚠︎ ellenőrizetlen adat</div>`}
      <div class="tap-hint">Koppints a válaszért</div>`;

    bindImageFallback(el.front, tank);

    el.back.innerHTML = `
      <div class="back-title">${esc(tank.name)} — ${esc(cfg.label)}</div>
      ${cfg.render(tank)}`;

    el.progress.textContent = `${pos + 1} / ${order.length}`;
  }

  function setFlipped(state) {
    flipped = state;
    el.card.classList.toggle("flipped", flipped);
  }

  function go(delta) {
    if (!order.length) return;
    pos = (pos + delta + order.length) % order.length;
    setFlipped(false);
    render();
    el.back.scrollTop = 0;
  }

  function shuffle() {
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    pos = 0;
    setFlipped(false);
    render();
  }

  /* ---------------------------------------------------------------- */
  /* Pakli fülek                                                       */
  /* ---------------------------------------------------------------- */
  function renderTabs() {
    el.tabs.innerHTML = Object.entries(DECKS)
      .map(([key, cfg]) =>
        `<button class="tab ${key === deckKey ? "on" : ""}" data-deck="${key}">${cfg.label}</button>`
      ).join("");
  }

  el.tabs.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-deck]");
    if (!btn) return;
    deckKey = btn.dataset.deck;
    renderTabs();
    setFlipped(false);
    render();
  });

  /* ---------------------------------------------------------------- */
  /* Interakció                                                        */
  /* ---------------------------------------------------------------- */
  el.card.addEventListener("click", (e) => {
    // A hátlapon lévő vezérlők ne fordítsák meg a kártyát
    const gunBtn = e.target.closest("[data-gun]");
    if (gunBtn) {
      gunChoice = gunBtn.dataset.gun;
      render();
      setFlipped(true);
      return;
    }
    if (e.target.closest("[data-zone]")) {
      const id = e.target.closest("[data-zone]").dataset.zone;
      if (id) highlightZone(id);
      return;
    }
    setFlipped(!flipped);
  });

  function highlightZone(id) {
    el.back.querySelectorAll("[data-zone]").forEach((n) => {
      n.classList.toggle("zone-active", n.dataset.zone === id);
    });
  }

  el.btnFlip.addEventListener("click", (e) => { e.stopPropagation(); setFlipped(!flipped); });
  el.btnNext.addEventListener("click", (e) => { e.stopPropagation(); go(1); });
  el.btnPrev.addEventListener("click", (e) => { e.stopPropagation(); go(-1); });
  el.btnShuffle.addEventListener("click", (e) => { e.stopPropagation(); shuffle(); });

  document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") go(1);
    else if (e.key === "ArrowLeft") go(-1);
    else if (e.key === " ") { e.preventDefault(); setFlipped(!flipped); }
  });

  // Swipe — csak akkor lapoz, ha a mozdulat vízszintes, hogy a hátlap
  // görgetését ne akassza meg.
  let touch = null;
  el.card.addEventListener("touchstart", (e) => {
    const t = e.changedTouches[0];
    touch = { x: t.clientX, y: t.clientY };
  }, { passive: true });

  el.card.addEventListener("touchend", (e) => {
    if (!touch) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touch.x;
    const dy = t.clientY - touch.y;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      go(dx < 0 ? 1 : -1);
    }
    touch = null;
  }, { passive: true });

  /* ---------------------------------------------------------------- */
  renderTabs();
  render();

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").catch(() => {});
    });
  }
})();
