"""GLB -> tömör bináris páncélmodell a böngészőnek."""
import trimesh, numpy as np, json, struct, sys

ZONES = ["gun","track","ufp","lfp","hull-side","hull-roof","hull-rear",
         "turret-front","mantlet","turret-side","turret-rear","turret-roof"]
ZI = {z:i for i,z in enumerate(ZONES)}

def outward(m):
    """A háló kevert körüljárású; a normálokat a középponttól kifelé forgatjuk."""
    N = m.face_normals.copy()
    d = np.einsum('ij,ij->i', N, m.triangles_center - m.vertices.mean(0))
    N[d < 0] *= -1
    return N

def classify(m, cfg):
    V, F = m.vertices, m.faces
    lo, hi = V.min(0), V.max(0); span = hi-lo
    C = m.triangles_center; N = outward(m)
    cx = (lo[0]+hi[0])/2
    gunZ  = lo[2] + span[2]*cfg["gunZ"]
    roofY = lo[1] + span[1]*cfg["roofY"]
    trkY  = lo[1] + span[1]*cfg["trackY"]
    midY  = lo[1] + span[1]*cfg["midY"]
    halfW = span[0]/2

    z = np.full(len(F), ZI["hull-side"], np.uint8)
    gun = C[:,2] > gunZ
    tur = (~gun) & (C[:,1] > roofY)
    trk = (~gun) & (~tur) & (C[:,1] < trkY) & (np.abs(C[:,0]-cx) > halfW*cfg["trackX"])
    hull= ~(gun|tur|trk)

    z[gun] = ZI["gun"]; z[trk] = ZI["track"]

    z[tur & (N[:,1] >  0.80)] = ZI["turret-roof"]
    t2 = tur & (N[:,1] <= 0.80)
    z[t2 & (N[:,2] >  0.30)] = ZI["turret-front"]
    z[t2 & (N[:,2] < -0.30)] = ZI["turret-rear"]
    z[t2 & (np.abs(N[:,2]) <= 0.30)] = ZI["turret-side"]
    gunY = C[gun][:,1].mean() if gun.any() else roofY+300
    z[tur & (C[:,2] > gunZ - span[2]*cfg["mantletZ"])
         & (np.abs(C[:,0]-cx) < halfW*cfg["mantletX"])
         & (np.abs(C[:,1]-gunY) < span[1]*0.18)] = ZI["mantlet"]

    z[hull & (N[:,1] >  0.70)] = ZI["hull-roof"]
    z[hull & (N[:,2] < -0.40)] = ZI["hull-rear"]
    fr = hull & (N[:,2] > 0.30)
    z[fr & (C[:,1] >= midY)] = ZI["ufp"]
    z[fr & (C[:,1] <  midY)] = ZI["lfp"]
    return z, N

def build(glb, cfg, target, out):
    sc = trimesh.load(glb)
    m = sc.to_mesh(); m.merge_vertices()
    print(f"  betöltve: {len(m.faces)} háromszög")
    if len(m.faces) > target:
        m = m.simplify_quadric_decimation(face_count=target)
        m.merge_vertices()
        print(f"  egyszerűsítve: {len(m.faces)} háromszög, {len(m.vertices)} csúcs")

    zone, N = classify(m, cfg)

    # Lapos árnyalás: minden háromszögnek saját csúcsai (nem osztozunk),
    # így a lapok éle éles marad és a zónahatár nem mosódik el.
    V = m.vertices[m.faces].reshape(-1,3).astype(np.float32)
    NN = np.repeat(N, 3, axis=0).astype(np.float32)
    ZZ = np.repeat(zone, 3).astype(np.uint8)

    ctr = (V.min(0)+V.max(0))/2
    V -= ctr
    scale = float(np.abs(V).max())
    Vq = np.clip(np.round(V/scale*32767), -32767, 32767).astype(np.int16)
    Nq = np.clip(np.round(NN*127), -127, 127).astype(np.int8)

    with open(out+".bin","wb") as f:
        f.write(Vq.tobytes()); f.write(Nq.tobytes()); f.write(ZZ.tobytes())
    meta = {"vertexCount": int(len(V)), "scale": scale,
            "sizeMeters": [float(x) for x in (m.vertices.max(0)-m.vertices.min(0))/1000.0],
            "zones": ZONES}
    json.dump(meta, open(out+".json","w"), indent=1)
    import os
    print(f"  kiírva: {os.path.getsize(out+'.bin')//1024} KB, {len(V)} csúcs")
    import collections
    cnt = collections.Counter(zone)
    for i,zn in enumerate(ZONES):
        if cnt.get(i): print(f"    {zn:<13} {cnt[i]:>6}")
    return m, zone

if __name__ == "__main__":
    cfg = dict(gunZ=0.655, roofY=0.612, trackY=0.318, midY=0.43,
               trackX=0.70, mantletZ=0.10, mantletX=0.36)
    build("is3.glb", cfg, 30000, "model_is-3")
