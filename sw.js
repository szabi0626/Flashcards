/*
 * Service worker.
 *
 * Stratégia: a kód (HTML/CSS/JS) HÁLÓZAT-ELSŐ, a képek CACHE-ELSŐK.
 *
 * Miért: cache-first mellett a frissítések csak két újratöltés után
 * jelennek meg — a telefonon úgy tűnik, mintha a deploy nem ment volna ki.
 * Hálózat-első mellett online mindig a friss verziót kapod, a cache pedig
 * offline tartalékként szolgál. A képek viszont nem változnak, azokat
 * felesleges újra letölteni.
 */

const CACHE_NAME = "wot-flashcards-v9";

// A képeket szándékosan NEM töltjük elő: 260 tank van, az több megabájt
// lenne telepítéskor. A futásidejű cache-first stratégia úgyis eltárolja
// mindegyiket, amint egyszer megnézted.
const APP_SHELL = [
  "./",
  "./index.html",
  "./css/style.css",
  "./js/app.js",
  "./js/tanks-data.js",
  "./js/armor-zones.js",
  "./js/armor-gl.js",
  "./models/model-is-3.bin",
  "./models/model-is-3.json",
  "./armor3d.html",
  "./manifest.json",
  "./img/class/lighttank.png",
  "./img/class/mediumtank.png",
  "./img/class/heavytank.png",
  "./img/class/at-spg.png",
  "./img/class/spg.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

function isImage(url) {
  return url.pathname.includes("/img/") || url.pathname.includes("/icons/");
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, response.clone());
  }
  return response;
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    // Offline — abból dolgozunk, ami megvan
    const cached = await caches.match(request);
    if (cached) return cached;
    throw err;
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(isImage(url) ? cacheFirst(request) : networkFirst(request));
});
