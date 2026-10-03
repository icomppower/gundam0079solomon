"""
Solomon v2 — headless Blender asset build.

Run:  python3 tools/blender/build_assets.py
Needs the `bpy` module (pip install bpy) or run inside Blender:
      blender -b -P tools/blender/build_assets.py

Outputs (assets/):
  fortress.glb          Solomon asteroid fortress (rock + structures), AO baked into vertex colour
  fortress_lights.json  surface beacon positions/normals (rendered as glow points at runtime)
  bridge.glb            bridge interior of our fictional cruiser, AO baked
  ships.glb             original hulls: eff_cruiser, zeon_cruiser, zeon_armor
  hero.glb / hero.json  蒼鷺號 Grey Heron, our own cruiser, detailed for the chase view (+ gun tips, engines, lights)

Everything is generated from a fixed seed, so the build is deterministic.
Every hull here is an original design; no canon mecha or ship is modelled.
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
# Blender: length along -Y (forward) -> glTF forward -Z.
def build_ships():
    print("ships", flush=True)
    reset()
    objs = []
    # --- Federation cruiser (original): angular hull, twin side engine pods, dorsal tower
    G = (0.62, 0.62, 0.60); R_ = (0.55, 0.20, 0.18)
    hull = box_object("eff_cruiser", [
        ((0, 0, 0), (26, 20, 200), (math.pi / 2, 0, 0), (0.35, 2.0)),       # main hull, tapered nose (-Y after rot)
        ((0, 70, 2), (34, 60, 26), None, None),                              # engine block
        ((0, 10, 16), (12, 40, 14), None, None),                             # dorsal tower
        ((0, 4, 25), (18, 10, 4), None, None),                               # bridge cap
        ((0, -40, -12), (4, 60, 10), None, None),                            # keel fin
    ], G, cuts=2)
    pods = cyl_object("eff_cruiser_pods", [((-24, 62, 0), 8, 70, "y", 7), ((24, 62, 0), 8, 70, "y", 7)], (0.50, 0.50, 0.50), segs=12)
    stripe = box_object("eff_cruiser_stripe", [((0, -30, 10.5), (16, 40, 1.0), None, None)], R_, cuts=2)
    # --- Zeon cruiser (original): rounded green hull with a ventral keel and dorsal fin
    zg = (0.30, 0.40, 0.28)
    zhull = cyl_object("zeon_cruiser", [((0, 0, 0), 16, 190, "y", 6), ((0, 70, 0), 22, 50, "y", 18)], zg, segs=14)
    zfin = box_object("zeon_cruiser_fins", [((0, 20, 22), (3, 70, 26), None, None), ((0, -10, -20), (3, 90, 18), None, None),
                                            ((0, 80, 0), (60, 18, 4), None, None)], (0.25, 0.33, 0.24), cuts=2)
    # --- large Zeon mobile armour silhouette (original): squat dome with skirt and front ports
    dome_bm = bmesh.new()
    bmesh.ops.create_uvsphere(dome_bm, u_segments=24, v_segments=12, radius=45)
    for v in dome_bm.verts:
        if v.co.z < 0: v.co.z *= 0.35
        v.co.z *= 0.8
    dome = obj_from_bm(dome_bm, "zeon_armor"); set_albedo(dome, lambda co, n: (0.30, 0.38, 0.30))
    skirt = cyl_object("zeon_armor_skirt", [((0, 0, -6), 52, 10, "z", 58)], (0.24, 0.30, 0.24), segs=24)
    objs = [hull, pods, stripe, zhull, zfin, dome, skirt]
    bake_ao_into_col(objs, distance=30.0)
    # join per ship so each exports as one node
    def join(names, target):
        bpy.ops.object.select_all(action="DESELECT")
        for nme in names: bpy.data.objects[nme].select_set(True)
        bpy.context.view_layer.objects.active = bpy.data.objects[target]
        bpy.ops.object.join()
        return bpy.data.objects[target]
    a = join(["eff_cruiser", "eff_cruiser_pods", "eff_cruiser_stripe"], "eff_cruiser")
    b = join(["zeon_cruiser", "zeon_cruiser_fins"], "zeon_cruiser")
    c = join(["zeon_armor", "zeon_armor_skirt"], "zeon_armor")
    export_glb(os.path.join(OUT, "ships.glb"), [a, b, c])


# ============================================================ HERO SHIP ==
# 蒼鷺號 Grey Heron — our own cruiser, seen up close in the chase view. Original design.
# Blender: forward = -Y, up = +Z, metres. Exports with nose at glTF +Z (three.js lookAt convention).
def build_hero():
    print("hero", flush=True)
    reset()
    GREY = (0.60, 0.61, 0.62); DARKG = (0.36, 0.37, 0.39); RED = (0.55, 0.13, 0.11)

    def hull_col(co, n):
        # panel variation + red band behind the nose + darker belly
        cell = (math.floor(co.x / 7.0), math.floor(co.y / 9.0), math.floor(co.z / 5.0))
        k = 0.88 + 0.16 * (hash3(cell) - 0.5)
        if -78 < co.y < -66 and co.z > 0: return (RED[0] * k, RED[1] * k, RED[2] * k)
        g = GREY if co.z > -4 else DARKG
        return (g[0] * k, g[1] * k, g[2] * k)

    def hash3(c):
        v = math.sin(c[0] * 12.9898 + c[1] * 78.233 + c[2] * 37.719) * 43758.5453
        return v - math.floor(v)

    objs = []
    hull = box_object("hero_hull", [
        ((0, 0, 0), (30, 22, 210), (math.pi / 2, 0, 0), (0.45, 2.2)),          # main hull, nose -Y
        ((0, 15, -14), (22, 12, 150), (math.pi / 2, 0, 0), (0.35, 1.6)),       # keel
        ((0, 95, 2), (42, 30, 52), None, None),                                # engine block
        ((16, -5, 0), (6, 26, 7), None, None), ((-16, -5, 0), (6, 26, 7), None, None),  # side sponsons
        ((20, 80, -2), (16, 34, 6), None, None), ((-20, 80, -2), (16, 34, 6), None, None),  # nacelle pylons
        ((0, 112, 18), (3, 26, 20), (0.35, 0, 0), None),                       # dorsal fin
    ], GREY, cuts=4)
    set_albedo(hull, hull_col); objs.append(hull)
    tower = box_object("hero_tower", [
        ((0, 26, 19), (14, 30, 16), None, (0.85, 1.0)),                        # tower
        ((0, 19, 30), (26, 13, 7), None, None),                                # bridge head
        ((0, 27, 39), (1.2, 1.2, 14), None, None), ((0, 27, 43), (10, 1, 1), None, None),  # mast + yard
        ((0, 34, 30), (8, 6, 4), None, None),                                  # sensor block
    ], (0.66, 0.66, 0.66), cuts=2)
    set_albedo(tower, hull_col); objs.append(tower)
    nac = cyl_object("hero_nacelles", [((30, 80, -2), 9, 92, "y", 9), ((-30, 80, -2), 9, 92, "y", 9),
                                       ((30, 33, -2), 6, 6, "y", 9), ((-30, 33, -2), 6, 6, "y", 9)], (0.52, 0.53, 0.55), segs=16)
    objs.append(nac)
    # turrets: (base centre, facing up(+1)/down(-1))
    TUR = [((0, -25, 9.3), 1), ((0, -60, 7.6), 1), ((0, -22, -21.5), -1)]
    tparts, bparts, tips = [], [], []
    for (c, s_) in TUR:
        x, y, z = c
        tparts.append(((x, y, z + s_ * 1.6), 6.5, 3.2, "z", 5.8))
        bparts.append(((x, y - 1, z + s_ * 4.2), (10, 11, 4.2), None, None))
        for bx in (-2.3, 2.3):
            bparts.append(((x + bx, y - 11, z + s_ * 4.4), (1.3, 16, 1.3), None, None))
            tips.append((x + bx, y - 19.5, z + s_ * 4.4))
    tb = cyl_object("hero_turret_bases", tparts, DARKG, segs=14); objs.append(tb)
    tt = box_object("hero_turrets", bparts, (0.48, 0.49, 0.50), cuts=1); objs.append(tt)
    bake_ao_into_col(objs, distance=18.0)

    # emissive parts (coloured at runtime): windows, engine nozzles, running lights
    win = box_object("hero_windows", [((0, 12.35, 30.8), (22, 0.5, 1.8), None, None),
                                      ((12.9, 19, 30.8), (0.5, 9, 1.8), None, None), ((-12.9, 19, 30.8), (0.5, 9, 1.8), None, None)], (1, 1, 1), cuts=0)
    eng = cyl_object("hero_engines", [((30, 126.6, -2), 7.4, 1.2, "y", 7.4), ((-30, 126.6, -2), 7.4, 1.2, "y", 7.4),
                                      ((-11, 121.4, 2), 6, 1.2, "y", 6), ((11, 121.4, 2), 6, 1.2, "y", 6)], (1, 1, 1), segs=16)
    # port (+X) red, starboard (-X) green
    LIGHTS = [((39.5, 80, -2), (1, 0.1, 0.1)), ((-39.5, 80, -2), (0.1, 1, 0.2)), ((0, 27, 46.5), (1, 1, 1)), ((0, 124, 30), (1, 1, 1))]
    lb = bmesh.new()
    for (c, col) in LIGHTS:
        tmp = bmesh.new(); bmesh.ops.create_cube(tmp, size=1.6)
        for v in tmp.verts: v.co += Vector(c)
        me = bpy.data.meshes.new("t"); tmp.to_mesh(me); tmp.free(); lb.from_mesh(me); bpy.data.meshes.remove(me)
    lights = obj_from_bm(lb, "hero_lights")
    def lcol(co, n):
        best = min(LIGHTS, key=lambda L: (Vector(L[0]) - co).length); return best[1]
    set_albedo(lights, lcol)
    for o in (win, eng, lights):
        me = o.data; alb = me.attributes["alb"]; col = me.attributes.new("Col", "FLOAT_COLOR", "POINT")
        for i in range(len(me.vertices)): col.data[i].color = alb.data[i].color
        me.attributes.remove(alb); me.color_attributes.active_color = me.color_attributes["Col"]
    export_glb(os.path.join(OUT, "hero.glb"), objs + [win, eng, lights])
    g = lambda p: [round(p[0], 2), round(p[2], 2), round(-p[1], 2)]  # Blender -> glTF
    meta = {"length": 254, "gunTips": [g(t) for t in tips], "engines": [g((30, 128, -2)), g((-30, 128, -2)), g((-11, 123, 2)), g((11, 123, 2))],
            "lights": [g(L[0]) + list(L[1]) for L in LIGHTS]}
    with open(os.path.join(OUT, "hero.json"), "w") as f:
        json.dump(meta, f, separators=(",", ":"))


if __name__ == "__main__":
    which = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else ["fortress", "bridge", "ships", "hero"]
    if "fortress" in which: build_fortress()
    if "bridge" in which: build_bridge()
    if "ships" in which: build_ships()
    if "hero" in which: build_hero()
    print("done", flush=True)
