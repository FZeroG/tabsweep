"""ไอคอน History Cleaner — stdlib ล้วน (ไม่ต้องมี Pillow)
ใช้แบบ 2: นาฬิกา (ประวัติ) + ไม้กวาดสีส้ม (ลบ)

  python -I tools/make_icons.py icons          -> เขียน icons/icon{16,32,48,128}.png
  python -I tools/make_icons.py <โฟลเดอร์อื่น>   -> ทุกแบบ + compare.png ไว้เทียบ

พิกัดบน grid 16 หน่วย, y ชี้ลง, มุมเป็นองศาแบบ screen (0=ขวา, 90=ล่าง, 180=ซ้าย, 270=บน)
"""
import math
import struct
import sys
import zlib
from pathlib import Path

INK = (23, 23, 27)
PAPER = (242, 240, 234)
HOT = (232, 70, 27)
SS = 4

# ---------- primitives (คืน inside(x, y)) ----------

def rrect(x0, y0, x1, y1, r):
    def f(x, y):
        if not (x0 <= x <= x1 and y0 <= y <= y1):
            return False
        cx = min(max(x, x0 + r), x1 - r)
        cy = min(max(y, y0 + r), y1 - r)
        return (x - cx) ** 2 + (y - cy) ** 2 <= r * r
    return f


def circle(cx, cy, r):
    return lambda x, y: (x - cx) ** 2 + (y - cy) ** 2 <= r * r


def capsule(ax, ay, bx, by, r):
    dx, dy = bx - ax, by - ay
    ll = dx * dx + dy * dy

    def f(x, y):
        t = 0 if ll == 0 else max(0, min(1, ((x - ax) * dx + (y - ay) * dy) / ll))
        px, py = ax + t * dx - x, ay + t * dy - y
        return px * px + py * py <= r * r
    return f


def poly(pts):
    def f(x, y):
        inside = False
        j = len(pts) - 1
        for i in range(len(pts)):
            xi, yi = pts[i]
            xj, yj = pts[j]
            if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi) + xi:
                inside = not inside
            j = i
        return inside
    return f


def arc(cx, cy, r, half, gap0, gap1):
    """วงแหวนที่เว้นช่องมุม gap0..gap1 (องศา) + หัวท้ายมน"""
    def in_gap(a):
        a %= 360
        g0, g1 = gap0 % 360, gap1 % 360
        return g0 <= a <= g1 if g0 <= g1 else (a >= g0 or a <= g1)

    caps = [circle(cx + r * math.cos(math.radians(g)), cy + r * math.sin(math.radians(g)), half)
            for g in (gap0, gap1)]

    def f(x, y):
        d = math.hypot(x - cx, y - cy)
        if abs(d - r) <= half and not in_gap(math.degrees(math.atan2(y - cy, x - cx))):
            return True
        return any(c(x, y) for c in caps)
    return f


def union(*fs):
    return lambda x, y: any(f(x, y) for f in fs)


def pt(cx, cy, r, deg):
    a = math.radians(deg)
    return cx + r * math.cos(a), cy + r * math.sin(a)


# ---------- building blocks ----------

def tile():
    return (rrect(0, 0, 16, 16, 3.2), INK)


def broom(hx0, hy0, hx1, hy1, base_w, length, end_w, handle_r, size, bristles=True):
    """ไม้กวาด: ด้าม (hx0,hy0)->(hx1,hy1) แล้วหัวไม้กวาดต่อออกไปในทิศเดียวกัน"""
    dx, dy = hx1 - hx0, hy1 - hy0
    n = math.hypot(dx, dy)
    dx, dy = dx / n, dy / n
    px, py = -dy, dx
    ex, ey = hx1 + dx * length, hy1 + dy * length
    head = [
        (hx1 + px * base_w, hy1 + py * base_w),
        (ex + px * end_w, ey + py * end_w),
        (ex - px * end_w, ey - py * end_w),
        (hx1 - px * base_w, hy1 - py * base_w),
    ]
    layers = [
        (capsule(hx0, hy0, hx1, hy1, handle_r), PAPER),
        (poly(head), HOT),
    ]
    if bristles and size >= 32:
        for off in (-0.33, 0.33):
            sx = hx1 + dx * length * 0.42 + px * end_w * off * 1.35
            sy = hy1 + dy * length * 0.42 + py * end_w * off * 1.35
            tx = ex + px * end_w * off * 1.9 - dx * 0.2
            ty = ey + py * end_w * off * 1.9 - dy * 0.2
            layers.append((capsule(sx, sy, tx, ty, 0.24), INK))
    # แถบรัดหัวไม้กวาด
    b0 = 0.55
    layers.append((poly([
        (hx1 + px * base_w * 1.08, hy1 + py * base_w * 1.08),
        (hx1 + dx * b0 + px * (base_w + (end_w - base_w) * b0 / length) * 1.08,
         hy1 + dy * b0 + py * (base_w + (end_w - base_w) * b0 / length) * 1.08),
        (hx1 + dx * b0 - px * (base_w + (end_w - base_w) * b0 / length) * 1.08,
         hy1 + dy * b0 - py * (base_w + (end_w - base_w) * b0 / length) * 1.08),
        (hx1 - px * base_w * 1.08, hy1 - py * base_w * 1.08),
    ]), PAPER))
    return layers, head


def clock(cx, cy, r, half, gap0, gap1, arrow=False):
    layers = [(arc(cx, cy, r, half, gap0, gap1), PAPER)]
    if arrow:
        # หัวลูกศรที่ปลาย gap1 ชี้ไปทางทวนเข็ม (มุมลดลง)
        a = math.radians(gap1)
        x, y = pt(cx, cy, r, gap1)
        tx, ty = math.sin(a), -math.cos(a)       # tangent ทิศมุมลด
        nx, ny = math.cos(a), math.sin(a)         # radial
        w = half * 1.85
        tip = (x + tx * w * 1.1, y + ty * w * 1.1)
        b1 = (x - tx * 0.2 + nx * w, y - ty * 0.2 + ny * w)
        b2 = (x - tx * 0.2 - nx * w, y - ty * 0.2 - ny * w)
        layers.append((poly([tip, b1, b2]), PAPER))
    hand = half * 0.95
    layers.append((capsule(cx, cy, cx, cy - r * 0.55, hand), PAPER))
    layers.append((capsule(cx, cy, cx + r * 0.42, cy + r * 0.26, hand), PAPER))
    return layers


# ---------- concepts ----------

def concept_current(size):
    skew = 0 if size < 48 else 0.6

    def para(x0, y0, x1, y1, s):
        h = y1 - y0
        return lambda x, y: y0 <= y <= y1 and x0 + s * (y1 - y) / h <= x <= x1 + s * (y1 - y) / h

    return [tile(), (rrect(3, 3, 11, 5, 1), PAPER), (para(3, 7, 13, 10, skew), HOT), (rrect(3, 12, 9, 14, 1), PAPER)]


def concept_broom(size):
    layers, _ = broom(13.2, 2.8, 8.9, 7.1, 1.55, 4.9, 3.15, 0.85, size)
    dust = [(circle(3.4, 13.6, 0.75), PAPER), (circle(5.9, 14.1, 0.55), PAPER)] if size >= 32 else []
    return [tile(), *layers, *dust]


def concept_clock_broom(size):
    cx, cy, r, half = 7.2, 6.9, 4.3, 0.95
    layers = [tile(), *clock(cx, cy, r, half, 135, 180, arrow=True)]
    blayers, head = broom(14.6, 8.4, 12.3, 10.7, 1.0, 3.1, 2.05, 0.7, size, bristles=size >= 48)
    halo = union(capsule(14.6, 8.4, 12.3, 10.7, 0.7 + 1.0), poly(head), circle(11.0, 12.1, 3.2))
    layers.append((halo, INK))
    layers += blayers
    return layers


def concept_clock_sweep(size):
    cx, cy, r, half = 9.4, 6.6, 4.2, 0.95
    layers = [tile(), *clock(cx, cy, r, half, 110, 170)]
    # รอยกวาด 3 เส้น เว้นระยะห่างกันชัดๆ ออกมาจากช่องของนาฬิกา
    dx, dy = -0.707, 0.707          # ทิศที่ถูกกวาดออก (ล่างซ้าย)
    px, py = 0.707, 0.707           # ตั้งฉาก
    mx, my = pt(cx, cy, r + 1.25, 140)
    sr = 0.78
    for off, length in ((-2.3, 2.3), (0, 3.4), (2.3, 2.3)):
        sx, sy = mx + px * off, my + py * off
        layers.append((capsule(sx, sy, sx + dx * length, sy + dy * length, sr), HOT))
    return layers


CONCEPTS = [
    ("0_current", concept_current),
    ("1_broom", concept_broom),
    ("2_clock_broom", concept_clock_broom),
    ("3_clock_sweep", concept_clock_sweep),
]

# ---------- render / png ----------

def render(fn, size):
    unit = size / 16
    layers = fn(size)
    rows = []
    for py in range(size):
        row = []
        for px in range(size):
            r = g = b = a = 0.0
            for sy in range(SS):
                for sx in range(SS):
                    x = (px + (sx + 0.5) / SS) / unit
                    y = (py + (sy + 0.5) / SS) / unit
                    c = None
                    for inside, color in layers:
                        if inside(x, y):
                            c = color
                    if c:
                        r += c[0]; g += c[1]; b += c[2]; a += 1
            n = SS * SS
            row.append((round(r / a), round(g / a), round(b / a), round(a / n * 255)) if a else (0, 0, 0, 0))
        rows.append(row)
    return rows


def png_bytes(w, h, pixels):
    def chunk(tag, data):
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
    raw = b"".join(b"\x00" + b"".join(bytes(p) for p in row) for row in pixels)
    return (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 6, 0, 0, 0))
            + chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b""))


def sheet(renders, path):
    """แถว = concept, คอลัมน์ = [16 ขยาย x8, 16 จริง, 32, 128] บนพื้นสว่าง | พื้นมืด"""
    pad, cell = 16, 128
    cols = 4
    half_w = pad + cols * (cell + pad)
    w, h = half_w * 2, pad + len(renders) * (cell + pad)
    bgs = [(243, 243, 243, 255), (32, 32, 35, 255)]
    canvas = [[bgs[0] if x < half_w else bgs[1] for x in range(w)] for _ in range(h)]

    def blit(rows, ox, oy, scale):
        for y in range(len(rows) * scale):
            for x in range(len(rows) * scale):
                r, g, b, a = rows[y // scale][x // scale]
                if a == 0:
                    continue
                al = a / 255
                bg = canvas[oy + y][ox + x]
                canvas[oy + y][ox + x] = (round(r * al + bg[0] * (1 - al)), round(g * al + bg[1] * (1 - al)),
                                          round(b * al + bg[2] * (1 - al)), 255)

    for ri, sizes in enumerate(renders):
        oy = pad + ri * (cell + pad)
        for side in range(2):
            ox0 = side * half_w + pad
            blit(sizes[16], ox0, oy, 8)
            blit(sizes[16], ox0 + (cell + pad) + 56, oy + 56, 1)
            blit(sizes[32], ox0 + 2 * (cell + pad) + 48, oy + 48, 1)
            blit(sizes[128], ox0 + 3 * (cell + pad), oy, 1)
    Path(path).write_bytes(png_bytes(w, h, canvas))


def build_final(out_dir, fn=None):
    """สร้างไอคอนจริงของ extension (default = แบบ 2 นาฬิกา + ไม้กวาด)"""
    fn = fn or concept_clock_broom
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    for s in (16, 32, 48, 128):
        (out_dir / f"icon{s}.png").write_bytes(png_bytes(s, s, render(fn, s)))
        print(f"wrote icon{s}.png")


def build_store_logo(out_dir, size=300):
    """โลโก้สำหรับหน้าร้าน Edge Add-ons (1:1, แนะนำ 300x300)"""
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / f"logo{size}.png").write_bytes(png_bytes(size, size, render(concept_clock_broom, size)))
    print(f"wrote logo{size}.png")


if __name__ == "__main__" and len(sys.argv) == 2 and Path(sys.argv[1]).name == "icons":
    # python tools/make_icons.py <extension>/icons  -> สร้างไอคอนจริง
    build_final(sys.argv[1])
    sys.exit()

if __name__ == "__main__" and len(sys.argv) == 2 and Path(sys.argv[1]).name == "store":
    # python tools/make_icons.py <extension>/store  -> โลโก้หน้าร้าน 300x300
    build_store_logo(sys.argv[1])
    sys.exit()

if __name__ == "__main__":
    # python tools/make_icons.py <dir>  -> สร้างทุกแบบ + ภาพเทียบ compare.png
    out = Path(sys.argv[1])
    out.mkdir(parents=True, exist_ok=True)
    all_renders = []
    for name, fn in CONCEPTS:
        sizes = {}
        d = out / name
        d.mkdir(exist_ok=True)
        for s in (16, 32, 48, 128):
            sizes[s] = render(fn, s)
            (d / f"icon{s}.png").write_bytes(png_bytes(s, s, sizes[s]))
        all_renders.append(sizes)
        print("rendered", name)
    sheet(all_renders, out / "compare.png")
    print("wrote compare.png")
