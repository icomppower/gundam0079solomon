"""
Solomon v2 — headless Blender asset build.

Run:  python3 tools/blender/build_assets.py
Needs the `bpy` module (pip install bpy) or run inside Blender:
      blender -b -P tools/blender/build_assets.py

Outputs (assets/):
  fortress.glb          Solomon asteroid fortress (rock + structures), AO baked into vertex colour
  fortress_lights.json  surface beacon positions/normals (rendered as glow points at runtime)
  bridge.glb            bridge interior of our fictional cruiser, AO baked
  ships.glb             original hulls: eff_cruiser (destroyer), eff_battleship, zeon_cruiser, zeon_armor,
                        and original mobile suits eff_ms, zeon_ms
  hero.glb / hero.json  蒼鷺號 Grey Heron, our MS carrier-destroyer, detailed for the chase view (+ gun tips, engines, catapults)

Everything is generated from a fixed seed, so the build is deterministic.
Every hull and mobile suit here is an original design; no canon mecha or ship is modelled.
"""
import bpy, bmesh, json, math, os, random, sys
from mathutils import Vector, Matrix, noise

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
OUT = os.path.join(ROOT, "assets")
os.makedirs(OUT, exist_ok=True)
SAMPLES = int(os.environ.get("AO_SAMPLES", "128"))


# ----------------------------------------------------------------- helpers --
def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.engine = "CYCLES"
    sc.cycles.device = "CPU"
    sc.cycles.samples = SAMPLES
    sc.render.bake.target = "VERTEX_COLORS"
    # world with flat white so AO-only bake is clean
    w = bpy.data.worlds.new("w"); sc.world = w


def obj_from_bm(bm, name, coll=None):
    for f in bm.faces:
        f.smooth = True  # indexed export; faceting is done at runtime (flatShading)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new(name, me)
    (coll or bpy.context.scene.collection).objects.link(ob)
    return ob


def box_object(name, parts, color, cuts=1):
    """parts: list of (center, size, rot_euler_tuple or None, taper or None). One mesh, one colour."""
    bm = bmesh.new()
    for (c, s, r, t) in parts:
        tmp = bmesh.new()
        bmesh.ops.create_cube(tmp, size=1.0)
        if cuts:
            bmesh.ops.subdivide_edges(tmp, edges=tmp.edges[:], cuts=cuts, use_grid_fill=True)
        for v in tmp.verts:
            x, y, z = v.co
            if t:  # taper toward +z (nose): scale x,y by lerp(1, t, z+0.5)
                k = 1 + (t[0] - 1) * max(0.0, z + 0.5) ** t[1]
                x *= k; y *= k
            v.co = Vector((x * s[0], y * s[1], z * s[2]))
            if r:
                v.co = Matrix.Rotation(r[2], 4, "Z") @ Matrix.Rotation(r[1], 4, "Y") @ Matrix.Rotation(r[0], 4, "X") @ v.co
            v.co += Vector(c)
        me = bpy.data.meshes.new("tmp"); tmp.to_mesh(me); tmp.free()
        bm.from_mesh(me); bpy.data.meshes.remove(me)
    ob = obj_from_bm(bm, name)
    set_albedo(ob, lambda co, n: color)
    return ob


def cyl_object(name, parts, color, segs=16):
    """parts: list of (center, radius, depth, axis 'x'|'y'|'z', radius2 or None)"""
    bm = bmesh.new()
    for (c, r, d, ax, r2) in parts:
        tmp = bmesh.new()
        bmesh.ops.create_cone(tmp, cap_ends=True, segments=segs, radius1=r, radius2=r2 if r2 is not None else r, depth=d)
        bmesh.ops.subdivide_edges(tmp, edges=[e for e in tmp.edges if abs(e.verts[0].co.z - e.verts[1].co.z) > 1e-6], cuts=2)
        rot = {"x": Matrix.Rotation(math.pi / 2, 4, "Y"), "y": Matrix.Rotation(-math.pi / 2, 4, "X"), "z": Matrix.Identity(4)}[ax]
        for v in tmp.verts:
            v.co = rot @ v.co + Vector(c)
        me = bpy.data.meshes.new("tmp"); tmp.to_mesh(me); tmp.free()
        bm.from_mesh(me); bpy.data.meshes.remove(me)
    ob = obj_from_bm(bm, name)
    set_albedo(ob, lambda co, n: color)
    return ob


def set_albedo(ob, fn):
    """Store per-vertex albedo in attribute 'alb' (point domain) via fn(co, normal)->(r,g,b)."""
    me = ob.data
    if "alb" in me.attributes:
        me.attributes.remove(me.attributes["alb"])
    a = me.attributes.new("alb", "FLOAT_COLOR", "POINT")
    for i, v in enumerate(me.vertices):
        r, g, b = fn(v.co, v.normal)
        a.data[i].color = (r, g, b, 1.0)


def bake_ao_into_col(objs, distance):
    """Cycles AO bake per object into vertex colour, then Col = albedo * ao."""
    sc = bpy.context.scene
    sc.world.light_settings.distance = distance
    for ob in objs:
        me = ob.data
        if "ao" in me.attributes:
            me.attributes.remove(me.attributes["ao"])
        ao = me.attributes.new("ao", "FLOAT_COLOR", "POINT")
        me.color_attributes.active_color = ao
        if not me.materials:
            mat = bpy.data.materials.new(ob.name + "_m"); mat.use_nodes = True
            me.materials.append(mat)
        bpy.ops.object.select_all(action="DESELECT")
        ob.select_set(True); bpy.context.view_layer.objects.active = ob
        bpy.ops.object.bake(type="AO", target="VERTEX_COLORS")
        alb = me.attributes["alb"]
        col = me.attributes.new("Col", "FLOAT_COLOR", "POINT")
        for i in range(len(me.vertices)):
            a = alb.data[i].color; o = ao.data[i].color[0]
            o = 0.4 + 0.6 * o  # never fully black
            col.data[i].color = (a[0] * o, a[1] * o, a[2] * o, 1.0)
        me.attributes.remove(me.attributes["ao"])
        me.attributes.remove(me.attributes["alb"])
        me.color_attributes.active_color = me.color_attributes["Col"]
        me.color_attributes.render_color_index = me.color_attributes.active_color_index
        me.materials.clear()
        print(f"  baked {ob.name}: {len(me.vertices)} verts", flush=True)


def export_glb(path, objs):
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs:
        o.select_set(True)
    kw = dict(filepath=path, export_format="GLB", use_selection=True, export_apply=True,
              export_normals=True, export_materials="NONE", export_yup=True)
    for key, val in (("export_vertex_color", "ACTIVE"), ("export_colors", True)):
        try:
            bpy.ops.export_scene.gltf(**kw, **{key: val}); break
        except TypeError:
            continue
    print(f"  wrote {os.path.relpath(path, ROOT)} ({os.path.getsize(path)//1024} KB)", flush=True)


def smoothstep(a, b, x):
    t = max(0.0, min(1.0, (x - a) / (b - a))); return t * t * (3 - 2 * t)


def fib_dirs(n, rng, jitter=0.25):
    out = []
    for i in range(n):
        y = 1 - 2 * (i + 0.5) / n; r = math.sqrt(1 - y * y); t = i * math.pi * (3 - math.sqrt(5))
        d = Vector((math.cos(t) * r, y, math.sin(t) * r))
        d += Vector((rng.uniform(-1, 1), rng.uniform(-1, 1), rng.uniform(-1, 1))) * jitter
        out.append(d.normalized())
    return out


# ================================================================ FORTRESS ==
R = 1000.0  # metres
rng = random.Random(79)
HORNS = [(d, rng.uniform(0.45, 0.85), rng.uniform(0.34, 0.50)) for d in fib_dirs(11, rng, 0.30)]  # (dir, height, base half-angle rad)
CRATERS = [(d, rng.uniform(0.05, 0.16), rng.uniform(0.03, 0.08)) for d in fib_dirs(46, rng, 0.9)]


def radius(d):
    """Solomon surface radius along unit dir d (Blender coords, Z up)."""
    p = d * 1.7
    n = noise.fractal(p, 0.9, 2.1, 4) * 0.10
    n += noise.fractal(p * 4.3 + Vector((7, 1, 3)), 0.8, 2.0, 2) * 0.012
    r = 1.0 + n
    # squash a little — Solomon is broader than it is tall
    r *= 1.0 - 0.10 * abs(d.z)
    for (h, hgt, aw) in HORNS:
        ang = math.acos(max(-1.0, min(1.0, d.dot(h))))
        if ang < aw:
            x = ang / aw                       # 0 at tip axis, 1 at base
            cone = (1 - x) ** 1.35             # pointed cone, slightly concave flanks
            cone = min(cone, 0.92)             # blunt the very tip
            r += hgt * cone * (0.9 + 0.25 * noise.fractal(p * 3 + h * 5, 1.0, 2.0, 3))
    for (c, a, dep) in CRATERS:
        ang = math.acos(max(-1.0, min(1.0, d.dot(c))))
        x = ang / a
        if x < 1.35:
            if x < 1.0:
                r -= dep * (1 - x * x)
            else:
                r += dep * 0.35 * math.sin((x - 1.0) / 0.35 * math.pi)
    return r * R


def crater_shade(d):
    s = 0.0
    for (c, a, dep) in CRATERS:
        ang = math.acos(max(-1.0, min(1.0, d.dot(c))))
        if ang < a:
            s = max(s, 1 - ang / a)
    return s


def build_fortress():
    print("fortress", flush=True)
    reset()
    bm = bmesh.new()
    bmesh.ops.create_icosphere(bm, subdivisions=7, radius=1.0)
    for v in bm.verts:
        d = v.co.normalized(); v.co = d * radius(d)
    bm.normal_update()
    rock = obj_from_bm(bm, "rock")

    def rock_col(co, n):
        d = co.normalized()
        t = noise.fractal(d * 6.0, 1.0, 2.0, 4) * 0.5 + 0.5
        base = Vector((0.22, 0.205, 0.19)).lerp(Vector((0.34, 0.31, 0.27)), t)
        horn = max(0.0, (co.length / R) - 1.1)
        base = base.lerp(Vector((0.38, 0.36, 0.33)), min(1.0, horn * 2))
        base *= 1.0 - 0.35 * crater_shade(d)
        return tuple(base)
    set_albedo(rock, rock_col)

    # surface structures: gun emplacements, bay blocks, masts — oriented to the surface
    srng = random.Random(1979)
    parts_gun, parts_bay, parts_mast = [], [], []
    lights = []

    def frame_at(d):
        z = d.normalized(); x = z.cross(Vector((0, 0, 1)))
        if x.length < 1e-3: x = z.cross(Vector((1, 0, 0)))
        x.normalize(); y = z.cross(x)
        return x, y, z

    def place(parts, d, size, lift, yaw):
        x, y, z = frame_at(d)
        r = radius(d.normalized())
        c = z * (r + lift)
        parts.append((c, x, y, z, size, yaw))
        return c, z

    for d in fib_dirs(150, srng, 0.6):
        if crater_shade(d) > 0.2: continue
        s = srng.uniform(16, 36)
        c, z = place(parts_gun, d, (s, s, s * 0.7), s * 0.2, srng.uniform(0, 6.28))
        if srng.random() < 0.55: lights.append((c + z * s * 0.6, z))
    # equatorial docking belt: big blocks around the waist
    for i in range(18):
        a = i / 18 * math.tau + srng.uniform(-0.05, 0.05)
        d = Vector((math.cos(a), math.sin(a), srng.uniform(-0.08, 0.08))).normalized()
        c, z = place(parts_bay, d, (srng.uniform(90, 150), srng.uniform(40, 70), 55), -10, 0)
        for k in (-1, 1):
            lights.append((c + z * 30 + Vector((-math.sin(a), math.cos(a), 0)) * k * 50, z))
    for d in fib_dirs(14, srng, 0.8):
        h = srng.uniform(90, 170)
        c, z = place(parts_mast, d, (6, 6, h), h * 0.45, 0)
        lights.append((c + z * h * 0.5, z))

    def mesh_from(name, parts, col):
        bm2 = bmesh.new()
        for (c, x, y, z, size, yaw) in parts:
            tmp = bmesh.new(); bmesh.ops.create_cube(tmp, size=1.0)
            bmesh.ops.subdivide_edges(tmp, edges=tmp.edges[:], cuts=1, use_grid_fill=True)
            rot = Matrix((x, y, z)).transposed() @ Matrix.Rotation(yaw, 3, "Z")
            for v in tmp.verts:
                v.co = rot @ Vector((v.co.x * size[0], v.co.y * size[1], v.co.z * size[2])) + c
            me = bpy.data.meshes.new("t"); tmp.to_mesh(me); tmp.free(); bm2.from_mesh(me); bpy.data.meshes.remove(me)
        ob = obj_from_bm(bm2, name)
        set_albedo(ob, lambda co, n: col)
        return ob

    guns = mesh_from("guns", parts_gun, (0.30, 0.29, 0.27))
    bays = mesh_from("bays", parts_bay, (0.20, 0.20, 0.20))
    masts = mesh_from("masts", parts_mast, (0.34, 0.33, 0.31))
    objs = [rock, guns, bays, masts]
    bake_ao_into_col(objs, distance=260.0)
    export_glb(os.path.join(OUT, "fortress.glb"), objs)
    # beacon lights: convert Blender Z-up -> glTF Y-up (x, z, -y)
    js = [[round(p.x, 1), round(p.z, 1), round(-p.y, 1), round(n.x, 3), round(n.z, 3), round(-n.y, 3)] for (p, n) in lights]
    with open(os.path.join(OUT, "fortress_lights.json"), "w") as f:
        json.dump({"R": R, "lights": js}, f, separators=(",", ":"))
    print(f"  {len(js)} beacons", flush=True)


# ================================================================== BRIDGE ==
# Blender Z-up, metres, forward = -Y. glTF export maps (x,y,z)->(x,z,-y), so the window faces glTF +Z;
# the runtime rotates the bridge 180° about Y. Viewer stands on the rear platform at Blender (0, 1.75, 2.07).
def build_bridge():
    print("bridge", flush=True)
    reset()
    WR = 4.3          # window radius from centre (0,0)
    A0 = math.radians(78)  # window half-angle
    SILL, TOP, CEIL = 0.9, 3.7, 4.1
    SEG = 52

    def arc_wall(name, r_in, r_out, z0, z1, a0, a1, segs, col, zrows=3):
        bm = bmesh.new()
        rows = []
        for i in range(segs + 1):
            a = a0 + (a1 - a0) * i / segs
            dx, dy = math.sin(a), -math.cos(a)
            ring = []
            for (r, z) in [(r_in, z0)] + [(r_in, z0 + (z1 - z0) * k / zrows) for k in range(1, zrows)] + [(r_in, z1), (r_out, z1)] + \
                    [(r_out, z1 - (z1 - z0) * k / zrows) for k in range(1, zrows)] + [(r_out, z0)]:
                ring.append(bm.verts.new((dx * r, dy * r, z)))
            rows.append(ring)
        for i in range(segs):
            a, b = rows[i], rows[i + 1]
            for k in range(len(a) - 1):
                bm.faces.new((a[k], b[k], b[k + 1], a[k + 1]))
            bm.faces.new((a[-1], b[-1], b[0], a[0]))
        for ring in (rows[0], rows[-1]):
            bm.faces.new(ring if ring is rows[0] else list(reversed(ring)))
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
        ob = obj_from_bm(bm, name); set_albedo(ob, lambda co, n: col); return ob

    def disc(name, r, z, col, rings=8, segs=48, flip=False, zfn=None):
        bm = bmesh.new()
        c = bm.verts.new((0, 0, z))
        prev = None
        rows = []
        for k in range(1, rings + 1):
            rr = r * k / rings
            row = [bm.verts.new((math.cos(t) * rr, math.sin(t) * rr, zfn(math.cos(t) * rr, math.sin(t) * rr) if zfn else z))
                   for t in [i / segs * math.tau for i in range(segs)]]
            rows.append(row)
        for i in range(segs):
            j = (i + 1) % segs
            f = (c, rows[0][i], rows[0][j]) if not flip else (c, rows[0][j], rows[0][i])
            bm.faces.new(f)
            for k in range(rings - 1):
                q = (rows[k][i], rows[k + 1][i], rows[k + 1][j], rows[k][j])
                bm.faces.new(q if not flip else tuple(reversed(q)))
        ob = obj_from_bm(bm, name); set_albedo(ob, lambda co, n: col); return ob

    WALL = (0.50, 0.49, 0.47); DARK = (0.17, 0.18, 0.20); CONS = (0.24, 0.26, 0.29)
    objs = []
    # floor: forward pit at z=0, rear command platform at z=0.45 (y>0.6)
    objs.append(disc("floor", WR + 0.1, 0.0, DARK, zfn=lambda x, y: 0.45 if y > 0.35 else 0.0))
    objs.append(disc("ceiling", WR + 0.1, CEIL, (0.40, 0.40, 0.39), flip=True))
    # console sill along the window
    objs.append(arc_wall("sill", WR - 0.75, WR + 0.05, 0.0, SILL, -A0, A0, SEG, CONS))
    # header band above the window
    objs.append(arc_wall("header", WR - 0.05, WR + 0.25, TOP, CEIL, -A0, A0, SEG, WALL, zrows=2))
    # solid walls round the back
    objs.append(arc_wall("walls", WR - 0.05, WR + 0.25, 0.0, CEIL, A0, math.tau - A0, 60, WALL))
    # window mullions + bottom frame
    mull = []
    n = 9   # odd pane count: no mullion dead-centre in the view
    for i in range(n + 1):
        a = -A0 + 2 * A0 * i / n
        mull.append(((math.sin(a) * WR, -math.cos(a) * WR, (SILL + TOP) / 2), (0.11, 0.16, TOP - SILL), (0, 0, a), None))
    objs.append(box_object("mullions", mull, (0.33, 0.33, 0.34), cuts=2))
    # radial ceiling beams
    beams = []
    for a in [-0.9, -0.45, 0.0, 0.45, 0.9]:
        beams.append(((math.sin(a) * 2.3, -math.cos(a) * 2.3, CEIL - 0.12), (0.22, 4.0, 0.24), (0, 0, a), None))
    objs.append(box_object("beams", beams, (0.36, 0.36, 0.37), cuts=3))
    # platform step face + railing
    rail = [((0, 0.35, 0.22), (5.4, 0.08, 0.45), None, None),
            ((-1.6, 0.32, 1.0), (1.8, 0.06, 0.06), None, None), ((1.6, 0.32, 1.0), (1.8, 0.06, 0.06), None, None)]
    for x in (-2.45, -0.75, 0.75, 2.45):
        rail.append(((x, 0.32, 0.72), (0.06, 0.06, 0.6), None, None))
    objs.append(box_object("rail", rail, (0.30, 0.31, 0.33), cuts=2))
    # captain's chair (in front of the viewer, on the platform)
    chair = [((0, 0.95, 0.78), (0.62, 0.6, 0.12), None, None),       # seat
             ((0, 1.25, 1.25), (0.62, 0.12, 0.95), (0.18, 0, 0), None),  # back
             ((-0.38, 0.95, 0.95), (0.1, 0.55, 0.08), None, None), ((0.38, 0.95, 0.95), (0.1, 0.55, 0.08), None, None),
             ((0, 1.0, 0.55), (0.16, 0.16, 0.4), None, None)]
    objs.append(box_object("chair", chair, (0.32, 0.12, 0.11), cuts=2))
    # crew stations in the pit: seat + seated figure (backs to the viewer)
    crew_parts, seat_parts = [], []
    heads = []
    for a in (-0.72, -0.25, 0.25, 0.72):
        r = WR - 1.25
        cx, cy = math.sin(a) * r, -math.cos(a) * r
        seat_parts.append(((cx, cy, 0.48), (0.5, 0.5, 0.1), (0, 0, a), None))
        seat_parts.append(((cx - math.sin(a) * -0.28, cy + math.cos(a) * 0.28, 0.85), (0.5, 0.1, 0.7), (0, 0, a), None))
        crew_parts.append(((cx, cy - 0.02, 0.92), (0.42, 0.3, 0.62), (0, 0, a), (0.78, 1.0)))  # torso, narrowing upward
        heads.append(Vector((cx + math.sin(a) * 0.04, cy - math.cos(a) * 0.04, 1.36)))
    objs.append(box_object("crew_seats", seat_parts, (0.22, 0.23, 0.26), cuts=2))
    objs.append(box_object("crew", crew_parts, (0.16, 0.20, 0.30), cuts=2))
    hb = bmesh.new()
    for c in heads:
        tmp = bmesh.new(); bmesh.ops.create_uvsphere(tmp, u_segments=12, v_segments=8, radius=0.12)
        for v in tmp.verts: v.co = Vector((v.co.x, v.co.y, v.co.z * 1.15)) + c
        me = bpy.data.meshes.new("t"); tmp.to_mesh(me); tmp.free(); hb.from_mesh(me); bpy.data.meshes.remove(me)
    hd = obj_from_bm(hb, "crew_heads"); set_albedo(hd, lambda co, n: (0.20, 0.18, 0.16)); objs.append(hd)
    bake_ao_into_col(objs, distance=1.6)

    # emissive screens: console tops facing the crew + header status strip (no AO, coloured in runtime)
    bm = bmesh.new()
    def quad(p0, p1, p2, p3):
        vs = [bm.verts.new(p) for p in (p0, p1, p2, p3)]; bm.faces.new(vs)
    for a in (-0.72, -0.25, 0.25, 0.72):
        for off in (-0.16, 0.16):
            aa = a + off * 0.5
            r0, r1 = WR - 0.62, WR - 0.2
            w = 0.21
            dx, dy = math.sin(aa), -math.cos(aa)
            px, py = math.cos(aa), math.sin(aa)
            quad((dx * r0 - px * w, dy * r0 - py * w, SILL + 0.01), (dx * r0 + px * w, dy * r0 + py * w, SILL + 0.01),
                 (dx * r1 + px * w, dy * r1 + py * w, SILL + 0.16), (dx * r1 - px * w, dy * r1 - py * w, SILL + 0.16))
    scr = obj_from_bm(bm, "screens")
    bm = bmesh.new()
    for i in range(SEG):
        a0 = -A0 + 2 * A0 * i / SEG; a1 = -A0 + 2 * A0 * (i + 1) / SEG
        r = WR - 0.07
        quad((math.sin(a0) * r, -math.cos(a0) * r, TOP + 0.05), (math.sin(a1) * r, -math.cos(a1) * r, TOP + 0.05),
             (math.sin(a1) * r, -math.cos(a1) * r, TOP + 0.13), (math.sin(a0) * r, -math.cos(a0) * r, TOP + 0.13))
    strip = obj_from_bm(bm, "status_strip")
    export_glb(os.path.join(OUT, "bridge.glb"), objs + [scr, strip])


# =================================================================== SHIPS ==
# All hulls are original designs. Blender: forward = -Y, up = +Z, metres.
# glTF export maps (x, y, z) -> (x, z, -y), so noses end up at glTF +Z (three.js lookAt convention).
ROT_FWD = (math.pi / 2, 0, 0)   # box helper: pre-rotation +z (taper end) -> -Y (nose)


def _hash3(c):
    v = math.sin(c[0] * 12.9898 + c[1] * 78.233 + c[2] * 37.719) * 43758.5453
    return v - math.floor(v)


def panel_fn(top, belly, accent=None, accent_band=None, cell=(7.0, 9.0, 5.0), belly_z=0.0):
    """Albedo: panel variation, darker belly, optional accent band (y0, y1) on the upper hull."""
    def fn(co, n):
        k = 0.86 + 0.2 * (_hash3((math.floor(co.x / cell[0]), math.floor(co.y / cell[1]), math.floor(co.z / cell[2]))) - 0.5)
        if accent and accent_band and accent_band[0] < co.y < accent_band[1] and co.z > belly_z:
            c = accent
        else:
            c = top if co.z > belly_z else belly
        return (c[0] * k, c[1] * k, c[2] * k)
    return fn


def join_objs(objs, name):
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs: o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.join()
    objs[0].name = name; objs[0].data.name = name
    return objs[0]


def hull_top(h, L, y, k_end, p, cy=0.0):
    """Height of the top of a tapered hull box at world y (for seating turrets)."""
    z = -(y - cy) / L
    k = 1 + (k_end - 1) * max(0.0, z + 0.5) ** p
    return h / 2 * k


def turret_parts(c, up, s, barrel_len, n_barrels=2):
    """Returns (cyl_parts, box_parts, tips) for a twin turret seated at c, facing forward (-Y)."""
    x, y, z = c
    cyl = [((x, y, z + up * 0.5 * s), 4.2 * s, 1.6 * s, "z", 3.8 * s)]
    box = [((x, y + 0.6 * s, z + up * 2.6 * s), (6.6 * s, 7.6 * s, 2.8 * s), None, None),
           ((x, y - 3.2 * s, z + up * 2.4 * s), (5.2 * s, 1.4 * s, 2.2 * s), None, None)]
    tips = []
    offs = [-1.4 * s, 1.4 * s] if n_barrels == 2 else [-2.2 * s, 0, 2.2 * s]
    for bx in offs:
        box.append(((x + bx, y - 3.6 * s - barrel_len / 2, z + up * 2.6 * s), (0.9 * s, barrel_len, 0.9 * s), None, None))
        tips.append((x + bx, y - 3.6 * s - barrel_len, z + up * 2.6 * s))
    return cyl, box, tips


def eff_warship(name, L, n_turrets, beam=1.0):
    """Federation warship (original): angular wedge hull, keel, tower, side engine pods, dorsal turrets."""
    s = L / 200.0
    w, h = 28 * s * beam, 20 * s
    TOP = (0.64, 0.65, 0.66); BEL = (0.34, 0.35, 0.37); RED = (0.58, 0.14, 0.12); BLUE = (0.16, 0.25, 0.48)
    KE, PE = 0.32, 1.7
    parts = [((0, 0, 0), (w, h, L), ROT_FWD, (KE, PE)),
             ((0, 0.12 * L, -h * 0.55), (w * 0.62, h * 0.55, L * 0.72), ROT_FWD, (0.28, 1.4)),
             ((0, 0.43 * L, h * 0.08), (w * 1.55, 0.2 * L, h * 1.35), None, None),
             ((0, 0.14 * L, h * 0.5 + 7 * s), (w * 0.46, 0.15 * L, 14 * s), None, (0.75, 1.0)),
             ((0, 0.10 * L, h * 0.5 + 15.5 * s), (w * 0.85, 0.065 * L, 5 * s), None, None),
             ((0, 0.13 * L, h * 0.5 + 23 * s), (1.2 * s, 1.2 * s, 12 * s), None, None),
             ((0, 0.44 * L, h * 0.9 + 9 * s), (2.4 * s, 0.14 * L, 16 * s), (0.3, 0, 0), None),
             ((0, 0.0, -h * 0.95), (2.2 * s, 0.42 * L, 9 * s), None, None)]
    for sx in (-1, 1):
        parts.append(((sx * w * 0.78, 0.30 * L, 0), (w * 0.62, 0.20 * L, 2.2 * s), (0, sx * 0.22, 0), None))  # stabilisers
        parts.append(((sx * w * 0.52, -0.02 * L, h * 0.05), (4.5 * s, 0.16 * L, 6 * s), None, None))          # sponsons
    hullo = box_object(name + "_h", parts, TOP, cuts=3)
    set_albedo(hullo, panel_fn(TOP, BEL, RED, (-0.36 * L, -0.30 * L), cell=(6 * s, 8 * s, 4 * s)))
    pods = cyl_object(name + "_p", [((sx * w * 0.86, 0.36 * L, -h * 0.05), 7.5 * s, 0.34 * L, "y", 7.5 * s) for sx in (-1, 1)], (0.52, 0.53, 0.55), segs=12)
    stripe = box_object(name + "_s", [((0, -0.12 * L, hull_top(h, L, -0.12 * L, KE, PE) + 0.15 * s), (w * 0.35, 0.2 * L, 0.4 * s), None, None)], BLUE, cuts=1)
    tc, tb = [], []
    for i in range(n_turrets):
        y = [-0.27, -0.12, 0.27][i] * L if n_turrets <= 3 else (-0.3 + i * 0.16) * L
        z = hull_top(h, L, y, KE, PE) + (8 * s if y > 0.2 * L else 0)
        c, b, _ = turret_parts((0, y, z), 1, s * 1.15, 12 * s)
        tc += c; tb += b
    t1 = cyl_object(name + "_tc", tc, (0.30, 0.31, 0.33), segs=12)
    t2 = box_object(name + "_tb", tb, (0.48, 0.49, 0.50), cuts=1)
    return [hullo, pods, stripe, t1, t2]


def zeon_warship(name, L):
    """Zeon cruiser (original): rounded green hull, swept wing pods with hangar mouths, dorsal command fin."""
    s = L / 220.0
    G = (0.29, 0.39, 0.27); DG = (0.20, 0.26, 0.19); Y = (0.60, 0.50, 0.20)
    body = cyl_object(name + "_b", [((0, 0, 0), 15 * s, 0.86 * L, "y", 6 * s), ((0, 0.4 * L, 0), 21 * s, 0.22 * L, "y", 17 * s)], G, segs=14)
    set_albedo(body, panel_fn(G, DG, Y, (-0.33 * L, -0.30 * L), cell=(6 * s, 9 * s, 5 * s)))
    wings = box_object(name + "_w", [
        ((0, 0.05 * L, 20 * s), (3 * s, 0.32 * L, 22 * s), (0.2, 0, 0), None),
        ((0, -0.05 * L, -19 * s), (3 * s, 0.4 * L, 15 * s), None, None),
        ((-30 * s, 0.08 * L, -3 * s), (13 * s, 12 * s, 0.34 * L), ROT_FWD, (0.6, 1.2)),
        ((30 * s, 0.08 * L, -3 * s), (13 * s, 12 * s, 0.34 * L), ROT_FWD, (0.6, 1.2)),
        ((-19 * s, 0.12 * L, -3 * s), (12 * s, 0.12 * L, 3 * s), None, None),
        ((19 * s, 0.12 * L, -3 * s), (12 * s, 0.12 * L, 3 * s), None, None),
        ((0, 0.47 * L, 0), (70 * s, 0.07 * L, 4 * s), None, None)], DG, cuts=2)
    mouths = box_object(name + "_m", [((sx * 30 * s, 0.08 * L - 0.17 * L - 0.3 * s, -3 * s), (10 * s, 0.6 * s, 9 * s), None, None) for sx in (-1, 1)], (0.04, 0.04, 0.05), cuts=0)
    return [body, wings, mouths]


def mobile_suit(name, faction):
    """Original mass-production mobile suit, ~17 m, in a flying pose (forward -Y)."""
    if faction == "eff":
        MAIN = (0.78, 0.78, 0.76); SUB = (0.20, 0.30, 0.55); ACC = (0.65, 0.16, 0.13); DARK = (0.22, 0.23, 0.25); EYE = (0.55, 1.0, 0.75)
    else:
        MAIN = (0.30, 0.42, 0.28); SUB = (0.20, 0.27, 0.19); ACC = (0.42, 0.22, 0.18); DARK = (0.16, 0.17, 0.17); EYE = (1.0, 0.25, 0.55)
    main = [((0, 0, 3.6), (5.0, 3.3, 4.0), None, (0.92, 1.0)),               # torso
            ((0, 0, 0.9), (2.8, 2.3, 1.6), None, None),                       # waist
            ((-3.5, 0, 5.1), (2.4, 2.7, 2.3), None, None), ((3.5, 0, 5.1), (2.4, 2.7, 2.3), None, None),   # shoulders
            ((-1.25, 0.6, -2.0), (1.7, 1.9, 3.3), (0.32, 0, 0), None), ((1.25, 0.6, -2.0), (1.7, 1.9, 3.3), (0.32, 0, 0), None),  # thighs
            ((-1.35, 1.6, -5.3), (2.0, 2.3, 4.2), (0.42, 0, 0), (0.85, 1.0)), ((1.35, 1.6, -5.3), (2.0, 2.3, 4.2), (0.42, 0, 0), (0.85, 1.0)),  # shins
            ((-3.9, -0.9, 1.0), (1.6, 1.7, 2.8), (0.75, 0, 0), None), ((3.9, -0.9, 1.0), (1.6, 1.7, 2.8), (0.75, 0, 0), None)]  # forearms
    sub = [((-3.7, 0, 3.4), (1.2, 1.2, 2.4), None, None), ((3.7, 0, 3.4), (1.2, 1.2, 2.4), None, None),   # upper arms
           ((0, 1.9, 4.1), (3.3, 1.5, 3.3), None, None),                                                   # backpack
           ((-1.35, 2.5, -7.6), (1.9, 3.0, 0.9), (0.45, 0, 0), None), ((1.35, 2.5, -7.6), (1.9, 3.0, 0.9), (0.45, 0, 0), None),  # feet
           ((0, -1.25, -0.4), (2.6, 0.5, 1.9), (-0.15, 0, 0), None)]                                       # front skirt
    acc = [((0, -1.75, 4.2), (2.2, 0.4, 1.4), None, None)]                                                 # chest plate
    if faction == "eff":
        head = [((0, -0.1, 6.55), (1.6, 1.8, 1.5), None, None), ((0, 0.25, 7.45), (0.25, 1.2, 0.6), None, None)]
        acc.append(((-4.75, -1.2, 1.6), (0.4, 3.0, 4.6), (0.2, 0, 0), None))                               # shield
        dark = [((4.3, -2.9, 0.4), (0.6, 5.8, 0.9), (0.08, 0, 0), None)]                                   # rifle
        eye = [((0, -1.02, 6.7), (1.25, 0.12, 0.35), None, None)]                                          # visor
    else:
        head = [((0, -0.1, 6.5), (1.9, 2.0, 1.7), None, (0.7, 1.0)), ((0, 0.1, 7.5), (0.3, 1.6, 0.5), None, None)]
        acc.append(((-4.2, 0, 5.6), (1.8, 3.4, 2.6), None, (0.6, 1.0)))                                     # shoulder armour
        dark = [((4.35, -2.6, 0.3), (0.9, 4.6, 1.3), (0.08, 0, 0), None), ((4.35, -1.6, -0.6), (0.7, 1.4, 1.4), None, None)]  # gun + drum
        eye = [((-0.35, -1.1, 6.6), (0.45, 0.12, 0.3), None, None), ((0.35, -1.1, 6.6), (0.45, 0.12, 0.3), None, None)]
    objs = [box_object(name + "_a", main, MAIN, cuts=1), box_object(name + "_b", sub, SUB, cuts=1), box_object(name + "_c", acc, ACC, cuts=1),
            box_object(name + "_d", head, MAIN, cuts=1), box_object(name + "_e", dark, DARK, cuts=1)]
    objs.append(cyl_object(name + "_t", [((-0.9, 2.75, 3.3), 0.55, 1.2, "y", 0.7), ((0.9, 2.75, 3.3), 0.55, 1.2, "y", 0.7)], DARK, segs=8))
    return objs, box_object(name + "_eye", eye, EYE, cuts=0)


def build_ships():
    print("ships", flush=True)
    reset()
    groups = {
        "eff_cruiser": eff_warship("eff_cruiser", 200, 2),
        "eff_battleship": eff_warship("eff_battleship", 380, 3, beam=1.15),
        "zeon_cruiser": zeon_warship("zeon_cruiser", 230),
    }
    dome_bm = bmesh.new()
    bmesh.ops.create_uvsphere(dome_bm, u_segments=24, v_segments=12, radius=45)
    for v in dome_bm.verts:
        if v.co.z < 0: v.co.z *= 0.35
        v.co.z *= 0.8
    dome = obj_from_bm(dome_bm, "zeon_armor_d"); set_albedo(dome, lambda co, n: (0.30, 0.38, 0.30))
    skirt = cyl_object("zeon_armor_s", [((0, 0, -6), 52, 10, "z", 58)], (0.24, 0.30, 0.24), segs=24)
    groups["zeon_armor"] = [dome, skirt]
    for k, objs in groups.items():
        bake_ao_into_col(objs, distance=(26.0 if k != "eff_battleship" else 40.0))
    ms = {}
    for k, fac in (("eff_ms", "eff"), ("zeon_ms", "zeon")):
        objs, eye = mobile_suit(k, fac)
        bake_ao_into_col(objs, distance=1.8)
        me = eye.data; alb = me.attributes["alb"]; col = me.attributes.new("Col", "FLOAT_COLOR", "POINT")
        for i in range(len(me.vertices)): col.data[i].color = alb.data[i].color
        me.attributes.remove(alb); me.color_attributes.active_color = me.color_attributes["Col"]
        groups[k] = objs + [eye]
    out = [join_objs(objs, k) for k, objs in groups.items()]
    export_glb(os.path.join(OUT, "ships.glb"), out)


# ============================================================ HERO SHIP ==
# 蒼鷺號 Grey Heron — our own ship: a mobile suit carrier-destroyer (original design), seen up close in chase view.
def build_hero():
    print("hero", flush=True)
    reset()
    TOP = (0.62, 0.63, 0.64); BEL = (0.32, 0.33, 0.35); RED = (0.58, 0.14, 0.12); BLUE = (0.17, 0.27, 0.52)
    DARK = (0.05, 0.05, 0.06)
    L, W, H, CY = 230.0, 34.0, 26.0, 10.0
    KE, PE = 0.5, 1.8
    PODX, PODY0, PODY1, PODZ = 37.0, -118.0, 52.0, -2.0      # catapult hangar pods
    pod_len = PODY1 - PODY0; pod_cy = (PODY0 + PODY1) / 2
    hull_parts = [
        ((0, CY, 0), (W, H, L), ROT_FWD, (KE, PE)),                                  # central hull
        ((0, -88, -9), (30, 12, 62), ROT_FWD, (0.12, 1.0)),                          # armoured ram prow
        ((0, 20, -15), (22, 12, 150), ROT_FWD, (0.35, 1.6)),                         # keel
        ((0, 118, 2), (60, 36, 52), None, None),                                     # engine block
        ((0, 128, 26), (3, 30, 22), (0.4, 0, 0), None),                              # dorsal fin
        ((0, 100, -26), (3, 40, 16), (-0.3, 0, 0), None),                            # ventral fin
    ]
    for sx in (-1, 1):
        hull_parts += [((sx * 20, -40, PODZ), (8, 24, 6), None, None), ((sx * 20, 20, PODZ), (8, 24, 6), None, None),   # pod struts
                       ((sx * 56, 112, 0), (26, 34, 2.6), (0, sx * 0.25, 0), None),                                      # stabilisers
                       ((sx * 19, 62, 8), (6, 22, 7), None, None)]                                                       # CIWS sponsons
    hull = box_object("hero_hull", hull_parts, TOP, cuts=4)
    set_albedo(hull, panel_fn(TOP, BEL, RED, (-80, -70), cell=(7, 9, 5), belly_z=-4))
    pods = box_object("hero_pods", [((sx * PODX, pod_cy, PODZ), (24, pod_len, 19), None, None) for sx in (-1, 1)] +
                      [((sx * PODX, PODY0 + 4, PODZ + 9.6), (24.4, 8, 1.0), None, None) for sx in (-1, 1)], TOP, cuts=5)
    set_albedo(pods, panel_fn(TOP, BEL, RED, (PODY0 - 1, PODY0 + 9), cell=(6, 10, 5), belly_z=PODZ - 2))
    deck = box_object("hero_deck", [((sx * PODX, pod_cy, PODZ + 9.7), (5, pod_len - 6, 0.5), None, None) for sx in (-1, 1)] +
                      [((sx * PODX, pod_cy + 10, PODZ + 9.7), (24.2, 3, 0.45), None, None) for sx in (-1, 1)], BLUE, cuts=0)
    mouths = box_object("hero_mouths", [((sx * PODX, PODY0 - 0.25, PODZ), (19, 0.8, 14), None, None) for sx in (-1, 1)], DARK, cuts=0)
    tower = box_object("hero_tower", [
        ((0, 44, 26), (17, 34, 22), None, (0.72, 1.0)),
        ((0, 35, 39.5), (32, 13, 8), None, None),
        ((0, 47, 45), (12, 8, 5), None, None),
        ((0, 46, 52), (1.4, 1.4, 16), None, None), ((0, 46, 57), (12, 1, 1), None, None)], (0.68, 0.68, 0.68), cuts=2)
    set_albedo(tower, panel_fn((0.68, 0.68, 0.68), (0.5, 0.5, 0.5), cell=(5, 6, 4)))
    objs = [hull, pods, deck, mouths, tower]
    nac = cyl_object("hero_nacelles", [((sx * 42, 98, -4), 10, 70, "y", 10) for sx in (-1, 1)], (0.50, 0.51, 0.53), segs=16)
    objs.append(nac)
    tc, tb, tips = [], [], []
    for (y, big) in ((-30, True), (-62, True), (82, False)):
        z = hull_top(H, L, y, KE, PE, cy=CY) if y < 60 else 20.5
        c, b, t = turret_parts((0, y, z), 1, 1.9 if big else 1.25, 26 if big else 14)
        tc += c; tb += b; tips += t
    for sx in (-1, 1):  # CIWS
        c, b, t = turret_parts((sx * 19, 62, 11.5), 1, 0.6, 6); tc += c; tb += b; tips += t
    objs.append(cyl_object("hero_turret_bases", tc, (0.30, 0.31, 0.33), segs=14))
    objs.append(box_object("hero_turrets", tb, (0.47, 0.48, 0.49), cuts=1))
    bake_ao_into_col(objs, distance=18.0)

    win = box_object("hero_windows", [((0, 28.35, 40), (29, 0.5, 2.2), None, None),
                                      ((15.9, 35, 40), (0.5, 10, 2.2), None, None), ((-15.9, 35, 40), (0.5, 10, 2.2), None, None)], (1, 1, 1), cuts=0)
    eng = cyl_object("hero_engines", [((sx * 42, 133.6, -4), 8.4, 1.2, "y", 8.4) for sx in (-1, 1)] +
                     [((x, 144.6, z), 7.2, 1.2, "y", 7.2) for x in (-14, 14) for z in (-6, 10)], (1, 1, 1), segs=16)
    LIGHTS = [((PODX + 12.6, 40, PODZ), (1, 0.1, 0.1)), ((-PODX - 12.6, 40, PODZ), (0.1, 1, 0.2)),   # port (+X) red, starboard green
              ((0, 46, 61), (1, 1, 1)), ((0, 140, 38), (1, 1, 1))]
    for sx in (-1, 1):  # catapult guide lights, amber, along each deck
        for k in range(9):
            LIGHTS.append(((sx * PODX + 3.5, PODY0 + 8 + k * 18, PODZ + 10.0), (1, 0.6, 0.15)))
            LIGHTS.append(((sx * PODX - 3.5, PODY0 + 8 + k * 18, PODZ + 10.0), (1, 0.6, 0.15)))
    lb = bmesh.new()
    for (c, col) in LIGHTS:
        tmp = bmesh.new(); bmesh.ops.create_cube(tmp, size=1.5)
        for v in tmp.verts: v.co += Vector(c)
        me = bpy.data.meshes.new("t"); tmp.to_mesh(me); tmp.free(); lb.from_mesh(me); bpy.data.meshes.remove(me)
    lights = obj_from_bm(lb, "hero_lights")
    set_albedo(lights, lambda co, n: min(LIGHTS, key=lambda Lt: (Vector(Lt[0]) - co).length)[1])
    for o in (win, eng, lights):
        me = o.data; alb = me.attributes["alb"]; col = me.attributes.new("Col", "FLOAT_COLOR", "POINT")
        for i in range(len(me.vertices)): col.data[i].color = alb.data[i].color
        me.attributes.remove(alb); me.color_attributes.active_color = me.color_attributes["Col"]
    export_glb(os.path.join(OUT, "hero.glb"), objs + [win, eng, lights])
    g = lambda p: [round(p[0], 2), round(p[2], 2), round(-p[1], 2)]  # Blender -> glTF
    meta = {"length": 265, "gunTips": [g(t) for t in tips],
            "engines": [g((sx * 42, 136, -4)) for sx in (-1, 1)] + [g((x, 147, z)) for x in (-14, 14) for z in (-6, 10)],
            "catapults": [g((sx * PODX, PODY0 + 30, PODZ + 3)) for sx in (-1, 1)],
            "catapultExits": [g((sx * PODX, PODY0 - 4, PODZ + 3)) for sx in (-1, 1)]}
    with open(os.path.join(OUT, "hero.json"), "w") as f:
        json.dump(meta, f, separators=(",", ":"))


if __name__ == "__main__":
    which = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else ["fortress", "bridge", "ships", "hero"]
    if "fortress" in which: build_fortress()
    if "bridge" in which: build_bridge()
    if "ships" in which: build_ships()
    if "hero" in which: build_hero()
    print("done", flush=True)
