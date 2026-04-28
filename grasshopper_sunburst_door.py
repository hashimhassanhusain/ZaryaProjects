"""
================================================================
SUNBURST DOOR TEXTURE GENERATOR  -  GHPython Component Script
================================================================

انسخ هذا الكود كاملاً داخل مكوّن GHPython في Grasshopper.

INPUTS  (Item Access لكل المدخلات):
  door_w    float  عرض الباب الكلي بالمم               [1200]
  door_h    float  ارتفاع الباب الكلي بالمم            [2400]
  split_r   float  نسبة موضع الفاصل الأفقي 0.0-1.0    [0.52]
  num_rays  int    عدد أشعة التيكسجر                   [24]
  relief    float  ارتفاع بروز التيكسجر بالمم          [20]
  center_r  float  نصف قطر الميدالية المركزية بالمم    [80]
  gap_deg   float  الفجوة الزاوية بين الأشعة (درجة)   [2.0]
  panel_gap float  الفجوة الأفقية بين اللوحتين بالمم   [6]
  leaf_gap  float  الفجوة العمودية بين الرفّين بالمم   [4]
  thickness float  سماكة اللوح الأساسي بالمم           [45]

OUTPUT:
  geometry  list   جميع Brep objects (ألواح + أشعة + ميدالية)
================================================================
"""

import Rhino.Geometry as rg
import math

TOL = 1e-4


def slab_clip(ox, oy, angle, x0, x1, y0, y1):
    """Parametric ray–AABB intersection (positive direction only).
    Returns (t_near, t_far) in mm from origin, or None if no hit."""
    dx, dy = math.cos(angle), math.sin(angle)
    tn, tf = 0.0, 1e15

    if abs(dx) > 1e-9:
        a, b = (x0 - ox) / dx, (x1 - ox) / dx
        tn = max(tn, min(a, b))
        tf = min(tf, max(a, b))
    elif not (x0 <= ox <= x1):
        return None

    if abs(dy) > 1e-9:
        a, b = (y0 - oy) / dy, (y1 - oy) / dy
        tn = max(tn, min(a, b))
        tf = min(tf, max(a, b))
    elif not (y0 <= oy <= y1):
        return None

    return (tn, tf) if tf > tn + TOL else None


def extrude_profile(pts2d, z, h):
    """Extrude a closed 2D polygon [(x,y),...] from z upward by h. Returns Brep or None."""
    pts3d = [rg.Point3d(x, y, z) for x, y in pts2d]
    pts3d.append(pts3d[0])                          # close the polyline
    crv = rg.PolylineCurve(pts3d)
    ext = rg.Extrusion.Create(crv, h, True)         # True = cap both ends
    return ext.ToBrep() if ext else None


def make_box(x0, x1, y0, y1, z, h):
    return extrude_profile([(x0, y0), (x1, y0), (x1, y1), (x0, y1)], z, h)


def make_disk(cx, cy, r, z, h):
    plane = rg.Plane(rg.Point3d(cx, cy, z), rg.Vector3d.ZAxis)
    ext = rg.Extrusion.Create(rg.ArcCurve(rg.Circle(plane, r)), h, True)
    return ext.ToBrep() if ext else None


def make_ray(ox, oy, angle, r_inner, half_span, z, h, rect):
    """
    Create one tapered sunburst strip clipped to rect=(x0,x1,y0,y1).

    The strip widens proportionally to the distance from the origin
    (constant angular width = half_span on each side), producing
    the characteristic sunburst look where slats are narrow near the
    centre and wide at the perimeter.
    """
    clip = slab_clip(ox, oy, angle, *rect)
    if not clip:
        return None

    t0 = max(clip[0], r_inner)   # strip begins outside the medallion
    t1 = clip[1]
    if t1 <= t0 + TOL:
        return None

    dx, dy = math.cos(angle), math.sin(angle)
    px, py = -dy, dx              # unit perpendicular (left of ray)

    # half-width grows linearly with distance → constant angular width
    hs = t0 * math.tan(half_span)
    he = t1 * math.tan(half_span)

    sx, sy = ox + dx * t0, oy + dy * t0
    ex, ey = ox + dx * t1, oy + dy * t1

    profile = [
        (sx + hs * px, sy + hs * py),
        (ex + he * px, ey + he * py),
        (ex - he * px, ey - he * py),
        (sx - hs * px, sy - hs * py),
    ]
    return extrude_profile(profile, z, h)


# ════════════════════════════════════════════════
#  MAIN  –  يُنفَّذ في كل مرة تتغير فيها القيم
# ════════════════════════════════════════════════

geo = []

hw   = door_w / 2.0
hpg  = panel_gap / 2.0          # نصف الفجوة الأفقية
hvg  = leaf_gap  / 2.0          # نصف الفجوة العمودية

lo_y = door_h * split_r - hpg   # الحافة العليا للوحتين السفليتين
hi_y = door_h * split_r + hpg   # الحافة السفلى للوحتين العلويتين

# مركز الميدالية: 45% من ارتفاع اللوح السفلي
sun_x = 0.0
sun_y = lo_y * 0.45
zt    = thickness                # السطح العلوي للوح الأساسي

# ─── الألواح الأساسية الأربعة ─────────────────
panel_defs = [
    (-hw,  -hvg,  0,    lo_y ),   # سفلي أيسر
    ( hvg,  hw,   0,    lo_y ),   # سفلي أيمن
    (-hw,  -hvg,  hi_y, door_h),  # علوي أيسر
    ( hvg,  hw,   hi_y, door_h),  # علوي أيمن
]

for (bx0, bx1, by0, by1) in panel_defs:
    b = make_box(bx0, bx1, by0, by1, 0, thickness)
    if b:
        geo.append(b)

# ─── الميدالية المركزية ────────────────────────
m = make_disk(sun_x, sun_y, center_r, zt, relief)
if m:
    geo.append(m)

# ─── معاملات الأشعة ───────────────────────────
step      = 2.0 * math.pi / num_rays
half_span = max(1e-4, (step - math.radians(gap_deg)) * 0.5)
r0        = center_r * 1.03      # الأشعة تبدأ بعد حافة الميدالية مباشرة

# ─── توليد الأشعة لكل لوح ─────────────────────
for i in range(num_rays):
    angle = step * i
    for rect in panel_defs:
        s = make_ray(sun_x, sun_y, angle, r0, half_span, zt, relief, rect)
        if s:
            geo.append(s)

geometry = geo
