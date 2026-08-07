"""
Klip- és álca adatok lekérése a Wargaming tankopédia backendjéből.

A hivatalos WG API (encyclopedia) NEM adja meg, hogy egy löveg tárból tüzel-e:
nincs klip mező, a `rapid` mindig null. A WG saját webes tankopédiája viszont
egy másik végpontot használ, ami sokkal többet ad:

    worldoftanks.eu/wotpbe/tankopedia/api/vehicle/modules/
        ?filter[language]=en&filter[vehicle_cd]=<tank_id>

Válaszában a `binds` minden modul-kombinációhoz ad egy 50 mezős `ttc` blokkot.
Nekünk ebből kell:

    clip_count              hány lövedék a tárban (1 = egylövetű)
    clip_rate               lövések közti idő a táron belül
    autoreload_reload_time  ha nem üres, TÖLTÉNYŰRÖS: lövedékenkénti töltési
                            idők, pl. a P.44 Panteránál [12, 10, 8]
    overheat_gun            1 = túlmelegedő gépágyú (pl. Ares 75)
    invisibility_still      álca állva (0-1, szorozva 100 = %)
    invisibility_moving     álca mozgás közben

Ezekből a négy tüzelési mód egyértelműen megkülönböztethető, nem kell
a tűzgyorsaságból következtetni.

A `binds` kulcsai modul-azonosítókból állnak (pl. "71-4931-5698-514884-515653"),
ezért a löveg module_id-jából tudjuk, melyik bind melyik fegyverhez tartozik.

    python3 tools/fetch_gun_mechanics.py > gun_mechanics.json
"""

import json, sys, time, threading, urllib.parse, urllib.request
from concurrent.futures import ThreadPoolExecutor

URL = "https://worldoftanks.eu/wotpbe/tankopedia/api/vehicle/modules/"
UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
      "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36")

# A kérés ~0,8 másodperc, tehát ennyi szállal is csak pár kérés/mp — ez a WG
# saját webes tankopédiájának a backendje, nem érdemes megterhelni.
WORKERS = 6


class NoPage(Exception):
    """A tankopédia nem tart oldalt ehhez a járműhöz. Nem hiba, nem is múlik el."""


def fetch(cd, tries=3):
    q = urllib.parse.urlencode({"filter[language]": "en", "filter[vehicle_cd]": cd})
    req = urllib.request.Request(f"{URL}?{q}", headers={
        "User-Agent": UA, "X-Requested-With": "XMLHttpRequest"})
    for a in range(tries):
        try:
            d = json.loads(urllib.request.urlopen(req, timeout=40).read())
        except Exception:
            # Hálózati hiba: ez elmúlhat, érdemes újrapróbálni.
            if a == tries - 1:
                raise
            time.sleep(2 * (a + 1))
            continue
        # Érvényes válasz „nincs ilyen” tartalommal: az újrapróbálás csak idő.
        # (Több száz esemény- és kiadatlan jármű esik ide; ha ezeken is
        # visszalépegetünk, a futás órákkal hosszabb lesz.)
        if d.get("status") == "ok":
            return d["data"]
        raise NoPage(d.get("status"))


def gun_mechanics(data):
    """Fegyverenként a legjobb (teljesen fejlesztett) konfiguráció adatai."""
    mods = data.get("modules") or {}
    guns = {str(m["module_id"]): (m.get("mark") or "").strip()
            for m in (mods.values() if isinstance(mods, dict) else mods)
            if m.get("type") == "vehicleGun"}

    best = {}
    for key, bind in (data.get("binds") or {}).items():
        t = bind.get("ttc") or {}
        parts = set(key.split("-"))
        gid = next((g for g in guns if g in parts), None)
        if gid is None:
            continue
        if gid not in best or t.get("damage_per_minute", 0) > best[gid][1]:
            best[gid] = (t, t.get("damage_per_minute", 0))

    out = {}
    for gid, (t, _) in best.items():
        out[guns[gid]] = {
            "clip": t.get("clip_count"),
            "clipRate": t.get("clip_rate"),
            "autoreload": t.get("autoreload_reload_time") or [],
            "overheat": bool(t.get("overheat_gun")),
            "reload": t.get("reload_time"),
            "maxAmmo": t.get("max_ammo"),
        }
    return out


def camo(data):
    """Az álca a járműhöz tartozik, nem a fegyverhez — bármelyik bind jó."""
    for bind in (data.get("binds") or {}).values():
        t = bind.get("ttc") or {}
        if "invisibility_still" in t:
            return {"still": round(t["invisibility_still"] * 100, 1),
                    "moving": round(t["invisibility_moving"] * 100, 1)}
    return None


def main():
    ids = json.load(open(sys.argv[1])) if len(sys.argv) > 1 else None
    if not ids:
        print("Használat: python3 tools/fetch_gun_mechanics.py <tank_id-k JSON listája>",
              file=sys.stderr)
        return 2

    out, lock, state = {}, threading.Lock(), {"done": 0, "nopage": 0}
    n = len(ids)

    def work(cd):
        try:
            d = fetch(cd)
            rec = {"guns": gun_mechanics(d), "camo": camo(d)}
        except NoPage:
            rec = None
        except Exception as e:
            print(f"  ! {cd}: {e}", file=sys.stderr, flush=True)
            rec = None
        with lock:
            if rec is not None:
                out[str(cd)] = rec
            else:
                state["nopage"] += 1
            state["done"] += 1
            if state["done"] % 50 == 0:
                print(f"  {state['done']}/{n}", file=sys.stderr, flush=True)

    with ThreadPoolExecutor(max_workers=WORKERS) as pool:
        list(pool.map(work, ids))

    json.dump(out, sys.stdout, ensure_ascii=False)
    print(f"\nkész: {len(out)}/{n} járműhöz van adat "
          f"({state['nopage']} járműhöz nem tart oldalt a tankopédia)", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
