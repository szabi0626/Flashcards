# Források és köszönet

## Tank statisztikák és garázs-renderek

**Wargaming.net World of Tanks API** — `api.worldoftanks.eu/wot/encyclopedia/`

A `js/tanks-data.js` teljes tartalma és az `img/*.png` képek innen származnak,
a hivatalos fejlesztői API-n keresztül. A World of Tanks és a hozzá tartozó
tartalom a Wargaming.net tulajdona.

## Klip- és álca adatok

A tár mérete, a lövések közti idő, a töltényűrös visszatöltési idők, a
túlmelegedés jelzője és az álca a Wargaming webes tankopédiájának
backendjéből származik:

    worldoftanks.eu/wotpbe/tankopedia/api/vehicle/modules/

Ugyanaz a nyilvános forrás, amiből a tankopédia oldala is dolgozik. A
hivatalos encyclopedia API ezeket nem tartalmazza.

## Osztály-ikonok

Az `img/class/*.png` a World of Tanks hivatalos jármű-osztály jelei
(rombusz, csíkos rombusz, fordított háromszög, négyzet), a Wargaming saját
webes tankopédiájának nyilvános statikus tárhelyéről:

    eu-wotp.wgcdn.co/.../scss/utils/rich/img/tank_classes/

Ugyanabba a körbe tartoznak, mint az API-ból származó garázs-renderek: a
Wargaming tulajdona, a játékhoz kapcsolódó megjelenítésre.

## 3D modellek

A forgatható páncélnézegető valódi 3D modelleket használ. Ezek **Creative
Commons Attribution (CC BY)** licencűek, ami megköveteli a szerző
megnevezését:

| Tank | Modell | Szerző | Licenc |
|---|---|---|---|
| IS-3 | [Is-3 Heavy Tank - Toshueyi](https://sketchfab.com/3d-models/is-3-heavy-tank-toshueyi-4a885f0c252d4d5fadf1df6fb77aa92b) | Joanthan To (`jonathanto99`) | CC BY |

A modelleket a Sketchfab-ról töltöttük le, és feldolgozás után
(egyszerűsítés, páncélzónákra osztás) használjuk.

## Amit mi tettünk hozzá

A páncélzónák, dőlésszögek, effektív vastagságok és a „hova lőj" tanácsok
(`js/armor-zones.js`) saját munka, nem az API-ból származnak — és becslések.
Lásd a README figyelmeztetését.
