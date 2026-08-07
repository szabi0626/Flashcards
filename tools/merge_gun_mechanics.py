"""
A tools/fetch_gun_mechanics.py kimenetét beleírja a js/tanks-data.js-be.

Két helyre nyúl:

  guns[]    a löveg sorának végére kerül a `clip`, és ha a tár egynél több
            lövedéket tart, a `clipRate`, `autoreload`, `overheat` is
  vision    a `camoStill` / `camoMoving` — a WG encyclopedia API ezeket sem adja

A lövegeket NÉV szerint párosítjuk: a tankopédia `mark` mezője ugyanaz a
sztring, mint az API `gun.name`-je. Ami nem talál, azt kiírjuk — nem csendben
hagyjuk ki, mert abból később rossz kártya lesz.

Idempotens: a korábban beírt mezőket előbb eltávolítja.

    python3 tools/fetch_gun_mechanics.py <tank_id-k> > gun_mechanics.json
    python3 tools/merge_gun_mechanics.py gun_mechanics.json
"""

import json, re, sys

DATA = "/home/user/Flashcards/js/tanks-data.js"

GUN_NAME = re.compile(r'^\s*\{ name: "((?:[^"\\]|\\.)*)"')
TANK_ID = re.compile(r"tankId: (\d+),")
VISION = re.compile(r"^(\s*vision: \{ viewRange: [^,}]+)(?:, camo[^}]*)?( \},)$")


def num(v):
    """A JS oldalon a fölösleges .0 zajos, de az egész számokat tartsuk annak."""
    if isinstance(v, float) and v.is_integer():
        return str(int(v))
    return repr(v)


def gun_suffix(m):
    clip = m.get("clip")
    if clip is None:
        return ""
    bits = [f"clip: {int(clip)}"]
    if clip > 1:
        if m.get("clipRate") is not None:
            bits.append(f"clipRate: {num(m['clipRate'])}")
        if m.get("autoreload"):
            bits.append("autoreload: [" + ", ".join(num(x) for x in m["autoreload"]) + "]")
        if m.get("overheat"):
            bits.append("overheat: true")
    return ", " + ", ".join(bits)


def main():
    mech = json.load(open(sys.argv[1]))
    src = open(DATA, encoding="utf-8").read().splitlines()

    out, cur = [], None
    guns_hit = guns_miss = camo_hit = 0
    missing = []

    for line in src:
        t = TANK_ID.search(line)
        if t:
            cur = t.group(1)

        entry = mech.get(cur) or {}

        g = GUN_NAME.match(line)
        if g:
            base = line.split(", clip:")[0].rstrip()
            if base.endswith("},"):                     # nem volt korábbi klip-mező
                base = base[:-2].rstrip()
            m = (entry.get("guns") or {}).get(g.group(1))
            if m:
                guns_hit += 1
                out.append(f"{base}{gun_suffix(m)} }},")
            else:
                guns_miss += 1
                if entry.get("guns"):
                    missing.append(f"{cur}: {g.group(1)}")
                out.append(f"{base} }},")
            continue

        v = VISION.match(line)
        if v:
            camo = entry.get("camo")
            if camo:
                camo_hit += 1
                out.append(f"{v.group(1)}, camoStill: {camo['still']}, "
                           f"camoMoving: {camo['moving']}{v.group(2)}")
            else:
                out.append(f"{v.group(1)}{v.group(2)}")
            continue

        out.append(line)

    open(DATA, "w", encoding="utf-8").write("\n".join(out) + "\n")
    print(f"lövegek: {guns_hit} adattal, {guns_miss} nélküle")
    print(f"álca: {camo_hit} járműnél")
    if missing:
        print(f"NÉVÜTKÖZÉS ({len(missing)}) — a tankopédia ismeri a járművet, "
              f"de ezt a löveget nem találtam benne:")
        for x in missing[:20]:
            print("  " + x)
    return 0


if __name__ == "__main__":
    sys.exit(main())
