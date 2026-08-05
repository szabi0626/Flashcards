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

## ⚠️ Az adatok ellenőrizetlenek

A statisztikák emlékezetből kerültek be és patchenként változnak. Minden
tanknál `verified: false` van, és az app kiírja, hogy „ellenőrizetlen adat".
**Vesd össze őket a [tanks.gg](https://tanks.gg) adataival**, mielőtt
komolyan tanulnál belőlük — a rossz adat rosszabb, mint a semmi. Ha egy tank
adatait átnézted, állítsd a `verified` mezőjét `true`-ra, és eltűnik a
figyelmeztetés.

## Képek

A tankokról alapból rajzolt SVG sziluett látszik. Valódi fotóhoz elég a képet
az `img/` mappába tenni a tank id-jével elnevezve (`is-3.jpg`, `t32.jpg`, …) —
az app magától megtalálja, kódot nem kell szerkeszteni. Ha egy kép hiányzik,
csendben marad a sziluett. Részletek: [`img/README.md`](img/README.md).

## Új tank hozzáadása

Minden adat a [`js/tanks-data.js`](js/tanks-data.js) fájlban van, bőven
kommentezve. Másolj le egy meglévő bejegyzést és írd át — az app a többit
elvégzi (séma, színkód, fegyver-összehasonlítás).

## Vezérlés

- Koppintás a kártyára / ⟳ gomb — fordítás
- ‹ › gombok, balra-jobbra húzás, vagy nyílbillentyűk — lapozás
- ⤨ — keverés
