(function () {
  const deck = Array.isArray(window.TANKS) ? window.TANKS : [];
  let index = 0;
  let flipped = false;

  const cardEl = document.getElementById("card");
  const nationEl = document.getElementById("tankNation");
  const nameEl = document.getElementById("tankName");
  const metaEl = document.getElementById("tankMeta");
  const statsGridEl = document.getElementById("statsGrid");
  const progressEl = document.getElementById("progress");
  const btnPrev = document.getElementById("btnPrev");
  const btnNext = document.getElementById("btnNext");
  const btnFlip = document.getElementById("btnFlip");

  function render() {
    const tank = deck[index];
    flipped = false;
    cardEl.classList.remove("flipped");

    if (!tank) {
      nationEl.textContent = "--";
      nameEl.textContent = "Nincs betöltött adat";
      metaEl.textContent = "Adj hozzá tankokat a js/tanks-data.js fájlban";
      statsGridEl.innerHTML = '<p class="placeholder">Üres a pakli.</p>';
      progressEl.textContent = "0 / 0";
      return;
    }

    nationEl.textContent = tank.nation;
    nameEl.textContent = tank.name;
    metaEl.textContent = `Tier ${tank.tier} · ${tank.type}`;

    statsGridEl.innerHTML = "";
    Object.entries(tank.stats || {}).forEach(([label, value]) => {
      const row = document.createElement("div");
      row.className = "stat-row";
      row.innerHTML = `<span class="label">${label}</span><span class="value">${value}</span>`;
      statsGridEl.appendChild(row);
    });

    progressEl.textContent = `${index + 1} / ${deck.length}`;
  }

  function flip() {
    if (!deck.length) return;
    flipped = !flipped;
    cardEl.classList.toggle("flipped", flipped);
  }

  function next() {
    if (!deck.length) return;
    index = (index + 1) % deck.length;
    render();
  }

  function prev() {
    if (!deck.length) return;
    index = (index - 1 + deck.length) % deck.length;
    render();
  }

  cardEl.addEventListener("click", flip);
  btnFlip.addEventListener("click", flip);
  btnNext.addEventListener("click", next);
  btnPrev.addEventListener("click", prev);

  // Egyszerű balra/jobbra swipe navigáció
  let touchStartX = null;
  cardEl.addEventListener("touchstart", (e) => {
    touchStartX = e.changedTouches[0].clientX;
  });
  cardEl.addEventListener("touchend", (e) => {
    if (touchStartX === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) > 50) {
      dx < 0 ? next() : prev();
    }
    touchStartX = null;
  });

  render();

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").catch(() => {});
    });
  }
})();
