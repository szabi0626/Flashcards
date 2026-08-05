# WoT Flashcards

Mobilbarát flashcard webalkalmazás World of Tanks harckocsi statisztikák
(páncélzat, fegyver adatok, mobilitás stb.) memorizálásához. Böngészőből
használható, iPhone-on a kezdőképernyőre is felvehető (PWA).

Ez egyelőre egy **app shell**: a kártya-fordítás, lapozás és az alap UI
működik, néhány minta tankkal (`js/tanks-data.js`). A teljes adatbázis és a
tanulási logika (szűrés, tudom/nem tudom értékelés stb.) a következő lépés.

## Helyi futtatás

Bármilyen statikus fájlszerver megfelel, pl.:

```bash
python3 -m http.server 8123
```

Ezután nyisd meg: `http://localhost:8123`

Vagy Node-dal:

```bash
npx serve .
```

## Használat iPhone-on

1. Töltsd fel valahova, ahol a telefon eléri (pl. GitHub Pages, vagy ugyanazon
   a Wi-Fi hálózaton a géped IP címén: `http://<géped-IP-je>:8123`).
2. Nyisd meg Safariban.
3. Megosztás gomb → **Kezdőképernyőhöz adás** — így önálló appként indul,
   böngészősáv nélkül, és offline is működik (service worker cache-eli az
   app shell-t).

## GitHub Pages-hez

A repó statikus, gyökérben van az `index.html`, így GitHub Pages-szel
(Settings → Pages → Deploy from branch) simán kiszolgálható.
