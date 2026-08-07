# WoT Flashcards

Mobilbarát flashcard webalkalmazás World of Tanks harckocsi statisztikák
memorizálásához. Böngészőből használható, iPhone-on a kezdőképernyőre is
felvehető (PWA), és offline is működik.

Benne van a játék **összes járműve, tier 1-től 11-ig** — tech tree és prémium
egyaránt, mind a 11 nemzetből. Szint szerint szűrhető, és alapból
**játszottság szerint** van rendezve, hogy azzal kezdd, amivel tényleg
találkozol.

## Mit tanít

A kártyák nem stat-dumpok, hanem három harc közbeni kérdésre válaszolnak:

| Pakli | Kérdés |
|---|---|
| **Páncél** | Hova lősz? |
| **Fegyver** | Mivel lő rád? |
| **Mobilitás** | Hogy mozog, meglát? |

### Páncél pakli

Öt tier 8-as tankhoz (IS-3, Tiger II, T32, T-44, AMX 50 100) készült
**kidolgozott zónatérkép**: színkódolt elölnézeti séma, ahol minden zóna az **effektív**
(szögeléssel korrigált) vastagsága szerint kap színt — nem a nominális
szerint, mert az félrevezet. Egy 110 mm-es lemez 60°-ban 220 mm-nek felel meg.

A többi tanknál a hiteles API-értékek látszanak (test és torony
elöl/oldalt/hátul), zónabontás nélkül — inkább semmi, mint találgatás.

- 🟢 átlövöd sima AP-vel
- 🟡 kell hozzá prémium lőszer
- 🔴 ne is próbáld

A küszöb **szintfüggő**, és magából az adatból jön: az adott tier összes
tankjának felszerelt lövegét nézve a **medián AP-áttörés** a zöld határa, a
medián prémium áttörés a pirosé:

| Tier | Zöld alatta | Piros fölötte |
|---|---|---|
| 1 | 45 mm | 70 mm |
| 3 | 67 mm | 92 mm |
| 5 | 118 mm | 159 mm |
| 8 | 220 mm | 259 mm |
| 10 | 260 mm | 319 mm |

Fix 180/250 mm-rel tier 3-on minden piros és tier 10-en minden zöld lenne —
azaz használhatatlan.

A színt a kód számolja az `effective` értékből és a szint mediánjából, így nem
tud elcsúszni az adattól, és patch után magától igazodik.

### Játszottság — mit tanulj előbb

Ezer kártyát elölről végigpörgetni pazarlás, mert a mezőny nagyon egyenetlen.
Tier 8-on például egyetlen jármű, a **SU-130PM**, önmagában a forgalom
**8,85%-a** — nagyjából minden 11. tier 8-as ellenfél az. A 228. helyezettel
viszont gyakorlatilag sosem találkozol.

Ezért a pakli alapból játszottság szerint van rendezve, és minden kártya
előlapján ott a részesedés: `#10 Gyakori · 1,36%`. A szűrőben átkapcsolhatsz
nemzet szerinti sorrendre, és szűkíthetsz a szint legjátszottabb
25/50/100 járművére — a chipen ott a tényleges lefedettség százaléka.

A helyezés és a részesedés **szinten belül** értendő: egy tier 3-as tank
abszolút meccsszáma összemérhetetlen egy tier 8-aséval, és úgyis az a kérdés,
hogy az adott szinten kivel találkozol. Ugyanezért a kártya színkódja is a
részesedésből jön, nem a helyezésből — tier 1-en 12 jármű van, tier 8-on 228,
ott a 10. hely egészen mást jelent.

Ezt a hivatalos WG API **nem adja meg** — csak játékosonként tud statisztikát,
szerverszintű forgalmat nem. A [tomato.gg](https://tomato.gg) viszont sok
tízezer játékos adatát összegzi, és a
`tank-performance/recent/<szerver>/<nap>` oldal a teljes táblázatot a HTML-be
rendereli, így egyetlen kéréssel megvan. Ezt szedi le a
[`tools/fetch_playrate.py`](tools/fetch_playrate.py).

949 járműhöz van adat. Ami a forrásban meg sem jelenik (Frontline-változatok,
kiadatlan prototípusok), az `null`-t kap, nem nullát, a sorrend végére kerül,
és a kártya kiírja, hogy random meccsen nem jön szembe.

### Tüzelési mód

A kártya megmutatja, hogy a löveg **egylövetű**, **táras**, **töltényűrös**
vagy **gépágyú** — harcban ez dönti el, mikor támadhatsz rá:

| Mód | Mit jelent | Példa |
|---|---|---|
| Táras | A teljes tárat le kell lőnie, utána hosszan tölt | AMX 50 100 (6 lövedék) |
| Töltényűrös | A lövedékek egyenként töltődnek vissza, egyre lassabban | P.44 Pantera (3 lövedék, 11/10/8 s) |
| Gépágyú | Hevederből tüzel, a cső túlmelegedhet | Ares 75 (350 lövedék, 0,3 s) |

Összesen 85 táras, 25 töltényűrös és 55 gépágyús jármű van — az utóbbiak
zöme alacsony szintű gyorstüzelő könnyűtank.

A hivatalos WG API ezt **nem adja meg** — nincs klip mező, a `rapid` mindig
null. A WG saját webes tankopédiája viszont egy másik végpontot használ
(`wotpbe/tankopedia/api/vehicle/modules/`), ami modul-kombinációnként 50 mezős
adatot ad, benne a `clip_count`, `clip_rate`, `autoreload_reload_time`,
`overheat_gun` és az álca értékek. Ezt szedi le a
[`tools/fetch_gun_mechanics.py`](tools/fetch_gun_mechanics.py).

957 járműhöz van hiteles adat (1455 löveg). A maradék 52 esemény- vagy
különleges jármű, amikhez a tankopédia nem tart oldalt — azoknál a
tűzgyorsaságból becsülünk, és a kártya ezt jelzi.

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

A **tomato.gg** adja (sem az API, sem a tankopédia nem): játszottság —
30 napos meccsszám, helyezés, részesedés és szerverszintű nyerési arány.

Sem az API, sem a tankopédia **nem** adja: dőlésszögeket, effektív páncélt,
gyenge pontokat (kupola, ágyúpajzs, alsó lemez). Ezek az `armor-zones.js`-ben
vannak kézzel, és az app meg is jelöli őket.

Az API-értékek a **játék alapértékei** — legénységi képzettség és felszerelés
nélkül. A saját tankod a garázsban jobb számokat mutat; az ellenfél
megítéléséhez viszont ez a helyes kiindulás.

### Az adatok frissítése

A `js/tanks-data.js` generált. Újragenerálásához kell egy ingyenes
`application_id` a [developers.wargaming.net](https://developers.wargaming.net)-ről
(`Mobile` típus, hogy ne legyen IP-hez kötve). A teljes lánc:

```bash
# 1. nyers adat a WG API-ból (minden tier; megszakítás után folytatható)
WG_ID=xxxx python3 tools/fetch_vehicles.py

# 2. generált adatfájl + garázs-renderek letöltése
python3 tools/generate_data.py

# 3. klip, tüzelési mód és álca a WG tankopédia backendjéből
python3 tools/fetch_gun_mechanics.py tank_ids.json > gun_mechanics.json
python3 tools/merge_gun_mechanics.py gun_mechanics.json

# 4. játszottság a tomato.gg-ről
python3 tools/fetch_playrate.py EU 30 > playrate.json
python3 tools/merge_playrate.py playrate.json
```

A 3. és 4. lépés **idempotens**: a korábban beírt mezőket előbb kiszedi, így
akárhányszor futtatható. A jármű `id`-je (egyben a képfájl neve és az
`armor-zones.js` kulcsa) `tank_id` szerint stabil, tehát új járművek
hozzáadásakor a meglévők nem nevezodnek át.

### Ha ellenőrizted egy tank zónáit

Az `armor-zones.js`-ben állítsd a tank `verified` mezőjét `true`-ra, és
eltűnik a kártyáról a figyelmeztetés.

## Képek

A tankok hivatalos WoT garázs-renderei az `img/` mappában, a WG API-ból
(160×100, ezért kissé lágyak nagyítva — a WG nem ad nagyobbat). Ha jobb képed
van, egyszerűen írd felül a fájlt: `img/<tank-id>.png`.

## Szűrés

A **szint-választó mindig látszik** a fejléc alatt — ezer kártyánál ez a
legfontosabb kapcsoló, ezért nem rejtettük panel mögé.

A sávra koppintva nyílik a többi szűrő:

- **Sorrend** — játszottság (alap) vagy nemzet szerint
- **Mennyire gyakori** — a szint top 25 / 50 / 100 járműve, a chipen a
  tényleges lefedettség százaléka
- **Nemzet, típus** (nehéz/közepes/könnyű/páncélvadász/tüzér), prémium vs. tech tree
- **Tüzelési mód** — egylövetű / táras / töltényűrös / gépágyú

A sáv jobb szélén mindig látszik, hány tank van a szűrt pakliban.

## Páncélnézegető (kísérleti)

Az [`armor3d.html`](armor3d.html) oldalon egy forgatható 3D nézegető, ami a
nézőszögből élőben számolja az effektív páncélt. Egyelőre csak az IS-3-hoz,
és a zónahatárai pontatlanok — a mechanika kész, az adat még nem.

## Vezérlés

- Koppintás a kártyára / ⟳ gomb — fordítás
- ‹ › gombok, balra-jobbra húzás, vagy nyílbillentyűk — lapozás
- ⤨ — keverés
