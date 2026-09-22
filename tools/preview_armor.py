"""
A models/armor/*.bin ellenőrző kirajzolása PNG-be.

Ugyanazt számolja, mint a böngészős nézegető shadere (effektív páncél a
nézőszögből), csak numpy-val és offline — így látni lehet, hogy a modell
tényleg arra a tankra hasonlít-e, és hogy a lemezek a helyükön vannak-e,
anélkül hogy böngészőt kellene indítani.

    python3 tools/preview_armor.py is-3
    python3 tools/preview_armor.py is-3 --yaw 30 --pitch 20 --pen 220
"""

import argparse, json, struct, sys
import numpy as np
from PIL import Image

REPO = "/home/user/Flashcards"
SIZE = 560


def load(tank):
    """A 2. formátumot (indexelt) szétbontja osztatlan csúcsokra, lapnormállal —
    pontosan úgy, ahogy a böngészős nézegető is."""
    meta = json.load(open(f"{REPO}/models/armor/{tank}.json"))
    raw = open(f"{REPO}/models/armor/{tank}.bin", "rb").read()
    V, T = meta["vertexCount"], meta["triCount"]
    verts = np.frombuffer(raw, "<i2", count=V * 3).reshape(V, 3) / meta["scale"]
    idx = np.frombuffer(raw, "<u2", count=T * 3, offset=V * 6).reshape(T, 3)
    plate = np.frombuffer(raw, "<u1", count=T, offset=V * 6 + T * 6)
    pos = verts[idx].reshape(-1, 3)
    a, b, c = verts[idx[:, 0]], verts[idx[:, 1]], verts[idx[:, 2]]
    n = np.cross(b - a, c - a)
    n /= np.linalg.norm(n, axis=1, keepdims=True) + 1e-12
    nrm = np.repeat(n, 3, axis=0)
    pid = np.repeat(plate, 3)
    return meta, pos, nrm, pid


def effective(mm, cos_a):
    """effektív = nominális / cos(becsapódási szög). A shaderrel egyezően
    5 fok normalizációval (AP) és 70 fok fölött lepattanással."""
    ang = np.degrees(np.arccos(np.clip(cos_a, 1e-3, 1.0)))
    ang = np.maximum(ang - 5.0, 0.0)
    eff = mm / np.cos(np.radians(np.minimum(ang, 89.0)))
    eff[ang >= 70.0] = 1e4                      # lepattan
    return eff


def render(tank, yaw, pitch, pen):
    meta, pos, nrm, pid = load(tank)
    plates = meta["plates"]
    mm = np.array([p["mm"] for p in plates], float)[pid]
    kind = np.array([p["kind"] for p in plates])[pid]

    cy, sy = np.cos(np.radians(yaw)), np.sin(np.radians(yaw))
    cp, sp = np.cos(np.radians(pitch)), np.sin(np.radians(pitch))
    Ry = np.array([[cy, 0, sy], [0, 1, 0], [-sy, 0, cy]])
    Rx = np.array([[1, 0, 0], [0, cp, -sp], [0, sp, cp]])
    R = Rx @ Ry
    P = pos @ R.T
    N = nrm @ R.T

    half = max(np.ptp(P[:, 0]), np.ptp(P[:, 1])) / 2 * 1.12 or 1.0
    sx = (P[:, 0] / half * 0.5 + 0.5) * SIZE
    sy_ = (0.5 - P[:, 1] / half * 0.5) * SIZE

    img = np.zeros((SIZE, SIZE, 3), np.float32)
    depth = np.full((SIZE, SIZE), -1e9, np.float32)

    # Nincs hátlap-eldobás: a forrásháló körüljárása nem egységes (a
    # lánctalpnál kb. fele-fele), ezért a z-buffer dönti el, mi látszik, és
    # a becsapódási szöghöz a normál ABSZOLÚT értékét vesszük.
    tri = np.arange(len(P)).reshape(-1, 3)
    order = np.argsort(P[tri[:, 0], 2])
    for t in order:
        i = tri[t]
        cosang = abs(float(N[i[0], 2]))
        thickness = mm[i[0]]
        k = kind[i[0]]
        if k == "track":
            col = np.array([0.30, 0.30, 0.28])
        elif k in ("gun", "optics") or thickness <= 0:
            col = np.array([0.45, 0.45, 0.48])
        else:
            eff = effective(np.array([thickness]), np.array([cosang]))[0]
            r = np.clip(eff / max(pen, 1), 0, 2)
            col = (np.array([0.20, 0.80, 0.30]) if r < 0.85 else
                   np.array([0.95, 0.80, 0.15]) if r < 1.15 else
                   np.array([0.90, 0.20, 0.20]))
        col = col * (0.45 + 0.55 * cosang)

        x, y, z = sx[i], sy_[i], P[i, 2]
        x0, x1 = int(max(0, np.floor(x.min()))), int(min(SIZE - 1, np.ceil(x.max())))
        y0, y1 = int(max(0, np.floor(y.min()))), int(min(SIZE - 1, np.ceil(y.max())))
        if x1 < x0 or y1 < y0:
            continue
        gx, gy = np.meshgrid(np.arange(x0, x1 + 1), np.arange(y0, y1 + 1))
        d = ((y[1]-y[2])*(x[0]-x[2]) + (x[2]-x[1])*(y[0]-y[2]))
        if abs(d) < 1e-9:
            continue
        w0 = ((y[1]-y[2])*(gx+.5-x[2]) + (x[2]-x[1])*(gy+.5-y[2])) / d
        w1 = ((y[2]-y[0])*(gx+.5-x[2]) + (x[0]-x[2])*(gy+.5-y[2])) / d
        w2 = 1 - w0 - w1
        inside = (w0 >= 0) & (w1 >= 0) & (w2 >= 0)
        zz = w0*z[0] + w1*z[1] + w2*z[2]
        m = inside & (zz > depth[y0:y1+1, x0:x1+1])
        if not m.any():
            continue
        depth[y0:y1+1, x0:x1+1][m] = zz[m]
        img[y0:y1+1, x0:x1+1][m] = col
    return Image.fromarray((np.clip(img, 0, 1) * 255).astype(np.uint8))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("tank")
    ap.add_argument("--yaw", type=float, default=35)
    ap.add_argument("--pitch", type=float, default=18)
    ap.add_argument("--pen", type=float, default=220)
    ap.add_argument("--out")
    a = ap.parse_args()
    img = render(a.tank, a.yaw, a.pitch, a.pen)
    out = a.out or f"/tmp/claude-0/-home-user-Flashcards/42a55c29-879d-5a40-8734-3feeebe8356a/scratchpad/{a.tank}_{int(a.yaw)}.png"
    img.save(out)
    print(out)
    return 0


if __name__ == "__main__":
    sys.exit(main())
