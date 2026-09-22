"""
Valódi WoT ütközési (páncél) modellek -> models/armor/<tank-id>.bin + .json

FORRÁS: az `unicum-gg/wot.models` közösségi tár, ami a WoT frissítési CDN-jéből
szedi ki a járműgeometriát (nem a játék telepítéséből). Járművenként egy
`collision.json` tartalmaz mindent, ami kell:

    parts        részenként (Hull, Turret_XX, Gun_XX, Chassis) a háló, lemezekre
                 bontva: `groups` = [{name: "armor_9", start, count}]
    armor        részenként lemezenként a NOMINÁLIS vastagság mm-ben
    spaced       mely lemezek térelválasztott páncélok (nem sebzik a járművet)
    hullPosition a test eltolása a talajhoz képest
    mounts       hova kerül a torony a testen, és a löveg a tornyon

Ez a különbség a korábbi próbálkozáshoz képest: eddig egy Sketchfab-os
LÁTVÁNYMODELLT osztottunk zónákra geometriai tippekkel. Itt a játék saját
ütközési hálója van, lemezenként a játékbeli vastagsággal — nincs benne
találgatás. Ráadásul sokkal kisebb: az IS-3 teste 268 háromszög, nem 29 258.

TORONY- ÉS LÖVEGVÁLASZTÁS: egy járműnek több tornya lehet. Azt választjuk,
amelyiknek a legvastagabb lemeze megegyezik a WG API `armor.turret.front`
értékével — vagyis a paklinkban szereplő, teljesen fejlesztett toronnyal.
Ez ellenőrizhető szabály, nem tipp. A löveget névegyeztetéssel.

    python3 tools/build_armor_models.py --tier 8 --top 40
    python3 tools/build_armor_models.py --tanks is-3 tiger-ii t32
"""

import argparse, json, os, re, struct, subprocess, sys, urllib.request
from concurrent.futures import ThreadPoolExecutor

REPO = "/home/user/Flashcards"
CACHE = "/tmp/claude-0/-home-user-Flashcards/42a55c29-879d-5a40-8734-3feeebe8356a/scratchpad/collision"
RAW = "https://raw.githubusercontent.com/unicum-gg/wot.models/WG/vehicles"
OUT = f"{REPO}/models/armor"

# A WG API nemzetkódja vs. a játék saját könyvtárneve.
NATION_DIR = {
    "ussr": "russian", "germany": "german", "usa": "american", "france": "french",
    "uk": "british", "china": "chinese", "japan": "japan", "czech": "czech",
    "sweden": "sweden", "poland": "poland", "italy": "italy",
}

# Amit a lemez nevéből tudunk: a játék néhány csoportot külön kezel.
SPECIAL = {"leftTrack": "track", "rightTrack": "track",
           "gun": "gun", "surveyingDevice": "optics"}

PART_HU = {"Hull": "Test", "Chassis": "Futómű", "Turret": "Torony", "Gun": "Ágyú"}


def load_tanks():
    """A generált tanks-data.js-t a node-dal olvassuk be, hogy ne kelljen parse-olni."""
    js = 'console.log(JSON.stringify(require(process.argv[1]).TANKS))'
    out = subprocess.run(["node", "-e", js, f"{REPO}/js/tanks-data.js"],
                         capture_output=True, text=True, check=True)
    return json.loads(out.stdout)


def fetch_collision(nation, tag):
    os.makedirs(CACHE, exist_ok=True)
    dst = f"{CACHE}/{tag}.json"
    if os.path.exists(dst):
        return json.load(open(dst))
    url = f"{RAW}/{NATION_DIR[nation]}/{tag}/collision.json"
    try:
        with urllib.request.urlopen(url, timeout=60) as r:
            data = r.read()
    except Exception:
        return None
    open(dst, "wb").write(data)
    return json.loads(data)


def pick_turret(col, api_front):
    """A torony, aminek a legvastagabb lemeze a LEGKÖZELEBB van az API
    homlokpáncéljához. Nem pontos egyezés kell: az API kerekít (38 vs 38.1,
    178 vs 177.8). Holtversenynél — pl. két egyforma páncélú torony — a
    magasabb sorszámú nyer, mert a fejlesztett torony jön később."""
    turrets = {k: v for k, v in col["armor"].items() if k.startswith("Turret")}
    if not turrets:
        return None
    top = {k: max(v.values()) if v else 0 for k, v in turrets.items()}
    ref = api_front if api_front is not None else max(top.values())
    return min(turrets, key=lambda k: (abs(top[k] - ref), -int(re.sub(r"\D", "", k) or 0)))


def norm(s):
    return re.sub(r"[^a-z0-9]", "", s.lower())


def pick_gun(col, turret, gun_name):
    """Löveg névegyeztetéssel: a modul kulcsa `_122mm_BL_9_IS_3`, a mi nevünk
    `122 mm BL-9 (IS-3)` — írásjelek nélkül ugyanaz."""
    guns = {k: v for k, v in col["parts"].items() if k.startswith("Gun")}
    if not guns:
        return None
    want = norm(gun_name)
    for mod, part in (col.get("modules") or {}).items():
        if part in guns and norm(mod) == want:
            return part
    return sorted(guns)[-1]


def assemble(col, turret, gun):
    """Részek egy hálóba, a felszerelési pontok szerint eltolva.

    A részek a SAJÁT origójuk köré vannak modellezve, ezért a testet a
    hullPosition, a tornyot a mounts.turret, a löveget a mounts.guns[torony]
    szerint kell a helyére tenni — különben egymásba csúsznak."""
    hp = col.get("hullPosition") or [0, 0, 0]
    mt = (col.get("mounts") or {}).get("turret") or [0, 0, 0]
    mg = ((col.get("mounts") or {}).get("guns") or {}).get(turret) or [0, 0, 0]

    t_off = [hp[i] + mt[i] for i in range(3)]
    g_off = [t_off[i] + mg[i] for i in range(3)]

    plan = [("Chassis", [0, 0, 0]), ("Hull", hp)]
    if turret:
        plan.append((turret, t_off))
    if gun:
        plan.append((gun, g_off))

    plates, verts = [], []          # plates: lemeztábla, verts: (x,y,z,plateId)
    tris = []
    for part, off in plan:
        p = col["parts"].get(part)
        if not p:
            continue
        pos = p["positions"]
        idx = p["indices"]
        arm = (col.get("armor") or {}).get(part, {})
        spaced = set((col.get("spaced") or {}).get(part, []))
        base = len(verts)
        for i in range(0, len(pos), 3):
            verts.append((pos[i] + off[0], pos[i+1] + off[1], pos[i+2] + off[2]))
        for g in p["groups"]:
            kind = SPECIAL.get(g["name"], "armor")
            pid = len(plates)
            plates.append({
                "part": part, "group": g["name"], "kind": kind,
                "mm": arm.get(g["name"], 0) or 0,
                "spaced": g["name"] in spaced,
            })
            for k in range(g["start"], g["start"] + g["count"], 3):
                tris.append((base + idx[k], base + idx[k+1], base + idx[k+2], pid))
    return verts, tris, plates


def write_model(tank, verts, tris, plates, turret, gun):
    """Tömör, indexelt formátum (2. változat):

        int16 x3 x V   csúcspozíciók, a befoglaló doboz közepéhez igazítva
        uint16 x3 x T  háromszög-indexek
        uint8 x T      a háromszög lemezének sorszáma a `plates` táblában

    A normált NEM tároljuk: a böngésző a háromszögből számolja, és a lapos
    árnyaláshoz úgyis szét kell bontania a csúcsokat. Így egy tank ~2,5-ször
    kisebb, mint osztatlan csúcsokkal."""
    os.makedirs(OUT, exist_ok=True)
    used = sorted({i for t in tris for i in t[:3]})
    if len(used) > 65535:
        raise ValueError(f"{len(used)} csúcs nem fér uint16 indexbe")
    remap = {old: new for new, old in enumerate(used)}

    lo = [min(verts[i][k] for i in used) for k in range(3)]
    hi = [max(verts[i][k] for i in used) for k in range(3)]
    ctr = [(lo[k] + hi[k]) / 2 for k in range(3)]
    half = max(hi[k] - lo[k] for k in range(3)) / 2 or 1.0
    scale = 32000 / half

    pos = bytearray()
    for i in used:
        pos += struct.pack("<3h", *(int(round((verts[i][k] - ctr[k]) * scale)) for k in range(3)))
    idx = bytearray(); pid = bytearray()
    for a, b, c, p in tris:
        idx += struct.pack("<3H", remap[a], remap[b], remap[c])
        pid += struct.pack("<B", p)

    blob = bytes(pos) + bytes(idx) + bytes(pid)
    open(f"{OUT}/{tank['id']}.bin", "wb").write(blob)
    meta = {
        "format": 2, "tank": tank["id"], "name": tank["name"], "tag": tank["tag"],
        "vertexCount": len(used), "triCount": len(tris), "scale": scale,
        "sizeMeters": [round(hi[k] - lo[k], 3) for k in range(3)],
        "turret": turret, "gun": gun,
        "plates": plates,
    }
    json.dump(meta, open(f"{OUT}/{tank['id']}.json", "w"), ensure_ascii=False,
              separators=(",", ":"))
    return len(tris), len(blob)


def one(tank):
    col = fetch_collision(tank["nation"], tank["tag"])
    if not col or "parts" not in col:
        return (tank["id"], None, "nincs modell")
    api_front = ((tank.get("armor") or {}).get("turret") or {}).get("front")
    turret = pick_turret(col, api_front)
    top_gun = (tank.get("guns") or [{}])[-1].get("name", "")
    gun = pick_gun(col, turret, top_gun)
    verts, tris, plates = assemble(col, turret, gun)
    if not tris:
        return (tank["id"], None, "üres háló")
    if len(plates) > 255:
        return (tank["id"], None, f"{len(plates)} lemez > 255")
    ntri, nbytes = write_model(tank, verts, tris, plates, turret, gun)
    # figyelmeztetés, ha még a legközelebbi torony is messze van (>10%)
    tmax = max((col["armor"].get(turret) or {"_": 0}).values()) if turret else 0
    matched = api_front is None or abs(tmax - api_front) <= 0.1 * max(api_front, 1)
    return (tank["id"], (ntri, nbytes, len(plates), turret, gun, matched), None)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--tanks", nargs="*", help="tank id-k")
    ap.add_argument("--tier", type=int, help="csak ez a szint")
    ap.add_argument("--top", type=int, help="a szint N legjátszottabb járműve")
    ap.add_argument("--workers", type=int, default=6)
    a = ap.parse_args()

    tanks = load_tanks()
    if a.tanks:
        sel = [t for t in tanks if t["id"] in set(a.tanks)]
    else:
        sel = [t for t in tanks if a.tier is None or t["tier"] == a.tier]
        if a.top:
            sel = [t for t in sel if t.get("play")]
            sel.sort(key=lambda t: t["play"]["rank"])
            sel = sel[:a.top]
    print(f"{len(sel)} jármű")

    with ThreadPoolExecutor(max_workers=a.workers) as pool:
        res = list(pool.map(one, sel))

    ok = [r for r in res if r[1]]
    bad = [r for r in res if not r[1]]
    total = sum(r[1][1] for r in ok)
    unmatched = [r[0] for r in ok if not r[1][5]]
    for tid, info, _ in sorted(ok, key=lambda r: -r[1][1])[:8]:
        ntri, nb, npl, tur, gun, _m = info
        print(f"  {tid:<24} {ntri:>6} háromszög  {nb//1024:>4} KB  {npl:>3} lemez  {tur}/{gun}")
    print(f"kész: {len(ok)} modell, összesen {total//1024} KB")
    if unmatched:
        print(f"torony nem egyezett az API homlokpáncéljával ({len(unmatched)}): "
              + ", ".join(unmatched[:10]))
    if bad:
        print(f"kimaradt ({len(bad)}): " + ", ".join(f"{t}={e}" for t, _, e in bad[:10]))
    write_index()
    return 0


def write_index():
    """js/armor-models.js: mely tankokhoz van modell — az app ebből tudja,
    hogy kirakja-e a „3D páncél” gombot. A lemezen lévő fájlokból készül, így
    több futtatás eredménye is összeadódik."""
    ids = sorted(f[:-5] for f in os.listdir(OUT) if f.endswith(".json"))
    body = ",\n".join(f'  "{i}"' for i in ids)
    open(f"{REPO}/js/armor-models.js", "w").write(
        "/* GENERÁLT FÁJL — tools/build_armor_models.py írja. */\n"
        f"window.ARMOR_MODELS = new Set([\n{body}\n]);\n")
    print(f"js/armor-models.js: {len(ids)} tank")


if __name__ == "__main__":
    sys.exit(main())
