"""
Sketchfab 3D modell -> páncélzónákra osztott háló.

Egy letöltött GLB-t betölt, a háromszögeket geometriai szabályok alapján
páncélzónákba sorolja (csukaorr, alsó lemez, torony homlok, kupola stb.),
és ellenőrző képeket rajzol több nézőpontból.

Használat:
    pip install trimesh numpy pillow
    python3 tools/mesh_classify.py

ÁLLAPOT: működik, de a besorolás még pontatlan — a torony és a homloklemezek
határai csúsznak. A háló nem vízhatlan és a normálok ~46%-a befelé néz, ezért
azokat a test középpontjától kifelé forgatjuk (outward_normals).
"""
import trimesh, numpy as np
from PIL import Image, ImageDraw

ZONES = {
 "gun":         ((110,110,110), "Löveg", None),
 "track":       (( 70, 70, 60), "Lánctalp", None),
 "ufp":         ((235,170, 40), "Csukaorr (felső)", 110),
 "lfp":         (( 90,200, 90), "Alsó lemez", 110),
 "hull-side":   (( 60,150,220), "Oldal (test)", 90),
 "hull-roof":   ((150,220,240), "Testtető", 20),
 "hull-rear":   (( 40,100,160), "Hátulja", 60),
 "turret-front":((210, 60, 50), "Torony homlok", 249),
 "mantlet":     ((150, 30, 90), "Ágyúpajzs", 249),
 "turret-side": ((240,120, 80), "Torony oldal", 172),
 "turret-rear": ((160, 70, 60), "Torony hátulja", 100),
 "turret-roof": ((250,210,170), "Toronytető", 30),
}

def outward_normals(m):
    """A háló kevert körüljárású (a normálok ~46%-a befelé néz), ezért a
    lapok normálját a test középpontjától kifelé forgatjuk. Egy nagyjából
    domború harckocsitestnél ez helyes eredményt ad."""
    N = m.face_normals.copy()
    C = m.triangles_center
    ctr = m.vertices.mean(0)
    flip = np.einsum('ij,ij->i', N, C - ctr) < 0
    N[flip] *= -1
    return N

def classify(m):
    V, F = m.vertices, m.faces
    lo, hi = V.min(0), V.max(0); span = hi - lo
    C = m.triangles_center
    N = outward_normals(m)

    gunZ    = lo[2] + span[2]*0.655      # innen kezdődik a cső
    roofY   = lo[1] + 1500               # testtető magassága
    trackY  = lo[1] + 700                # lánctalp teteje
    halfW   = span[0]/2
    midY    = lo[1] + 1050               # felső/alsó homloklemez határa
    cx      = (lo[0]+hi[0])/2

    z = np.full(len(F), "hull-side", dtype=object)

    is_gun   = C[:,2] > gunZ
    is_tur   = (~is_gun) & (C[:,1] > roofY)
    is_hull  = (~is_gun) & (~is_tur)

    z[is_gun] = "gun"

    # --- torony ---
    t = is_tur
    # Csak a valóban vízszintes lapok tető; a kupola ferde része még homlok/oldal.
    z[t & (N[:,1] >  0.82)] = "turret-roof"
    fwd = t & (N[:,1] <= 0.82)
    z[fwd & (N[:,2] >  0.35)] = "turret-front"
    z[fwd & (N[:,2] < -0.35)] = "turret-rear"
    z[fwd & (np.abs(N[:,2]) <= 0.35)] = "turret-side"
    # Ágyúpajzs: a torony ELEJÉN, a cső tengelye körül, a cső magasságában.
    gunY = C[is_gun][:,1].mean() if is_gun.any() else roofY + 300
    mant = (t & (C[:,2] > gunZ - span[2]*0.10)
              & (np.abs(C[:,0]-cx) < halfW*0.36)
              & (np.abs(C[:,1]-gunY) < span[1]*0.16))
    z[mant] = "mantlet"

    # --- test ---
    h = is_hull
    z[h & (N[:,1] >  0.65)] = "hull-roof"
    z[h & (N[:,2] < -0.45)] = "hull-rear"
    front = h & (N[:,2] > 0.35)
    z[front & (C[:,1] >= midY)] = "ufp"
    z[front & (C[:,1] <  midY)] = "lfp"
    # lánctalp: alacsonyan és kívül
    z[h & (C[:,1] < trackY) & (np.abs(C[:,0]-cx) > halfW*0.72)] = "track"
    return z, dict(gunZ=gunZ, roofY=roofY, trackY=trackY, midY=midY)

def render(m, zones, yaw, pitch, W=460, H=330):
    V = m.vertices - m.vertices.mean(0)
    cy,sy = np.cos(np.radians(yaw)), np.sin(np.radians(yaw))
    cp,sp = np.cos(np.radians(pitch)), np.sin(np.radians(pitch))
    x =  V[:,0]*cy + V[:,2]*sy
    z1= -V[:,0]*sy + V[:,2]*cy
    y =  V[:,1]*cp - z1*sp
    zz=  V[:,1]*sp + z1*cp
    s = min(W,H)/ (np.max(V.max(0)-V.min(0))) * 0.85
    px = W/2 + x*s; py = H/2 - y*s
    depth = zz[m.faces].mean(1)
    order = np.argsort(depth)
    img = Image.new("RGB",(W,H),(28,34,22)); d = ImageDraw.Draw(img)
    for i in order:
        f = m.faces[i]
        d.polygon([(px[j],py[j]) for j in f], fill=ZONES[zones[i]][0])
    return img

if __name__ == "__main__":
    sc = trimesh.load("is3.glb"); m = sc.to_mesh(); m.merge_vertices()
    zones, info = classify(m)
    print("határok:", {k: round(v) for k,v in info.items()})
    import collections
    for k,v in collections.Counter(zones).most_common():
        print(f"  {k:<14} {v:>7} háromszög")
    views = [(0,12),(35,18),(90,10),(180,12),(35,60)]
    ims = [render(m, zones, a, b) for a,b in views]
    sheet = Image.new("RGB",(sum(i.width for i in ims), ims[0].height))
    x=0
    for i in ims: sheet.paste(i,(x,0)); x+=i.width
    sheet.save("classify.png"); print("classify.png", sheet.size)
