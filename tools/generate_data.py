"""
all_vehicles.json -> js/tanks-data.js + img/*.png

A tools/fetch_vehicles.py nyers kimenetéből készíti el a generált adatfájlt,
és letölti a hivatalos WoT garázs-rendereket. A képekbe égetett halvány
árnyékot átlátszóvá teszi, hogy a kártyán ne látszódjon dobozként.

    python3 tools/generate_data.py
"""
import json, os, re, datetime, urllib.request, unicodedata
from concurrent.futures import ThreadPoolExecutor
from PIL import Image

S    = "/tmp/claude-0/-home-user-Flashcards/42a55c29-879d-5a40-8734-3feeebe8356a/scratchpad"
REPO = "/home/user/Flashcards"
data = json.load(open(f"{S}/all_vehicles.json"))

NATION_HU = {"ussr":("Szovjet","🇷🇺"), "germany":("Német","🇩🇪"), "usa":("Amerikai","🇺🇸"),
             "france":("Francia","🇫🇷"), "uk":("Brit","🇬🇧"), "china":("Kínai","🇨🇳"),
             "japan":("Japán","🇯🇵"), "czech":("Cseh","🇨🇿"), "sweden":("Svéd","🇸🇪"),
             "poland":("Lengyel","🇵🇱"), "italy":("Olasz","🇮🇹")}
TYPE_HU = {"heavyTank":"Nehéz harckocsi","mediumTank":"Közepes harckocsi",
           "lightTank":"Könnyű harckocsi","AT-SPG":"Páncélvadász","SPG":"Önjáró löveg"}

def slug(name, tag):
    s = unicodedata.normalize("NFKD", name).encode("ascii","ignore").decode()
    s = re.sub(r"[^a-zA-Z0-9]+", "-", s).strip("-").lower()
    return s or tag.lower()

# --- egyedi id-k
#
# Az id egyben a képfájl neve (img/<id>.png) és az armor-zones.js kulcsa, ezért
# STABILNAK kell lennie: ha új járművek jönnek, a meglévők id-je nem változhat.
# Ezért tank_id szerint rendezve osztjuk ki, ütközésnél pedig a tank_id-t
# ragasztjuk a végére — nem sorszámot, ami a beolvasási sorrendtől függne.
# (Több azonos nevű jármű létezik, pl. a Frontline-változatok.)
ids = {}
names = {}
for tid, t in sorted(data.items(), key=lambda kv: int(kv[0])):
    names.setdefault(slug(t["name"], t["tag"]), []).append(tid)
for base, tids in names.items():
    for tid in tids:
        ids[tid] = base if len(tids) == 1 else f"{base}-{tid}"

# --- képek
# A régi id-sémából örökölt fájlokat átnevezzük, hogy ne kelljen újra letölteni
# (és ne maradjanak árván a lemezen).
os.makedirs(f"{REPO}/img", exist_ok=True)
old_path = f"{REPO}/js/tanks-data.js"
if os.path.exists(old_path):
    prev = dict(re.findall(r'id: "([^"]+)", tankId: (\d+)', open(old_path, encoding="utf-8").read()))
    # Két menetben, hogy a láncok (A->B, B->C) ne írjanak felül semmit.
    moves = [(o, ids[t]) for o, t in prev.items()
             if t in ids and ids[t] != o and os.path.exists(f"{REPO}/img/{o}.png")]
    for old_id, _ in moves:
        os.replace(f"{REPO}/img/{old_id}.png", f"{REPO}/img/.rename-{old_id}")
    for old_id, new_id in moves:
        os.replace(f"{REPO}/img/.rename-{old_id}", f"{REPO}/img/{new_id}.png")
    if moves:
        print(f"  {len(moves)} kép átnevezve az új id-sémára")

# Ezer képnél a soros letöltés ~13 kép/perc, azaz több mint egy óra. A letöltés
# hálózatra vár, nem CPU-ra, ezért szálakkal jól párhuzamosítható.
def grab(item):
    tid, t = item
    dst = f"{REPO}/img/{ids[tid]}.png"
    if os.path.exists(dst): return 0
    tmp = f"{dst}.tmp"
    try:
        with urllib.request.urlopen(t["image"].replace("http://","https://"), timeout=45) as r, \
             open(tmp, "wb") as f:
            f.write(r.read())
        im = Image.open(tmp).convert("RGBA")
        # a WG ikonokba égetett halvány árnyékot eltüntetjük
        im.putalpha(im.getchannel("A").point(lambda v: 0 if v < 20 else v))
        im.save(dst, optimize=True)
        os.remove(tmp)
        return 1
    except Exception as e:
        print("  kép hiba", t["name"], e, flush=True)
        if os.path.exists(tmp): os.remove(tmp)
        return 0

with ThreadPoolExecutor(max_workers=8) as pool:
    new = sum(pool.map(grab, data.items()))
print(f"képek: {new} új, összesen {len(data)}")

# --- adatfájl
def js(v):
    if v is None: return "null"
    if isinstance(v, bool): return "true" if v else "false"
    if isinstance(v, (int, float)): return repr(v)
    return json.dumps(v, ensure_ascii=False)

TYPE_ORDER = ["heavyTank","mediumTank","lightTank","AT-SPG","SPG"]
order = sorted(data.items(), key=lambda kv: (
    kv[1]["tier"],
    list(NATION_HU).index(kv[1]["nation"]) if kv[1]["nation"] in NATION_HU else 99,
    TYPE_ORDER.index(kv[1]["type"]) if kv[1]["type"] in TYPE_ORDER else 9,
    kv[1]["name"]))

tiers = sorted({t["tier"] for t in data.values()})
span = f"tier {tiers[0]}" if len(tiers) == 1 else f"tier {tiers[0]}–{tiers[-1]}"

L = [
 "/*",
 " * GENERÁLT FÁJL — NE SZERKESZD KÉZZEL.",
 " *",
 " * Forrás: Wargaming World of Tanks API (encyclopedia/vehicles +",
 f" * encyclopedia/vehicleprofile), EU szerver. Lekérve: {datetime.date.today()}",
 f" * Tartalom: mind a {len(data)} jármű, {span}.",
 " *",
 " * Minden szám a JÁTÉK ALAPÉRTÉKE: nincs benne legénységi képzettség,",
 " * felszerelés vagy fogyóeszköz.",
 " *",
 " * A páncél NOMINÁLIS vastagság. Dőlésszögek, effektív értékek és gyenge",
 " * pontok kézi adatok, lásd js/armor-zones.js (egyelőre öt tankhoz).",
 " */",
 "",
 "const TANKS = [",
]
for tid, t in order:
    nat, flag = NATION_HU.get(t["nation"], (t["nation"], ""))
    a = t["armor"]
    hull = a.get("hull") or {"front":0,"sides":0,"rear":0}
    # A vadászpáncélosoknak és tüzéreknek gyakran nincs forgó tornyuk,
    # ilyenkor az API turret mezője null — ezt null-ként adjuk tovább,
    # és az app kihagyja a torony sorokat.
    tur = a.get("turret")
    L += ["  {",
      f'    id: {js(ids[tid])}, tankId: {t["tank_id"]}, tag: {js(t["tag"])},',
      f'    name: {js(t["name"])}, short: {js(t["short"])},',
      f'    nation: {js(t["nation"])}, nationHu: {js(nat)}, flag: {js(flag)},',
      f'    tier: {t["tier"]}, type: {js(t["type"])}, typeHu: {js(TYPE_HU.get(t["type"], t["type"]))},',
      f'    isPremium: {js(t["isPremium"])}, image: {js("img/" + ids[tid] + ".png")},',
      f'    hp: {js(t["hp"])}, weight: {js(t["weight"])},',
      f'    armor: {{ hull: {{ front: {hull["front"]}, sides: {hull["sides"]}, rear: {hull["rear"]} }},'
      + (f' turret: {{ front: {tur["front"]}, sides: {tur["sides"]}, rear: {tur["rear"]} }} }},'
         if tur else ' turret: null },'),
      f'    mobility: {{ topSpeed: {js(t["speedF"])}, reverse: {js(t["speedR"])},'
      f' enginePower: {js(t["enginePower"])}, hpPerTon: {js(t["hpPerTon"])},'
      f' turretTraverse: {js(t["turretTraverse"])}, hullTraverse: {js(t["hullTraverse"])} }},',
      f'    vision: {{ viewRange: {js(t["viewRange"])} }},',
      "    guns: ["]
    for g in t["guns"]:
        L.append("      { " + ", ".join(f"{k}: {js(g.get(k))}" for k in
                 ["name","caliber","stock","alpha","penAP","penPrem","premType","penHE",
                  "reload","dpm","accuracy","aimTime","depression"]) + " },")
    L += ["    ],", "  },"]
L += ["];", "",
 'if (typeof window !== "undefined") window.TANKS = TANKS;',
 'if (typeof module !== "undefined") module.exports = { TANKS };', ""]

open(f"{REPO}/js/tanks-data.js","w").write("\n".join(L))
print(f"js/tanks-data.js: {len(L)} sor, {os.path.getsize(REPO+'/js/tanks-data.js')//1024} KB")
