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

## Játszottsági adatok

**[tomato.gg](https://tomato.gg)** — `tank-performance/recent/<szerver>/<nap>`

A kártyákon látható helyezés, részesedés és szerverszintű nyerési arány
onnan származik. A tomato.gg sok tízezer játékos statisztikáját aggregálja;
ezt a hivatalos Wargaming API nem tudja, mert kizárólag játékosonként ad
adatot.

Csak a nyilvánosan, bejelentkezés nélkül kiszolgált oldalt olvassuk, és
mindig egyetlen kérésből — a teljes táblázat szerver-oldalon renderelve
benne van a HTML-ben, így nem kell járművenként kopogtatni.

## Osztály-ikonok

Az `img/class/*.png` a World of Tanks hivatalos jármű-osztály jelei
(rombusz, csíkos rombusz, fordított háromszög, négyzet), a Wargaming saját
webes tankopédiájának nyilvános statikus tárhelyéről:

    eu-wotp.wgcdn.co/.../scss/utils/rich/img/tank_classes/

Ugyanabba a körbe tartoznak, mint az API-ból származó garázs-renderek: a
Wargaming tulajdona, a játékhoz kapcsolódó megjelenítésre.

## 3D páncélmodellek

A forgatható páncélnézegető (`armor3d.html`, `models/armor/`) a játék saját
**ütközési hálóit** használja, lemezenkénti nominális vastagsággal és a
térelválasztott páncélok jelölésével. Forrás:
[`unicum-gg/wot.models`](https://github.com/unicum-gg/wot.models) (`WG` ág),
egy közösségi tár, ami a WoT frissítési CDN-jéből szedi ki a geometriát.

A `tools/build_armor_models.py` járművenként a teljesen fejlesztett tornyot és
löveget rakja össze, és tömör bináris formára alakítja. A tár megjegyzése
szerint a tartalom a jogtulajdonosok (Wargaming) tulajdona.

## Amit mi tettünk hozzá

A páncélzónák, dőlésszögek, effektív vastagságok és a „hova lőj" tanácsok
(`js/armor-zones.js`) saját munka, nem az API-ból származnak — és becslések.
Lásd a README figyelmeztetését.
