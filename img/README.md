# Tank képek

Ide kerülnek a tankok képei. A repót építő session nem tud képet letölteni
(az egress policy blokkolja a külső hostokat), ezért ezeket kézzel kell
bemásolni.

## Hogyan adj hozzá képet

1. Mentsd le a képet ebbe a mappába, a tank `id`-jével elnevezve.
   Az id-ket a `js/tanks-data.js` tartalmazza:

   | Tank        | fájlnév          |
   |-------------|------------------|
   | IS-3        | `is-3.jpg`       |
   | Tiger II    | `tiger-ii.jpg`   |
   | T32         | `t32.jpg`        |
   | T-44        | `t-44.jpg`       |
   | AMX 50 100  | `amx-50-100.jpg` |

2. A `js/tanks-data.js`-ben állítsd át az adott tank `image` mezőjét:

   ```js
   image: "img/is-3.jpg",
   ```

3. Kész. Ha a fájl hiányzik vagy nem tölt be, az app automatikusan
   visszaesik a rajzolt sziluettre — nem törik el.

## Méret

Elég egy ~600 px széles kép; oldalnézet a legjobb a felismeréshez.
Nagy fájlokat ne tegyél be, mert a service worker offline-ra cache-eli őket.

## Jogi megjegyzés

Ha a repo publikus, figyelj rá, mit töltesz fel: a World of Tanks hivatalos
renderei a Wargaming szerzői jogát képezik. Saját használatra rendben van,
publikus terjesztéshez inkább közkincs / Creative Commons fotót keress
(pl. Wikimedia Commons-on a valódi járművekről bőven van).
