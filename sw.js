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

const CACHE_NAME = "wot-flashcards-v6";

const APP_SHELL = [
  "./",
  "./index.html",
  "./css/style.css",
  "./js/app.js",
  "./js/tanks-data.js",
  "./js/armor-zones.js",
  "./js/armor3d.js",
  "./js/tank-models.js",
  "./armor3d.html",
  "./img/is-3.png",
  "./img/tiger-ii.png",
  "./img/t32.png",
  "./img/t-44.png",
  "./img/amx-50-100.png",
  "./manifest.json",
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
