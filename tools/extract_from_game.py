#!/usr/bin/env python3
"""
Tank modellek kikeresése a World of Tanks telepítésből.

A WoT a `res/packages/*.pkg` fájlokban tárolja az assetjeit, és ezek sima
ZIP archívumok — ezt a hivatalos modding guide is megerősíti
(https://modding.wot-tools.dev/tooling-packaging.html). Ez a szkript
végigkeresi őket egy tank belső neve alapján, és kimásolja a talált
fájlokat egy helyi mappába.

Minket két fájltípus érdekel:

    .primitives_processed   a geometria (csúcsok, háromszögek)
    .visual_processed       a szerkezet — és EBBEN vannak az ütközési
                            részek a páncélvastagságukkal együtt

A második a fontosabb: abból derül ki, hogy a játék szerint hol ér véget
a felső lemez és hol kezdődik az alsó, és mennyi mm mindegyik. Ez váltaná
ki a jelenlegi becsült zóna-besorolásunkat.

HASZNÁLAT

    python3 tools/extract_from_game.py                 # IS-3, automatikus keresés
    python3 tools/extract_from_game.py --tag G16_PzVIB_Tiger_II
    python3 tools/extract_from_game.py --wot "D:/Games/World_of_Tanks"
    python3 tools/extract_from_game.py --list          # csak listáz, nem másol

A tankok belső nevei (tag) a js/tanks-data.js-ben nincsenek benne, de a
WG API-ból származnak:

    IS-3         R19_IS-3            Tiger II   G16_PzVIB_Tiger_II
    T32          A12_T32             T-44       R20_T-44
    AMX 50 100   F08_AMX_50_100

MEGJEGYZÉS A FÁJLOKRÓL

A kimásolt fájlok a Wargaming assetjei, és a saját játékpéldányodból
származnak. Helyben, tanuláshoz használni rendben van; publikus repóba
feltölteni viszont terjesztés lenne. A tervünk ezért az, hogy a
*páncélszámokat és a zónahatárokat* nyerjük ki belőlük — azok tények —,
és a saját, egyszerűsített geometriánkra tegyük rá.
"""

import argparse
import os
import sys
import zipfile

# Szokásos telepítési helyek. A Wargaming Game Center verziószámozott
# almappákat használ, ezért azokra külön is ránézünk.
CANDIDATE_ROOTS = [
    r"C:\Games\World_of_Tanks",
    r"C:\Games\World_of_Tanks_EU",
    r"C:\Games\World_of_Tanks_NA",
    r"C:\Program Files\World_of_Tanks",
    r"C:\Program Files (x86)\World_of_Tanks",
    r"C:\Program Files (x86)\Steam\steamapps\common\World of Tanks",
    r"D:\Games\World_of_Tanks",
    os.path.expanduser("~/Games/World_of_Tanks"),
    "/Applications/World of Tanks.app",
]

WANTED_SUFFIXES = (
    ".primitives_processed",
    ".visual_processed",
    ".primitives",
    ".visual",
    ".model",
)


def find_wot(explicit=None):
    """Megkeresi a WoT gyökerét: ahol van egy res/packages mappa."""
    roots = [explicit] if explicit else CANDIDATE_ROOTS
    for r in roots:
        if not r:
            continue
        pkg = os.path.join(r, "res", "packages")
        if os.path.isdir(pkg):
            return r
    return None


def packages(root):
    pkg_dir = os.path.join(root, "res", "packages")
    return sorted(
        os.path.join(pkg_dir, f)
        for f in os.listdir(pkg_dir)
        if f.lower().endswith(".pkg")
    )


def search(root, tag, out_dir, list_only):
    pkgs = packages(root)
    print(f"{len(pkgs)} csomag a {os.path.join(root, 'res', 'packages')} mappában\n")

    hits = 0
    for path in pkgs:
        try:
            with zipfile.ZipFile(path) as z:
                names = [
                    n for n in z.namelist()
                    if tag.lower() in n.lower() and n.lower().endswith(WANTED_SUFFIXES)
                ]
                if not names:
                    continue
                print(f"  {os.path.basename(path)}")
                for n in names:
                    info = z.getinfo(n)
                    print(f"      {n}   ({info.file_size // 1024} KB)")
                    hits += 1
                    if not list_only:
                        z.extract(n, out_dir)
        except zipfile.BadZipFile:
            print(f"  (kihagyva, nem ZIP: {os.path.basename(path)})")
        except Exception as e:                       # noqa: BLE001
            print(f"  (hiba {os.path.basename(path)}: {e})")

    print()
    if not hits:
        print(f"Nem találtam '{tag}' nevű fájlt. Ellenőrizd a tag helyesírását,")
        print("vagy futtasd --list kapcsolóval egy rövidebb részlettel (pl. IS-3).")
        return 1

    if list_only:
        print(f"{hits} fájl található. Másoláshoz futtasd --list nélkül.")
    else:
        print(f"{hits} fájl kimásolva ide: {os.path.abspath(out_dir)}")
        print()
        print("KÖVETKEZŐ LÉPÉS")
        print("  A .primitives_processed + .visual_processed párost OBJ-vá alakítja")
        print("  pl. a https://github.com/atacms/wot-model-converter szkript.")
        print("  Az eredményt (vagy magát a két fájlt) küldd el, és feldolgozom.")
    return 0


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--tag", default="R19_IS-3", help="a tank belső neve (alapértelmezés: IS-3)")
    ap.add_argument("--wot", help="a World of Tanks mappa, ha nem találja magától")
    ap.add_argument("--out", default="game_models", help="hova másolja a fájlokat")
    ap.add_argument("--list", action="store_true", dest="list_only",
                    help="csak listázza a találatokat, nem másol")
    a = ap.parse_args()

    root = find_wot(a.wot)
    if not root:
        print("Nem találom a World of Tanks telepítést.")
        print("Add meg kézzel:  --wot \"C:/Games/World_of_Tanks\"")
        print("\nA keresett helyek:")
        for r in CANDIDATE_ROOTS:
            print("   ", r)
        return 2

    print(f"World of Tanks: {root}")
    print(f"Keresett tag:   {a.tag}\n")
    return search(root, a.tag, a.out, a.list_only)


if __name__ == "__main__":
    sys.exit(main())
