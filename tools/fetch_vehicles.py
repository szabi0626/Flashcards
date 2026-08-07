"""
Járművek lekérése a Wargaming API-ból.

Kimenet: all_vehicles.json (nyers adat, fegyverenkénti profilokkal).
Onnan a tools/generate_data.py készíti a js/tanks-data.js-t és tölti le a képeket.

Kell hozzá egy ingyenes application_id a developers.wargaming.net-ről
(Mobile típus, hogy ne legyen IP-hez kötve):

    WG_ID=xxxxxxxx python3 tools/fetch_vehicles.py          # mind az 1009 jármű
    WG_ID=xxxxxxxx python3 tools/fetch_vehicles.py 8        # csak tier 8
    WG_ID=xxxxxxxx python3 tools/fetch_vehicles.py 8 9 10   # több tier

Megszakítás után folytatható: a már kész járműveket kihagyja.
A kulcs SOHA nem kerül a repóba — csak környezeti változóból olvassuk.
"""
import json, os, time, urllib.request, urllib.parse, sys, threading
from concurrent.futures import ThreadPoolExecutor

# A WG API dokumentált korlátja 10 kérés/másodperc. Járművenként külön szálon
# dolgozunk (egy jármű lövegeit egymás után), ennyi szállal ~8 kérés/mp jön ki.
WORKERS = 4

WG  = os.environ["WG_ID"]
API = "https://api.worldoftanks.eu/wot/encyclopedia"
S   = "/tmp/claude-0/-home-user-Flashcards/42a55c29-879d-5a40-8734-3feeebe8356a/scratchpad"
TYPES = {"gun":"vehicleGun","turret":"vehicleTurret","engine":"vehicleEngine","suspension":"vehicleChassis"}

def api(path, tries=4, **p):
    p["application_id"] = WG
    url = f"{API}/{path}/?" + urllib.parse.urlencode(p)
    for a in range(tries):
        try:
            d = json.loads(urllib.request.urlopen(url, timeout=45).read())
            if d.get("status") == "ok": return d["data"]
            err = d.get("error", {})
            if err.get("code") in (407, 504) and a < tries-1:
                time.sleep(2*(a+1)); continue
            raise RuntimeError(f"{path}: {err}")
        except Exception as e:
            if a == tries-1: raise
            time.sleep(2*(a+1))

def nom(t):  return t[1] if isinstance(t, list) and len(t) == 3 else t

def gun_stats(p):
    g = p["gun"]; sh = {a["type"]: a for a in p.get("ammo", [])}
    ap   = sh.get("ARMOR_PIERCING") or {}
    prem = sh.get("ARMOR_PIERCING_CR") or sh.get("HOLLOW_CHARGE") or {}
    he   = sh.get("HIGH_EXPLOSIVE") or {}
    alpha = nom(ap.get("damage")) or nom(prem.get("damage")) or nom(he.get("damage"))
    return {
        "name": g["name"], "caliber": g["caliber"], "alpha": alpha,
        "penAP": nom(ap.get("penetration")), "penPrem": nom(prem.get("penetration")),
        "premType": "APCR" if "ARMOR_PIERCING_CR" in sh else ("HEAT" if "HOLLOW_CHARGE" in sh else None),
        "penHE": nom(he.get("penetration")),
        "reload": g["reload_time"], "dpm": round((alpha or 0) * g["fire_rate"]),
        "accuracy": g["dispersion"], "aimTime": g["aim_time"],
        "depression": -g["move_down_arc"],
    }

# ---- 1. a kért járművek alapadata (több körben, hogy ne legyen óriási a válasz)
tiers = [int(a) for a in sys.argv[1:]]
if tiers:
    ids = sorted(int(k) for t in tiers for k in api("vehicles", tier=t, fields="tank_id"))
    print(f"{len(ids)} jármű a(z) {tiers} tier(ek)ből", flush=True)
else:
    ids = sorted(int(k) for k in api("vehicles", fields="tank_id"))
    print(f"{len(ids)} jármű (minden tier)", flush=True)

vehicles = {}
FIELDS = "tank_id,name,short_name,nation,tier,type,is_premium,tag,images,default_profile,modules_tree"
for i in range(0, len(ids), 20):
    chunk = ids[i:i+20]
    vehicles.update(api("vehicles", tank_id=",".join(map(str,chunk)), fields=FIELDS))
    print(f"  alapadat {len(vehicles)}/{len(ids)}", flush=True)
    time.sleep(0.3)

# ---- 2. fegyverenkénti profil
out = {}
done = 0
resume = f"{S}/all_vehicles.json"
if os.path.exists(resume):
    out = json.load(open(resume)); print(f"folytatás: {len(out)} kész", flush=True)

lock = threading.Lock()

def build(item):
    """Egy jármű teljes adata. Szálanként fut, csak az `out`-hoz nyúl zárral."""
    global done
    tid, v = item
    tree = v.get("modules_tree") or {}
    tops = {}
    for k, t in TYPES.items():
        cand = [m for m in tree.values() if m["type"] == t]
        tops[k] = max(cand, key=lambda m: m.get("price_xp") or 0)["module_id"] if cand else None
    guns = sorted((m for m in tree.values() if m["type"] == "vehicleGun"),
                  key=lambda m: m.get("price_xp") or 0)

    profiles, full = [], v["default_profile"]
    if not guns:                                  # prémium: egy konfiguráció
        gs = gun_stats(full); gs["stock"] = True; profiles = [gs]
    else:
        for gi, gm in enumerate(guns):
            try:
                p = api("vehicleprofile", tank_id=int(tid), gun_id=gm["module_id"],
                        **{f"{k}_id": tops[k] for k in ("turret","engine","suspension") if tops[k]})[str(tid)]
            except Exception as e:
                print(f"    ! {v['name']} / {gm['name']}: {e}", flush=True); continue
            gs = gun_stats(p); gs["stock"] = (gi == 0); profiles.append(gs)
            full = p

    if not profiles:                              # minden profilkérés elhasalt
        print(f"    ! {v['name']}: nincs használható profil, kihagyva", flush=True)
        return

    a = full["armor"]; t = full["turret"]; e = full["engine"]
    rec = {
        "tank_id": int(tid), "name": v["name"], "short": v.get("short_name") or v["name"],
        "nation": v["nation"], "tier": v["tier"], "type": v["type"],
        "isPremium": bool(v["is_premium"]), "tag": v["tag"],
        "image": v["images"]["big_icon"],
        "hp": full["hp"], "weight": round(full["weight"]/1000, 1),
        "armor": a,
        "speedF": full["speed_forward"], "speedR": full["speed_backward"],
        "enginePower": e["power"], "hpPerTon": round(e["power"]/(full["weight"]/1000), 1),
        "viewRange": t["view_range"], "turretTraverse": t["traverse_speed"],
        "hullTraverse": full["suspension"]["traverse_speed"],
        "guns": profiles,
    }
    with lock:
        out[tid] = rec
        done += 1
        if done % 20 == 0:
            json.dump(out, open(resume, "w"), ensure_ascii=False)
            print(f"  {len(out)}/{len(vehicles)} kész", flush=True)

todo = [(tid, v) for tid, v in vehicles.items() if tid not in out]
print(f"lekérendő: {len(todo)} jármű, {WORKERS} szálon", flush=True)
with ThreadPoolExecutor(max_workers=WORKERS) as pool:
    list(pool.map(build, todo))

json.dump(out, open(resume,"w"), ensure_ascii=False)
print(f"KÉSZ: {len(out)} jármű -> all_vehicles.json", flush=True)
