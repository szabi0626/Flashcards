"""
all_t8.json -> js/tanks-data.js + img/*.png

A tools/fetch_tier8.py nyers kimenetéből készíti el a generált adatfájlt,
és letölti a hivatalos WoT garázs-rendereket. A képekbe égetett halvány
árnyékot átlátszóvá teszi, hogy a kártyán ne látszódjon dobozként.

    python3 tools/generate_data.py
"""
import json, os, re, datetime, urllib.request, unicodedata
from PIL import Image

S    = "/tmp/claude-0/-home-user-Flashcards/42a55c29-879d-5a40-8734-3feeebe8356a/scratchpad"
REPO = "/home/user/Flashcards"
data = json.load(open(f"{S}/all_t8.json"))

NATION_HU = {"ussr":("Szovjet","🇷🇺"), "germany":("Német","🇩🇪"), "usa":("Amerikai","🇺🇸"),
             "france":("Francia","🇫🇷"), "uk":("Brit","🇬🇧"), "china":("Kínai","🇨🇳"),
             "japan":("Japán","🇯🇵"), "czech":("Cseh","🇨🇿"), "sweden":("Svéd","🇸🇪"),
             "poland":("Lengyel","🇵🇱"), "italy":("Olasz","🇮🇹")}
TYPE_HU = {"heavyTank":"Nehéz harckocsi","mediumTank":"Közepes harckocsi",
           "lightTank":"Könnyű harckocsi","AT-SPG":"Vadászpáncélos","SPG":"Önjáró löveg"}

def slug(name, tag):
    s = unicodedata.normalize("NFKD", name).encode("ascii","ignore").decode()
    s = re.sub(r"[^a-zA-Z0-9]+", "-", s).strip("-").lower()
    return s or tag.lower()

# --- egyedi id-k (névütközés lehet, pl. két azonos nevű prémium)
ids, used = {}, {}
for tid, t in data.items():
    base = slug(t["name"], t["tag"])
    if base in used:
        used[base] += 1; base = f"{base}-{used[base]}"
    else:
        used[base] = 1
    ids[tid] = base

# --- képek
os.makedirs(f"{REPO}/img", exist_ok=True)
new = 0
for tid, t in data.items():
    dst = f"{REPO}/img/{ids[tid]}.png"
    if os.path.exists(dst): continue
    try:
        urllib.request.urlretrieve(t["image"].replace("http://","https://"), dst + ".tmp")
        im = Image.open(dst + ".tmp").convert("RGBA")
        # a WG ikonokba égetett halvány árnyékot eltüntetjük
        im.putalpha(im.getchannel("A").point(lambda v: 0 if v < 20 else v))
        im.save(dst, optimize=True); os.remove(dst + ".tmp"); new += 1
    except Exception as e:
        print("  kép hiba", t["name"], e)
        if os.path.exists(dst + ".tmp"): os.remove(dst + ".tmp")
print(f"képek: {new} új, összesen {len(data)}")

# --- adatfájl
def js(v):
    if v is None: return "null"
    if isinstance(v, bool): return "true" if v else "false"
    if isinstance(v, (int, float)): return repr(v)
    return json.dumps(v, ensure_ascii=False)

order = sorted(data.items(), key=lambda kv: (
    list(NATION_HU).index(kv[1]["nation"]) if kv[1]["nation"] in NATION_HU else 99,
    ["heavyTank","mediumTank","lightTank","AT-SPG","SPG"].index(kv[1]["type"])
        if kv[1]["type"] in ["heavyTank","mediumTank","lightTank","AT-SPG","SPG"] else 9,
    kv[1]["name"]))

L = [
 "/*",
 " * GENERÁLT FÁJL — NE SZERKESZD KÉZZEL.",
 " *",
 " * Forrás: Wargaming World of Tanks API (encyclopedia/vehicles +",
 f" * encyclopedia/vehicleprofile), EU szerver. Lekérve: {datetime.date.today()}",
 f" * Tartalom: mind a {len(data)} tier 8 jármű.",
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
