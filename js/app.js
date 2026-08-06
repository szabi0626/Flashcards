(function () {
  "use strict";

  const deck = Array.isArray(window.TANKS) ? window.TANKS : [];
  const ZONES = window.ARMOR_ZONES || {};
  const CLIPS = window.CLIPS || {};
  const CAMO = window.CAMO || {};

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

  /* ---------------------------------------------------------------- */
  /* Paklik                                                            */
  /* ---------------------------------------------------------------- */
  const DECKS = {
    armor: { label: "Páncél", question: "Hova lősz?", render: renderArmor },
    gun: { label: "Fegyver", question: "Mivel lő rád?", render: renderGun },
    mobility: { label: "Mobilitás", question: "Hogy mozog, meglát?", render: renderMobility },
  };

  let deckKey = "armor";
  let pos = 0;
  let flipped = false;
  let gunIndex = null; // null = alapértelmezés (az utolsó, teljesen fejlesztett)

  /* ---------------------------------------------------------------- */
  /* Szűrés — 260 tier 8 járműnél e nélkül használhatatlan a pakli.    */
  /* ---------------------------------------------------------------- */
  const TYPE_ORDER = ["heavyTank", "mediumTank", "lightTank", "AT-SPG", "SPG"];
  const TYPE_SHORT = {
    heavyTank: "Nehéz", mediumTank: "Közepes", lightTank: "Könnyű",
    "AT-SPG": "Páncélvadász", SPG: "Tüzér",
  };
  const NATION_FLAG = {
    ussr: "🇷🇺", germany: "🇩🇪", usa: "🇺🇸", france: "🇫🇷", uk: "🇬🇧",
    china: "🇨🇳", japan: "🇯🇵", czech: "🇨🇿", sweden: "🇸🇪",
    poland: "🇵🇱", italy: "🇮🇹",
  };

  /* ---------------------------------------------------------------- */
  /* Tüzelési mód                                                       */
  /*                                                                    */
  /* Az API nem árulja el közvetlenül, hogy egy fegyver táras-e: nincs   */
  /* klip mező, és a `rapid` mindig null. De a tűzgyorsaság elárulja.    */
  /* Egylövetű ágyúnál fire_rate = 60 / újratöltés; ha ennél érdemben    */
  /* több lövés fér bele egy percbe, akkor tárból tüzel.                 */
  /*                                                                    */
  /* A tűzgyorsaságot a DPM-ből nyerjük vissza (dpm = alpha * fire_rate);*/
  /* a DPM egészre kerekítve van, de az ebből adódó hiba ezredrésznyi.   */
  /*                                                                    */
  /* A 260 járművön a két csoport között üres sáv van (12 és 20 lövés/   */
  /* perc között egyetlen fegyver sincs), ezért a 15-ös határ biztonságos.*/
  /*                                                                    */
  /* A klip MÉRETÉT szándékosan nem becsüljük: az AMX 50 100 két         */
  /* fegyverére az API azonos fire_rate-et ad, pedig eltér a klipjük —   */
  /* az ebből számolt lövedékszám kitalált adat lenne.                   */
  /* ---------------------------------------------------------------- */
  function fireMode(gun) {
    if (!gun || !gun.alpha || !gun.reload) return null;
    const rate = gun.dpm / gun.alpha;              // lövés / perc
    if (rate / (60 / gun.reload) < 1.05) return null;   // hagyományos ágyú
    return rate >= 15
      ? { key: "auto", label: "Sorozatlövő", rate }
      : { key: "mag", label: "Táras", rate };
  }

  /** A tank legerősebb tüzelési módja — a kártya előlapjára. */
  function tankFireMode(tank) {
    for (const g of tank.guns || []) {
      const m = fireMode(g);
      if (m) return m;
    }
    return null;
  }

  // A hivatalos WoT osztály-jelek (rombusz / csíkos rombusz / háromszög /
  // négyzet), a Wargaming saját webes tankopédiájából. Lásd CREDITS.md.
  const TYPE_ICON = {
    lightTank: "lighttank", mediumTank: "mediumtank", heavyTank: "heavytank",
    "AT-SPG": "at-spg", SPG: "spg",
  };
  const typeIcon = (type, cls) =>
    TYPE_ICON[type]
      ? `<img class="${cls || "class-icon"}" src="img/class/${TYPE_ICON[type]}.png" alt="">`
      : "";

  const filter = { nations: new Set(), types: new Set(), premium: "all", fire: "all" };
  let order = [];
  let filterOpen = false;

  function matches(t) {
    if (filter.nations.size && !filter.nations.has(t.nation)) return false;
    if (filter.types.size && !filter.types.has(t.type)) return false;
    if (filter.premium === "tech" && t.isPremium) return false;
    if (filter.premium === "prem" && !t.isPremium) return false;
    if (filter.fire !== "all") {
      const m = tankFireMode(t);
      if (filter.fire === "single" ? m : !m || m.key !== filter.fire) return false;
    }
    return true;
  }

  function applyFilter(keepTank) {
    const before = keepTank && deck[order[pos]];
    order = deck.map((_, i) => i).filter((i) => matches(deck[i]));
    const at = before ? order.indexOf(deck.indexOf(before)) : -1;
    pos = at >= 0 ? at : 0;
    gunIndex = null;
    setFlipped(false);
    render();
    renderFilterBar();
  }

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

  const currentTank = () => deck[order[pos]];
  const zonesOf = (tank) => (ZONES[tank.id] || {}).zones || [];
  const lessonOf = (tank) => (ZONES[tank.id] || {}).lesson || "";
  const zonesVerified = (tank) => !!(ZONES[tank.id] || {}).verified;

  /* ---------------------------------------------------------------- */
  /* Páncél séma (elölnézet) — a zónák a `part` mező alapján kapják    */
  /* meg a helyüket, így az adatfájlban nem kell SVG-t írni.           */
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
    const a = `class="${cls}" data-zone="${esc(zoneId)}"`;
    if (p.shape === "rect")
      return `<rect ${a} x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" rx="${p.rx || 0}"/>`;
    if (p.shape === "poly") return `<polygon ${a} points="${p.points}"/>`;
    if (p.shape === "circle") return `<circle ${a} cx="${p.cx}" cy="${p.cy}" r="${p.r}"/>`;
    return "";
  }

  function renderSchematic(tank) {
    const zones = zonesOf(tank);
    // Rajzolási sorrend: a nagy lapok előbb, a rájuk kerülő részletek utoljára.
    const drawOrder = ["trackL", "trackR", "lfp", "ufp", "turretFront", "roof", "mantlet", "cupola"];
    let shapes = "";
    drawOrder.forEach((part) => {
      const zone = zones.find((z) => z.part === part);
      if (zone) shapes += shapeSvg(part, `zone zone-${verdictOf(zone.effective)}`, zone.id);
      else if (part === "trackL" || part === "trackR") shapes += shapeSvg(part, "zone zone-inert", "");
    });
    return `<svg class="schematic" viewBox="0 0 200 172" role="img"
              aria-label="${esc(tank.name)} páncélzónák elölnézetben">${shapes}</svg>`;
  }

  /* ---------------------------------------------------------------- */
  /* Hátlapok                                                          */
  /* ---------------------------------------------------------------- */
  function renderArmor(tank) {
    const zones = zonesOf(tank);
    const a = tank.armor;

    // A legtöbb tankhoz nincs kézzel felvett zónánk (260 jármű van, öthöz
    // készült). Ilyenkor a hiteles API-értékeket mutatjuk, találgatás nélkül.
    if (!zones.length) {
      const cmp = (v) => `<span class="dot dot-${verdictOf(v)}"></span>`;
      const row = (label, v) => statRow(label, `${cmp(v)} ${v} mm`);
      // A vadászpáncélosoknak és tüzéreknek gyakran nincs forgó tornyuk.
      const turret = a.turret
        ? row("Torony elöl", a.turret.front) + row("Torony oldalt", a.turret.sides)
          + row("Torony hátul", a.turret.rear)
        : statRow("Torony", "nincs (fix harcitér)");
      return `
        <div class="block-title">Nominális vastagság (WG API)</div>
        <div class="stats-block">
          ${row("Test elöl", a.hull.front)}
          ${row("Test oldalt", a.hull.sides)}
          ${row("Test hátul", a.hull.rear)}
          ${turret}
        </div>
        <p class="source">A pontok a NOMINÁLIS értéket színezik. A valóságban a
          szögelés ennél sokkal többet érhet — egy 110 mm-es lemez 60 fokban
          220 mm-nek felel meg.</p>
        <p class="source source-manual">Ehhez a tankhoz még nincsenek kidolgozott
          páncélzónák (dőlésszögek, gyenge pontok). Egyelőre öt tankhoz készültek el.</p>`;
    }

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
      ${lessonOf(tank) ? `<p class="lesson">💡 ${esc(lessonOf(tank))}</p>` : ""}
      <div class="block-title">Nominális vastagság (WG API)</div>
      <div class="stats-block">
        ${statRow("Test elöl / oldalt / hátul", `${a.hull.front} / ${a.hull.sides} / ${a.hull.rear} mm`)}
        ${a.turret
          ? statRow("Torony elöl / oldalt / hátul",
                    `${a.turret.front} / ${a.turret.sides} / ${a.turret.rear} mm`)
          : statRow("Torony", "nincs")}
      </div>
      <p class="source source-manual">A fenti zónák, szögek és effektív értékek
        <b>kézi becslések</b> — a WG API csak a nominális vastagságot adja.
        Érdemes ellenőrizni tanks.gg-n.</p>`;
  }

  function statRow(label, value, extra) {
    return `<div class="stat-row"><span class="label">${label}</span>
            <span class="value">${value}${extra || ""}</span></div>`;
  }

  function renderGun(tank) {
    const guns = tank.guns || [];
    if (!guns.length) return `<p class="placeholder">Nincs fegyveradat.</p>`;

    const idx = gunIndex === null ? guns.length - 1 : Math.min(gunIndex, guns.length - 1);
    const gun = guns[idx];
    const base = guns[0]; // a stock fegyver a viszonyítási alap
    const clip = (CLIPS[tank.id] || {})[gun.name];

    // A számok a stock fegyverhez képesti különbséget mutatják.
    function delta(key, higherIsBetter) {
      if (gun === base || base[key] == null || gun[key] == null) return "";
      const d = Math.round((gun[key] - base[key]) * 100) / 100;
      if (!d) return "";
      const good = higherIsBetter ? d > 0 : d < 0;
      return `<span class="delta ${good ? "delta-good" : "delta-bad"}">${d > 0 ? "▲ +" : "▼ −"}${Math.abs(d)}</span>`;
    }

    const toggle = guns.length > 1
      ? `<div class="gun-toggle">${guns.map((g, i) => {
          const short = g.name.replace(/\s*\([^)]*\)\s*$/, "");
          return `<button class="${i === idx ? "on" : ""}" data-gun="${i}">
                    ${esc(short)}${g.stock ? '<i class="tag-stock">stock</i>' : ""}
                  </button>`;
        }).join("")}</div>`
      : "";

    const premLabel = gun.premType === "HEAT" ? "Pen HEAT" : "Pen APCR";

    const mode = fireMode(gun);
    const rateRows = clip
      ? statRow("Klip", `${clip.shells} lövedék`) +
        statRow("Klip sebzés", `${clip.shells * gun.alpha}`) +
        statRow("Lövés a klipben", `${clip.intraClip} s`) +
        statRow("Klip újratöltés", `${gun.reload} s`, delta("reload", false))
      : statRow(mode ? "Teljes újratöltés" : "Újratöltés",
                `${gun.reload} s`, delta("reload", false));

    return `
      ${toggle}
      <div class="gun-name">${esc(gun.name)}
        ${mode ? `<span class="fire-badge fire-${mode.key} inline">${mode.label}</span>` : ""}</div>
      ${mode ? `<p class="lesson">${mode.key === "auto"
        ? `Sorozatlövő: rövid idő alatt sok lövedéket zúdít rád, majd
           <b>${gun.reload} másodpercig</b> tölt. Percenként kb.
           ${Math.round(mode.rate)} lövés — a DPM ezt már tartalmazza.`
        : `Tárból tüzel: egymás után több lövedéket ad le, utána
           <b>${gun.reload} másodpercig</b> védtelen. Akkor támadd, ha kiürült.`}</p>` : ""}
      <div class="stats-block">
        ${statRow("Alpha (sebzés)", gun.alpha, delta("alpha", true))}
        ${/* Nem minden lövegnek van mindhárom lőszertípusa — a hiányzót kihagyjuk. */ ""}
        ${gun.penAP != null ? statRow("Pen AP", `${gun.penAP} mm`, delta("penAP", true)) : ""}
        ${gun.penPrem != null ? statRow(premLabel, `${gun.penPrem} mm`, delta("penPrem", true)) : ""}
        ${gun.penHE != null ? statRow("Pen HE", `${gun.penHE} mm`, delta("penHE", true)) : ""}
        ${rateRows}
        ${statRow("DPM", gun.dpm, delta("dpm", true))}
        ${statRow("Szórás", gun.accuracy.toFixed(2), delta("accuracy", false))}
        ${statRow("Célzási idő", `${gun.aimTime} s`, delta("aimTime", false))}
        ${statRow("Csőbólintás", `${gun.depression}°`)}
      </div>
      ${guns.length > 1 && gun !== base
        ? `<p class="lesson">A ▲/▼ a <b>stock</b> fegyverhez képesti különbség.
             <span style="color:var(--easy)">Zöld</span> = ez jobb benne.</p>`
        : ""}
      ${clip ? `<p class="source source-manual">A klip mérete és a lövések közti idő
          <b>kézi adat</b> — a WG API ezeket nem adja. A klip újratöltés hiteles.</p>` : ""}
      ${mode ? `<p class="source">A tüzelési mód a tűzgyorsaság és az újratöltés
        viszonyából derül ki — az API nem adja meg közvetlenül, és a klip
        méretét sem, ezért azt nem találgatjuk.</p>` : ""}
      <p class="source">Alapértékek legénységi képzettség és felszerelés nélkül · WG API</p>`;
  }

  function renderMobility(tank) {
    const m = tank.mobility || {};
    const camo = CAMO[tank.id];
    return `
      <div class="stats-block">
        ${statRow("Életerő", `${tank.hp} HP`)}
        ${statRow("Tömeg", `${tank.weight} t`)}
        ${statRow("Végsebesség", `${m.topSpeed} km/h`)}
        ${statRow("Hátramenet", `${m.reverse} km/h`)}
        ${statRow("Motor", `${m.enginePower} LE`)}
        ${statRow("Teljesítmény", `${m.hpPerTon} LE/t`)}
        ${statRow("Test fordulás", `${m.hullTraverse} °/s`)}
        ${m.turretTraverse != null ? statRow("Torony fordulás", `${m.turretTraverse} °/s`) : ""}
      </div>
      <div class="block-title">Felderítés</div>
      <div class="stats-block">
        ${statRow("Nézőtáv", `${tank.vision.viewRange} m`)}
        ${camo ? statRow("Álca (állva)", `${camo.still}%`) : ""}
        ${camo ? statRow("Álca (mozgás)", `${camo.moving}%`) : ""}
      </div>
      ${camo ? `<p class="source source-manual">Az álca értékek <b>kézi adatok</b> — az API nem adja.</p>` : ""}
      <p class="source">A többi WG API-ból, alapértékek felszerelés nélkül</p>`;
  }

  /* ---------------------------------------------------------------- */
  function render() {
    const tank = currentTank();
    const cfg = DECKS[deckKey];

    if (!tank) {
      el.front.innerHTML = `<p class="placeholder">Egyetlen tank sem felel meg a szűrésnek.</p>`;
      el.back.innerHTML = "";
      el.progress.textContent = "0 / 0";
      return;
    }

    // Figyelmeztetés csak a páncél paklinál kell: a többi adat API-ból hiteles.
    const warn = deckKey === "armor" && !zonesVerified(tank);

    el.front.innerHTML = `
      <div class="tank-meta-top">${tank.flag || ""} ${esc(tank.nationHu)} · Tier ${tank.tier}
        · ${typeIcon(tank.type)} ${esc(tank.typeHu)}</div>
      <img class="tank-photo" src="${esc(tank.image)}" alt="${esc(tank.name)}">
      <div class="tank-name">${esc(tank.name)}</div>
      <div class="question">${esc(cfg.question)}</div>
      ${(() => {
        const m = tankFireMode(tank);
        return m ? `<div class="fire-badge fire-${m.key}">${m.label}</div>` : "";
      })()}
      ${warn ? `<div class="unverified">⚠︎ a páncélzónák becslések</div>` : ""}
      <div class="tap-hint">Koppints a válaszért</div>`;

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
    gunIndex = null;
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
    gunIndex = null;
    setFlipped(false);
    render();
  }

  function renderFilterBar() {
    const bar = document.getElementById("filterBar");
    if (!bar) return;

    const bits = [];
    if (filter.nations.size) bits.push([...filter.nations].map((n) => NATION_FLAG[n] || n).join(""));
    if (filter.types.size) bits.push([...filter.types].map((t) => TYPE_SHORT[t]).join(", "));
    if (filter.premium === "tech") bits.push("tech tree");
    if (filter.premium === "prem") bits.push("prémium");
    if (filter.fire === "mag") bits.push("táras");
    if (filter.fire === "auto") bits.push("sorozatlövő");
    if (filter.fire === "single") bits.push("egylövetű");
    const summary = bits.length ? bits.join(" · ") : "Mind";

    const chip = (on, data, text) =>
      `<button class="chip ${on ? "on" : ""}" ${data}>${text}</button>`;

    const nations = Object.keys(NATION_FLAG)
      .filter((n) => deck.some((t) => t.nation === n))
      .map((n) => chip(filter.nations.has(n), `data-nat="${n}"`,
                       `${NATION_FLAG[n]} ${deck.filter((t) => t.nation === n).length}`))
      .join("");
    const types = TYPE_ORDER
      .filter((ty) => deck.some((t) => t.type === ty))
      .map((ty) => chip(filter.types.has(ty), `data-type="${ty}"`,
                        `${typeIcon(ty, "chip-icon")} ${TYPE_SHORT[ty]}`))
      .join("");
    const prem = [["all", "Mind"], ["tech", "Tech tree"], ["prem", "Prémium"]]
      .map(([v, l]) => chip(filter.premium === v, `data-prem="${v}"`, l)).join("");
    const nFire = (k) => deck.filter((t) => {
      const m = tankFireMode(t);
      return k === "single" ? !m : m && m.key === k;
    }).length;
    const fire = [["all", "Mind"], ["single", `Egylövetű ${nFire("single")}`],
                  ["mag", `Táras ${nFire("mag")}`], ["auto", `Sorozatlövő ${nFire("auto")}`]]
      .map(([v, l]) => chip(filter.fire === v, `data-fire="${v}"`, l)).join("");

    bar.innerHTML = `
      <button class="filter-toggle" id="filterToggle">
        <span>Szűrés: ${esc(summary)}</span>
        <span class="filter-count">${order.length}</span>
      </button>
      <div class="filter-panel ${filterOpen ? "" : "hidden"}">
        <div class="filter-row">${nations}</div>
        <div class="filter-row">${types}</div>
        <div class="filter-row">${prem}</div>
        <div class="filter-row">${fire}</div>
        <button class="filter-clear" id="filterClear">Szűrők törlése</button>
      </div>`;
  }

  function renderTabs() {
    el.tabs.innerHTML = Object.entries(DECKS)
      .map(([k, c]) => `<button class="tab ${k === deckKey ? "on" : ""}" data-deck="${k}">${c.label}</button>`)
      .join("");
  }

  document.getElementById("filterBar").addEventListener("click", (e) => {
    const t = e.target.closest("button");
    if (!t) return;
    if (t.id === "filterToggle") { filterOpen = !filterOpen; renderFilterBar(); return; }
    if (t.id === "filterClear") {
      filter.nations.clear(); filter.types.clear();
      filter.premium = "all"; filter.fire = "all";
      applyFilter(true); return;
    }
    const toggle = (set, v) => (set.has(v) ? set.delete(v) : set.add(v));
    if (t.dataset.nat) toggle(filter.nations, t.dataset.nat);
    else if (t.dataset.type) toggle(filter.types, t.dataset.type);
    else if (t.dataset.prem) filter.premium = t.dataset.prem;
    else if (t.dataset.fire) filter.fire = t.dataset.fire;
    else return;
    applyFilter(true);
  });

  el.tabs.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-deck]");
    if (!btn) return;
    deckKey = btn.dataset.deck;
    renderTabs();
    setFlipped(false);
    render();
  });

  el.card.addEventListener("click", (e) => {
    const gunBtn = e.target.closest("[data-gun]");
    if (gunBtn) {
      gunIndex = Number(gunBtn.dataset.gun);
      render();
      setFlipped(true);
      return;
    }
    const zoneEl = e.target.closest("[data-zone]");
    if (zoneEl) {
      if (zoneEl.dataset.zone) highlightZone(zoneEl.dataset.zone);
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

  // Swipe — csak vízszintes mozdulatra lapoz, hogy a hátlap görgetését ne akassza.
  let touch = null;
  el.card.addEventListener("touchstart", (e) => {
    const t = e.changedTouches[0];
    touch = { x: t.clientX, y: t.clientY };
  }, { passive: true });

  el.card.addEventListener("touchend", (e) => {
    if (!touch) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touch.x, dy = t.clientY - touch.y;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) go(dx < 0 ? 1 : -1);
    touch = null;
  }, { passive: true });

  renderTabs();
  applyFilter(false);

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").catch(() => {});
    });
  }
})();
