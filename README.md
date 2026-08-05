# WoT Flashcards

Mobilbarát flashcard webalkalmazás World of Tanks harckocsi statisztikák
memorizálásához. Böngészőből használható, iPhone-on a kezdőképernyőre is
felvehető (PWA), és offline is működik.

Jelenleg **5 tier 8 tank** van benne: IS-3, Tiger II, T32, T-44, AMX 50 100.

## Mit tanít

A kártyák nem stat-dumpok, hanem három harc közbeni kérdésre válaszolnak:

| Pakli | Kérdés |
|---|---|
| **Páncél** | Hova lősz? |
| **Fegyver** | Mivel lő rád? |
| **Mobilitás** | Hogy mozog, meglát? |

### Páncél pakli

Színkódolt elölnézeti séma, ahol minden zóna az **effektív** (szögeléssel
korrigált) vastagsága szerint kap színt — nem a nominális szerint, mert az
félrevezet. Egy 110 mm-es lemez 60°-ban 220 mm-nek felel meg.

- 🟢 &lt; 180 mm — átlövöd sima AP-vel
- 🟡 180–250 mm — kell hozzá jó pen vagy prémium lőszer
- 🔴 &gt; 250 mm — ne is próbáld

A színt a kód számolja az `effective` értékből, így nem tud elcsúszni az
adattól.

### Fegyver pakli

**Stock / Fejlesztett** kapcsoló, és minden sornál látszik a különbség a
másik fegyverhez képest (zöld = ez jobb benne). Autoloadereknél a klip
mérete, klipsebzés és az újratöltési idő is szerepel.

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

A WG API **nem** adja: dőlésszögeket, effektív páncélt, gyenge pontokat
(kupola, ágyúpajzs, alsó lemez), álcát, autoloader klip méretet. Ezek az
`armor-zones.js`-ben vannak kézzel, és az app meg is jelöli őket.

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

## Vezérlés

- Koppintás a kártyára / ⟳ gomb — fordítás
- ‹ › gombok, balra-jobbra húzás, vagy nyílbillentyűk — lapozás
- ⤨ — keverés
