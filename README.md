# WoT Flashcards

Mobilbarát flashcard webalkalmazás World of Tanks harckocsi statisztikák
memorizálásához. Böngészőből használható, iPhone-on a kezdőképernyőre is
felvehető (PWA), és offline is működik.

Benne van **mind a 260 tier 8 jármű** — tech tree és prémium egyaránt,
mind a 11 nemzetből. Szűrhető nemzet, típus és prémium/tech tree szerint.

## Mit tanít

A kártyák nem stat-dumpok, hanem három harc közbeni kérdésre válaszolnak:

| Pakli | Kérdés |
|---|---|
| **Páncél** | Hova lősz? |
| **Fegyver** | Mivel lő rád? |
| **Mobilitás** | Hogy mozog, meglát? |

### Páncél pakli

Öt tankhoz (IS-3, Tiger II, T32, T-44, AMX 50 100) készült **kidolgozott
zónatérkép**: színkódolt elölnézeti séma, ahol minden zóna az **effektív**
(szögeléssel korrigált) vastagsága szerint kap színt — nem a nominális
szerint, mert az félrevezet. Egy 110 mm-es lemez 60°-ban 220 mm-nek felel meg.

A többi 255 tanknál a hiteles API-értékek látszanak (test és torony
elöl/oldalt/hátul), zónabontás nélkül — inkább semmi, mint találgatás.

- 🟢 &lt; 180 mm — átlövöd sima AP-vel
- 🟡 180–250 mm — kell hozzá jó pen vagy prémium lőszer
- 🔴 &gt; 250 mm — ne is próbáld

A színt a kód számolja az `effective` értékből, így nem tud elcsúszni az
adattól.

### Tüzelési mód

A kártya megmutatja, hogy a löveg **egylövetű**, **táras**, **töltényűrös**
vagy **gépágyú** — harcban ez dönti el, mikor támadhatsz rá:

| Mód | Mit jelent | Példa |
|---|---|---|
| Táras | A teljes tárat le kell lőnie, utána hosszan tölt | AMX 50 100 (6 lövedék, 43 s) |
| Töltényűrös | A lövedékek egyenként töltődnek vissza, egyre lassabban | P.44 Pantera (3 lövedék, 11/10/8 s) |
| Gépágyú | Hevederből tüzel, a cső túlmelegedhet | Ares 75 (350 lövedék, 0,3 s) |

A hivatalos WG API ezt **nem adja meg** — nincs klip mező, a `rapid` mindig
null. A WG saját webes tankopédiája viszont egy másik végpontot használ
(`wotpbe/tankopedia/api/vehicle/modules/`), ami modul-kombinációnként 50 mezős
adatot ad, benne a `clip_count`, `clip_rate`, `autoreload_reload_time`,
`overheat_gun` és az álca értékek. Ezt szedi le a
[`tools/fetch_gun_mechanics.py`](tools/fetch_gun_mechanics.py).

230 járműhöz van hiteles adat. A maradék 30 esemény- vagy különleges jármű
(Frontline-változatok, kiadatlan prototípusok), amikhez a tankopédia nem tart
oldalt — azoknál a tűzgyorsaságból becsülünk, és a kártya ezt jelzi.

Szűrni is lehet rá.

### Fegyver pakli

**Stock / Fejlesztett** kapcsoló, és minden sornál látszik a különbség a
másik fegyverhez képest (zöld = ez jobb benne). Táras lövegeknél a tár mérete,
a teljes tár sebzése, a lövések közti idő és a visszatöltés is szerepel.

## Helyi futtatás

```bash
python3 -m http.server 8123
```

Ezután: `http://localhost:8123`

## Használat iPhone-on

1. Töltsd fel oda, ahol a telefon eléri — pl. GitHub Pages
   (Settings → Pages → Deploy from branch), vagy ugyanazon a Wi-Fi-n a géped
   IP-jén: `http://<géped-IP-je>:8123`
2. Nyisd meg Safariban.
3. Megosztás → **Kezdőképernyőhöz adás**.

## Honnan jönnek az adatok

A projekt szándékosan **két külön fájlban** tartja a kétféle megbízhatóságú
adatot, hogy mindig látszódjon, minek lehet hinni:

| Fájl | Forrás | Megbízhatóság |
|---|---|---|
| [`js/tanks-data.js`](js/tanks-data.js) | **Wargaming API** — generált, ne szerkeszd | Hiteles, aktuális patch |
| [`js/armor-zones.js`](js/armor-zones.js) | **Kézi** — zónák, szögek, gyenge pontok | Becslés, ellenőrizendő |

A WG API adja: életerő, nominális páncél, minden fegyver teljes statja,
sebesség, motor, nézőtáv, és a hivatalos játékbeli tank rendereket.

A WG **tankopédia backendje** adja (a hivatalos API nem): tár méret, lövések
közti idő, töltényűrös visszatöltési idők, gépágyú/túlmelegedés jelző, és a
valódi álca értékek.

Sem az API, sem a tankopédia **nem** adja: dőlésszögeket, effektív páncélt,
gyenge pontokat (kupola, ágyúpajzs, alsó lemez). Ezek az `armor-zones.js`-ben
vannak kézzel, és az app meg is jelöli őket.

Az API-értékek a **játék alapértékei** — legénységi képzettség és felszerelés
nélkül. A saját tankod a garázsban jobb számokat mutat; az ellenfél
megítéléséhez viszont ez a helyes kiindulás.

### Az adatok frissítése

A `js/tanks-data.js` generált. Újragenerálásához kell egy ingyenes
`application_id` a [developers.wargaming.net](https://developers.wargaming.net)-ről
(`Mobile` típus, hogy ne legyen IP-hez kötve). A generáló szkript a tank
`tankId` mezőit használja.

### Ha ellenőrizted egy tank zónáit

Az `armor-zones.js`-ben állítsd a tank `verified` mezőjét `true`-ra, és
eltűnik a kártyáról a figyelmeztetés.

## Képek

A tankok hivatalos WoT garázs-renderei az `img/` mappában, a WG API-ból
(160×100, ezért kissé lágyak nagyítva — a WG nem ad nagyobbat). Ha jobb képed
van, egyszerűen írd felül a fájlt: `img/<tank-id>.png`.

## Szűrés

A fejléc alatti sávra koppintva nyílik a szűrő: nemzet, típus
(nehéz/közepes/könnyű/vadász/tüzér) és prémium vs. tech tree. A sáv jobb
szélén mindig látszik, hány tank van a szűrt pakliban.

Tanulásnál érdemes szűkíteni — 260 kártyát végigpörgetni értelmetlen.

## Páncélnézegető (kísérleti)

Az [`armor3d.html`](armor3d.html) oldalon egy forgatható 3D nézegető, ami a
nézőszögből élőben számolja az effektív páncélt. Egyelőre csak az IS-3-hoz,
és a zónahatárai pontatlanok — a mechanika kész, az adat még nem.

## Vezérlés

- Koppintás a kártyára / ⟳ gomb — fordítás
- ‹ › gombok, balra-jobbra húzás, vagy nyílbillentyűk — lapozás
- ⤨ — keverés
