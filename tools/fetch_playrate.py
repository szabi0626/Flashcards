"""
Játszottsági adatok (play rate) lekérése a tomato.gg-ről.

MIÉRT NEM A WG API: a hivatalos Wargaming API kizárólag *játékosonként* ad
statisztikát (wot/tanks/stats/) — nincs olyan végpontja, ami megmondaná, hány
meccset játszottak egy adott tankkal szerverszinten. Ezt csak olyan oldal
tudja, ami sok tízezer játékos adatát összegzi. A tomato.gg pont ilyen, és a

    https://tomato.gg/tank-performance/recent/<szerver>/<nap>

oldal a teljes táblázatot szerver-oldalon rendereli a HTML-be (React Router
streaming payload, `$R[n]={tank_id:...,battles:...}` alakban). Vagyis EGYETLEN
kéréssel megvan mind a ~950 jármű — nem kell tankonként kopogtatni.

A `battles` mező az adott ablakban (alapból 30 nap) lejátszott meccsek száma
azzal a járművel az adott szerveren. Ebből számoljuk:

    rank    helyezés a tier 8-as mezőnyben
    share   a tier 8-as forgalom hány százaléka ez a jármű

A `share` a hasznos szám: „minden 100. tier 8-asból ennyi ez a tank”.

    python3 tools/fetch_playrate.py [szerver] [nap] > playrate.json

Szerver: EU (alap), NA, ASIA. Nap: 30 (alap), 60, 90.
"""

import json, re, sys, urllib.request

UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
      "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36")

# A payload objektumai JS literálok, nem JSON: a kulcsok idézőjel nélküliek,
# a logikai értékek pedig !0 / !1 alakban vannak minifikálva.
OBJ = re.compile(r"\$R\[\d+\]=(\{tank_id:.*?\})(?=,\$R\[|;|$)")
KEY = re.compile(r"([{,])([A-Za-z_][A-Za-z0-9_]*):")


def parse_obj(src):
    return json.loads(KEY.sub(r'\1"\2":', src).replace("!0", "true").replace("!1", "false"))


def fetch(server="EU", days=30):
    url = f"https://tomato.gg/tank-performance/recent/{server}/{days}"
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    html = urllib.request.urlopen(req, timeout=90).read().decode("utf-8", "replace")
    rows = [parse_obj(m.group(1)) for m in OBJ.finditer(html)]
    if not rows:
        raise RuntimeError("nem találtam adatot a HTML-ben — változott az oldal szerkezete?")
    return rows


def main():
    server = sys.argv[1] if len(sys.argv) > 1 else "EU"
    days = int(sys.argv[2]) if len(sys.argv) > 2 else 30

    rows = fetch(server, days)

    # A helyezés és a részesedés SZINTEN BELÜL értendő: egy tier 3-as tank
    # abszolút meccsszáma összemérhetetlen egy tier 8-aséval, és a kérdés
    # úgyis az, hogy az adott szinten kivel találkozol.
    by_tier = {}
    for r in rows:
        by_tier.setdefault(r["tier"], []).append(r)

    out, totals = {}, {}
    for tier, group in sorted(by_tier.items()):
        group.sort(key=lambda r: -r["battles"])
        total = sum(r["battles"] for r in group) or 1
        totals[tier] = total
        for rank, r in enumerate(group, 1):
            out[str(r["tank_id"])] = {
                "battles": r["battles"],
                "rank": rank,
                "share": round(100 * r["battles"] / total, 2),
                "winrate": r["winrate"],
            }

    print(json.dumps({"server": server, "days": days,
                      "tierTotals": totals, "tanks": out}, ensure_ascii=False))
    for tier, total in sorted(totals.items()):
        print(f"  tier {tier:>2}: {len(by_tier[tier]):>3} jármű, "
              f"{total:>10,} meccs".replace(",", " "), file=sys.stderr)
    print(f"összesen {len(rows)} jármű, {days} nap ({server})", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
