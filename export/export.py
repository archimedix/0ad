#!/usr/bin/env python3
"""Esporta un edificio di 0 A.D. in un solo .dae con texture, pronto per OpenSim/Firestorm.

Uso:  python3 export.py <actor> [<cartella>]
      es. python3 export.py structures/ptolemies/lighthouse.xml faro

Nome standard dal template di gioco che usa l'actor: 0ad_<Civiltà>_<NomeGenerico>
(es. 0ad_Ptolemies_Lighthouse), scritto nel .dae come <asset><title>; il nome proprio
(es. Pharos) va in <subject>. Senza <cartella>, la cartella prende il nome standard.

- Legge l'actor dall'app installata (public.zip) per sapere quali mesh e texture servono.
- Scarica i sorgenti (.dae, .png) dal Gitea di Wildfire Games (percorso media/, cioè Git LFS).
- Unisce mesh principale + prop: quelli su "root" nelle stesse coordinate, quelli su un altro punto
  di aggancio nella posizione del nodo prop-<punto> della mesh madre. Salta decal, particelle,
  alberi, unità (guarnigione, proiettili).
- Texture: tiene l'alfa solo per i materiali basic_trans (trasparenza vera); negli altri l'alfa è
  la maschera del colore giocatore e va tolta, se no in OpenSim l'oggetto esce trasparente.
- Nomi img_/fx_/mat_ sempre distinti: con nomi uguali Firestorm può assegnare la texture sbagliata.

Uscita: <nome>/<nome>.dae, <nome>/texture/*.png, <nome>/src/ (originali). Grafica CC BY-SA 3.0.
"""
import re, sys, math, zipfile, urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path
from PIL import Image

ZIP = "/Applications/0 A.D..app/Contents/Resources/data/mods/public/public.zip"
GITEA = "https://gitea.wildfiregames.com/0ad/0ad/media/tag/v0.28.0/binaries/data/mods/public/art"
SKIP = ("decals/", "particle/", "flora/", "special/common", "special/eyecandy/rally", "props/units/", "units/")
NS = "http://www.collada.org/2005/11/COLLADASchema"
ET.register_namespace("", NS)
q = lambda t: f"{{{NS}}}{t}"

actor_path = sys.argv[1]
zf = zipfile.ZipFile(ZIP)


def identity(template):
    """GenericName/SpecificName/Civ di un template, risalendo i genitori."""
    s = zf.read(f"simulation/templates/{template}.xml").decode()
    d = dict(re.findall(r"<(GenericName|SpecificName|Civ)>([^<]*)<", s))
    par = re.search(r'<Entity parent="([^"]+)"', s)
    for p in (par.group(1).split("|")[::-1] if par else []):
        for k, v in identity(p).items():
            d.setdefault(k, v)
    return d


def standard_name(actor):
    """0ad_<Civiltà>_<NomeGenerico> dal template che usa questo actor, es. 0ad_Ptolemies_CivicCenter.
    Ritorna (nome, nome specifico) o (None, None) se nessun template lo usa."""
    for n in zf.namelist():
        if n.startswith("simulation/templates/structures/") and n.endswith(".xml"):
            if f"<Actor>{actor}</Actor>" in zf.read(n).decode(errors="replace"):
                d = identity(n[len("simulation/templates/"):-4])
                civ = identity(f"special/players/{d['Civ']}").get("GenericName", d["Civ"])
                camel = lambda t: "".join(w[:1].upper() + w[1:] for w in re.split(r"[^A-Za-z0-9]+", t) if w)
                return f"0ad_{camel(civ)}_{camel(d.get('GenericName', Path(n).stem))}", d.get("SpecificName")
    return None, None


title, specific = standard_name(actor_path)
name = sys.argv[2] if len(sys.argv) > 2 else title
if not name:
    sys.exit(f"nessun template usa {actor_path}: indica il nome della cartella")
print(f"nome: {title or name}" + (f" ({specific})" if specific else ""))
OUT = Path(__file__).parent / name
SRC, TEX = OUT / "src", OUT / "texture"
SRC.mkdir(parents=True, exist_ok=True); TEX.mkdir(exist_ok=True)


def first_variant(group):
    vs = group.findall("variant")
    return max(vs, key=lambda v: float(v.get("frequency", "1"))) if vs else None


def fetch(url, dest):
    if not dest.exists():
        urllib.request.urlretrieve(url, dest)
    return dest


# --- matrici 4x4 (liste di righe) per comporre le posizioni dei prop ---
I4 = [[float(i == j) for j in range(4)] for i in range(4)]
mul = lambda a, b: [[sum(a[i][k] * b[k][j] for k in range(4)) for j in range(4)] for i in range(4)]


def node_matrix(n):
    """Trasformazione locale di un <node> COLLADA (matrix/translate/rotate/scale, in ordine)."""
    m = I4
    for t in n:
        v = [float(x) for x in (t.text or "").split()]
        if t.tag == q("matrix"):
            m = mul(m, [v[0:4], v[4:8], v[8:12], v[12:16]])
        elif t.tag == q("translate"):
            m = mul(m, [[1, 0, 0, v[0]], [0, 1, 0, v[1]], [0, 0, 1, v[2]], [0, 0, 0, 1]])
        elif t.tag == q("scale"):
            m = mul(m, [[v[0], 0, 0, 0], [0, v[1], 0, 0], [0, 0, v[2], 0], [0, 0, 0, 1]])
        elif t.tag == q("rotate"):
            x, y, z, a = v[0], v[1], v[2], math.radians(v[3])
            c, s_, C = math.cos(a), math.sin(a), 1 - math.cos(a)
            m = mul(m, [[c + x*x*C, x*y*C - z*s_, x*z*C + y*s_, 0],
                        [y*x*C + z*s_, c + y*y*C, y*z*C - x*s_, 0],
                        [z*x*C - y*s_, z*y*C + x*s_, c + z*z*C, 0], [0, 0, 0, 1]])
    return m


def world_nodes(dae):
    """{nome nodo: matrice mondo} di tutti i nodi della scena."""
    out = {}
    def walk(n, parent):
        for c in n.findall(q("node")):
            w = mul(parent, node_matrix(c))
            out[c.get("name") or c.get("id")] = (w, c)
            walk(c, w)
    for vs in ET.parse(dae).getroot().iter(q("visual_scene")):
        walk(vs, I4)
    return out


def prefix_ids(geo, pfx):
    """Id interni (sorgenti, vertici) unici nel file unito: mesh diverse di 0 A.D. riusano gli
    stessi nomi (es. Cube_003-mesh-positions) e un COLLADA con id doppi non è valido."""
    for e in geo.iter():
        if e is not geo and e.get("id"):
            e.set("id", f"{pfx}_{e.get('id')}")
        for at in ("source", "url"):
            if (e.get(at) or "").startswith("#"):
                e.set(at, f"#{pfx}_{e.get(at)[1:]}")


def mesh_dae(mesh):
    return fetch(f"{GITEA}/meshes/{mesh}", SRC / Path(mesh).name)


def parts_of(actor, M=I4, seen=()):
    """[(mesh, baseTex, keep_alpha, matrice)] dell'actor e dei suoi prop, ricorsivo.
    I prop su "root" stanno nelle coordinate del padre; quelli su un altro punto prendono la
    posizione del nodo prop-<punto> della mesh del padre."""
    root = ET.fromstring(zf.read(f"art/actors/{actor}"))
    mat = (root.findtext("material") or "").strip()
    mesh = tex = None
    props = []
    for i, g in enumerate(root.findall("group")):
        v = first_variant(g)
        if v is None:
            continue
        mesh = v.findtext("mesh") or mesh
        for t in v.iter("texture"):
            if t.get("name") == "baseTex":
                tex = t.get("file")
        if i == 0:  # gli altri gruppi sono guarnigione/distruzione
            props += [p for p in v.iter("prop")]
    out, nodes = [], {}
    if mesh:
        nodes = world_nodes(mesh_dae(mesh.strip()))
        if tex:
            out.append((mesh.strip(), tex, mat.startswith("basic_trans"), M))
    for p in props:
        a, ap = p.get("actor", ""), p.get("attachpoint", "root")
        if not a or any(s in a for s in SKIP) or a in seen:
            print(f"  salto: {a or '(vuoto)'} su {ap}")
            continue
        if ap == "root":
            out += parts_of(a, M, seen + (actor,))
        elif f"prop-{ap}" in nodes or f"prop_{ap}" in nodes:
            pm = (nodes.get(f"prop-{ap}") or nodes.get(f"prop_{ap}"))[0]
            print(f"  aggancio {ap}: {a}")
            out += parts_of(a, mul(M, pm), seen + (actor,))
        else:
            print(f"  salto (punto {ap} non trovato): {a}")
    return out


parts = parts_of(actor_path)
print(f"{len(parts)} parti:", *[p[0] for p in parts], sep="\n  ")

root = ET.Element(q("COLLADA"), version="1.4.1")
asset = ET.SubElement(root, q("asset"))
tool = ET.SubElement(ET.SubElement(asset, q("contributor")), q("authoring_tool"))
tool.text = f"0 A.D. art (Wildfire Games, CC BY-SA 3.0): {actor_path} - export.py"
if specific:
    ET.SubElement(asset, q("subject")).text = specific  # nome proprio, va nella descrizione
ET.SubElement(asset, q("title")).text = title or name      # nome dell'oggetto in OpenSim
ET.SubElement(asset, q("unit"), name="meter", meter="1")
ET.SubElement(asset, q("up_axis")).text = "Z_UP"
lib = {k: ET.SubElement(root, q(f"library_{k}")) for k in
       ("images", "effects", "materials", "geometries", "visual_scenes")}
vs = ET.SubElement(lib["visual_scenes"], q("visual_scene"), id="Scene", name="Scene")

done_tex, done_geo, tris = set(), {}, 0
for n, (mesh, tex, alpha, M) in enumerate(parts):
    key = Path(mesh).stem
    tname = Path(tex).stem
    dae = mesh_dae(mesh)
    if tname not in done_tex:
        png = fetch(f"{GITEA}/textures/skins/{tex}", SRC / f"{tname}.png")
        im = Image.open(png)
        (im.convert("RGBA") if alpha else im.convert("RGB")).save(TEX / f"{tname}.png", optimize=True)
        img = ET.SubElement(lib["images"], q("image"), id=f"img_{tname}", name=f"img_{tname}")
        ET.SubElement(img, q("init_from")).text = f"texture/{tname}.png"
        done_tex.add(tname)

    gkey = key if key not in done_geo else f"{key}_{n}"  # copia propria: OpenSim va in errore con mesh condivise
    if key not in done_geo:
        fx = ET.SubElement(lib["effects"], q("effect"), id=f"fx_{key}")
        prof = ET.SubElement(fx, q("profile_COMMON"))
        p = ET.SubElement(prof, q("newparam"), sid=f"surf_{key}")
        s = ET.SubElement(p, q("surface"), type="2D")
        ET.SubElement(s, q("init_from")).text = f"img_{tname}"
        p = ET.SubElement(prof, q("newparam"), sid=f"samp_{key}")
        ET.SubElement(ET.SubElement(p, q("sampler2D")), q("source")).text = f"surf_{key}"
        lam = ET.SubElement(ET.SubElement(prof, q("technique"), sid="common"), q("lambert"))
        ET.SubElement(ET.SubElement(lam, q("diffuse")), q("texture"), texture=f"samp_{key}", texcoord="UVMap")
        m = ET.SubElement(lib["materials"], q("material"), id=f"mat_{key}", name=f"mat_{key}")
        ET.SubElement(m, q("instance_effect"), url=f"#fx_{key}")

        src = ET.parse(dae).getroot()
        geo = src.find(f".//{q('library_geometries')}/{q('geometry')}")
        gid = geo.get("id")
        geo.set("id", f"geo_{key}"); geo.set("name", f"geo_{key}")
        gm = geo.find(q("mesh"))
        gtris = 0
        for prim in list(gm):
            if prim.tag in (q("polylist"), q("triangles"), q("polygons")):
                prim.set("material", "MAT")
                for inp in prim.findall(q("input")):
                    if inp.get("semantic") == "TEXCOORD" and inp.get("set", "0") != "0":
                        sid = inp.get("source")[1:]
                        prim.remove(inp)
                        for so in gm.findall(q("source")):
                            if so.get("id") == sid:
                                gm.remove(so)
                vc = prim.find(q("vcount"))
                cnt = int(prim.get("count"))
                gtris += sum(int(x) - 2 for x in vc.text.split()) if vc is not None else cnt
        prefix_ids(geo, key)
        geo.set("id", f"geo_{key}")
        lib["geometries"].append(geo)
        # posizione della geometria dentro il suo file (nodo che la istanzia)
        gw = next((w for w, nd in world_nodes(dae).values()
                   if any(ig.get("url") == f"#{gid}" for ig in nd.findall(q("instance_geometry")))), I4)
        done_geo[key] = (gtris, gw, geo)
    gtris, gw, geo0 = done_geo[key]
    tris += gtris
    if gkey != key:
        import copy
        g2 = copy.deepcopy(geo0)
        prefix_ids(g2, gkey)
        g2.set("id", f"geo_{gkey}"); g2.set("name", f"geo_{gkey}")
        lib["geometries"].append(g2)

    node = ET.SubElement(vs, q("node"), id=f"n{n}_{key}", name=key, type="NODE")
    W = mul(M, gw)
    ET.SubElement(node, q("matrix")).text = " ".join(f"{x:.6g}" for row in W for x in row)
    ig = ET.SubElement(node, q("instance_geometry"), url=f"#geo_{gkey}", name=gkey)
    tc = ET.SubElement(ET.SubElement(ig, q("bind_material")), q("technique_common"))
    im_ = ET.SubElement(tc, q("instance_material"), symbol="MAT", target=f"#mat_{key}")
    ET.SubElement(im_, q("bind_vertex_input"), semantic="UVMap", input_semantic="TEXCOORD", input_set="0")

ET.SubElement(ET.SubElement(root, q("scene")), q("instance_visual_scene"), url="#Scene")
ET.indent(root)
ET.ElementTree(root).write(OUT / f"{name}.dae", xml_declaration=True, encoding="utf-8")
print(f"{OUT / (name + '.dae')}: {len(parts)} parti, ~{tris} triangoli (limite per faccia in Firestorm: 21844)")
