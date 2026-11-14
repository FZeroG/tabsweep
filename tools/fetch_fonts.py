"""ดาวน์โหลดฟอนต์ (OFL) จาก Google Fonts มาใส่ใน extension แบบ offline

  python -I tools/fetch_fonts.py <out_dir>

ได้: <out_dir>/*.woff2 (เฉพาะ subset thai + latin), fonts.css (@font-face แบบ path ในเครื่อง),
     OFL-<family>.txt (license ที่ต้องแนบไปกับฟอนต์)
"""
import re
import sys
import urllib.request
from pathlib import Path

FAMILIES = {
    # family: (css2 query, OFL path ใน github.com/google/fonts)
    "Bai Jamjuree": ("Bai+Jamjuree:wght@600;700", "ofl/baijamjuree/OFL.txt"),
    "Anuphan": ("Anuphan:wght@400..700", "ofl/anuphan/OFL.txt"),
    "IBM Plex Mono": ("IBM+Plex+Mono:wght@500", "ofl/ibmplexmono/OFL.txt"),
}
SUBSETS = {"thai", "latin"}
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36"


def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read()


def slug(s):
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


def main(out):
    out = Path(out)
    out.mkdir(parents=True, exist_ok=True)
    faces = []
    for family, (query, ofl) in FAMILIES.items():
        css = get(f"https://fonts.googleapis.com/css2?family={query}&display=swap").decode("utf-8")
        # รวมน้ำหนักที่ใช้ไฟล์เดียวกัน (variable font) -> ดาวน์โหลดครั้งเดียว, font-weight เป็นช่วง
        groups = {}
        for subset, block in re.findall(r"/\*\s*([\w-]+)\s*\*/\s*(@font-face\s*\{[^}]*\})", css):
            if subset not in SUBSETS:
                continue
            # "600" หรือช่วงของ variable font เช่น "400 700"
            weight = [int(w) for w in re.search(r"font-weight:\s*([\d ]+);", block).group(1).split()]
            url = re.search(r"src:\s*url\((https://[^)]+\.woff2)\)", block).group(1)
            rng = re.search(r"unicode-range:\s*([^;]+);", block).group(1).strip()
            groups.setdefault((subset, url), {"weights": [], "range": rng})["weights"].extend(weight)
        for (subset, url), g in groups.items():
            ws = sorted(set(g["weights"]))
            weight = str(ws[0]) if len(ws) == 1 else f"{ws[0]} {ws[-1]}"
            name = f"{slug(family)}-{'-'.join(map(str, ws))}-{subset}.woff2"
            data = get(url)
            if data[:4] != b"wOF2":
                raise SystemExit(f"not a woff2 file: {url}")
            (out / name).write_bytes(data)
            faces.append((family, weight, name, g["range"]))
            print(f"  {name:40} {len(data):>7,} bytes  weight {weight}")
        lic = get(f"https://raw.githubusercontent.com/google/fonts/main/{ofl}")
        if b"SIL OPEN FONT LICENSE" not in lic.upper():
            raise SystemExit(f"unexpected license file: {ofl}")
        (out / f"OFL-{slug(family)}.txt").write_bytes(lic)
        print(f"  OFL-{slug(family)}.txt")

    lines = ["/* ฟอนต์ OFL จาก Google Fonts — โหลดจากไฟล์ใน extension (ไม่เรียกเน็ต) */"]
    for family, weight, name, rng in faces:
        lines.append(
            "@font-face {\n"
            f'  font-family: "{family}";\n'
            "  font-style: normal;\n"
            f"  font-weight: {weight};\n"
            "  font-display: swap;\n"
            f'  src: url("{name}") format("woff2");\n'
            f"  unicode-range: {rng};\n"
            "}"
        )
    (out / "fonts.css").write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"wrote fonts.css ({len(faces)} faces)")


if __name__ == "__main__":
    main(sys.argv[1])
