"""
A tools/fetch_playrate.py kimenetét beleírja a js/tanks-data.js-be.

Minden tank kap egy `play` mezőt a `guns` elé:

    play: { battles: 83366, rank: 12, share: 1.4, winrate: 46.35 },

A `rank` és a `share` SZINTEN BELÜL értendő — lásd a fetch_playrate.py-t.

Aminek nincs mérhető forgalma (esemény- és Frontline-változatok, kiadatlan
prototípusok), az `play: null`-t kap — nem nulla, mert az azt sugallná, hogy
mértük és nulla lett; valójában meg sem jelenik a forrás táblázatában.

    python3 tools/fetch_playrate.py EU 30 > playrate.json
    python3 tools/merge_playrate.py playrate.json
"""

import json, re, sys

DATA = "/home/user/Flashcards/js/tanks-data.js"

# Egy tank blokk a `tankId: N,` sorral kezdődik és a `guns: [` sorig tart.
BLOCK = re.compile(r"(tankId: (\d+),.*?\n)(\s*)(guns: \[)", re.S)


def main():
    play = json.load(open(sys.argv[1]))["tanks"]
    src = open(DATA, encoding="utf-8").read()

    # Ha már futott egyszer, előbb kiszedjük a régi sorokat — így idempotens.
    src = re.sub(r"^\s*play: (?:null|\{[^}]*\}),\n", "", src, flags=re.M)

    hit = [0, 0]

    def repl(m):
        head, tid, indent, tail = m.groups()
        p = play.get(tid)
        if p:
            hit[0] += 1
            val = (f"{{ battles: {p['battles']}, rank: {p['rank']}, "
                   f"share: {p['share']}, winrate: {p['winrate']} }}")
        else:
            hit[1] += 1
            val = "null"
        return f"{head}{indent}play: {val},\n{indent}{tail}"

    out, n = BLOCK.subn(repl, src)
    open(DATA, "w", encoding="utf-8").write(out)
    print(f"{n} tank feldolgozva: {hit[0]} adattal, {hit[1]} adat nélkül")
    return 0


if __name__ == "__main__":
    sys.exit(main())
