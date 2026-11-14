"""สร้าง package สำหรับส่งร้าน Edge Add-ons: dist/tabsweep-<version>.zip

  python -I tools/build_zip.py

ใส่เฉพาะไฟล์ที่ extension ใช้ตอนทำงาน (ไม่เอา tools/, docs/, store/, dist/, README)
และตรวจก่อน build:
  - manifest.json อ่านได้ + ไฟล์ที่อ้างถึงมีจริง
  - คำแปลทุก key ที่โค้ด/HTML ใช้ มีครบทั้ง en และ th
  - ชื่อ/คำอธิบายไม่ยาวเกินกำหนด
"""
import json
import re
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
INCLUDE = [
    "manifest.json",
    "background.js",
    "popup.html",
    "popup.js",
    "options.html",
    "options.js",
    "styles.css",
    "lib",
    "icons",
    "fonts",
    "_locales",
]
LOCALES = ["en", "th"]
errors = []


def check(cond, msg):
    if not cond:
        errors.append(msg)


def files():
    for item in INCLUDE:
        p = ROOT / item
        check(p.exists(), f"missing: {item}")
        if p.is_dir():
            yield from sorted(f for f in p.rglob("*") if f.is_file())
        elif p.exists():
            yield p


manifest = json.loads((ROOT / "manifest.json").read_text(encoding="utf-8"))
version = manifest["version"]

# --- locales ---
messages = {}
for loc in LOCALES:
    path = ROOT / "_locales" / loc / "messages.json"
    try:
        messages[loc] = {k.lower(): v["message"] for k, v in json.loads(path.read_text(encoding="utf-8")).items()}
    except Exception as e:  # noqa: BLE001
        errors.append(f"{path}: {e}")
        messages[loc] = {}

check(set(messages["en"]) == set(messages["th"]),
      f"en/th keys differ: {sorted(set(messages['en']) ^ set(messages['th']))}")

# key ที่ถูกใช้: __MSG_x__, data-i18n="x", data-i18n-attr="a:x;b:y", t("x"/tNodes("x"/getMessage("x"
used = set()
for f in ROOT.glob("*.json"):
    used |= set(re.findall(r"__MSG_(\w+)__", f.read_text(encoding="utf-8")))
for f in list(ROOT.glob("*.html")):
    text = f.read_text(encoding="utf-8")
    used |= set(re.findall(r'data-i18n="(\w+)"', text))
    for attr in re.findall(r'data-i18n-attr="([^"]+)"', text):
        used |= {pair.split(":")[1].strip() for pair in attr.split(";") if ":" in pair}
for f in list(ROOT.glob("*.js")) + list((ROOT / "lib").glob("*.js")):
    text = f.read_text(encoding="utf-8")
    used |= set(re.findall(r'\b(?:t|tNodes|getMessage)\(\s*"(\w+)"', text))
# key ที่ประกอบแบบ dynamic
used |= {"modeVisit", "modeClose", "reasonVisit", "reasonClose", "reasonBoot", "reasonTest"}

for loc in LOCALES:
    missing = sorted(k for k in used if k.lower() not in messages[loc])
    check(not missing, f"{loc}: missing keys {missing}")

# --- limits (Chrome/Edge manifest) ---
for loc in LOCALES:
    m = messages[loc]
    check(len(m.get("extname", "")) <= 75, f"{loc}: extName > 75 chars")
    check(len(m.get("extdescription", "")) <= 132, f"{loc}: extDescription {len(m.get('extdescription', ''))} > 132 chars")
    check(len(m.get("extshortname", "")) <= 12, f"{loc}: extShortName > 12 chars")

# --- files referenced by manifest ---
refs = list(manifest.get("icons", {}).values())
refs += list(manifest.get("action", {}).get("default_icon", {}).values())
refs += [manifest["background"]["service_worker"], manifest["action"]["default_popup"], manifest["options_page"]]
for r in refs:
    check((ROOT / r).exists(), f"manifest references missing file: {r}")

fonts_css = ROOT / "fonts" / "fonts.css"
if fonts_css.exists():
    for ref in re.findall(r'url\("([^"]+)"\)', fonts_css.read_text(encoding="utf-8")):
        check((fonts_css.parent / ref).exists(), f"fonts.css references missing file: {ref}")
    check(any((ROOT / "fonts").glob("OFL-*.txt")), "fonts/: OFL license files missing")

all_files = list(files())

if errors:
    print("BUILD FAILED:")
    for e in errors:
        print("  -", e)
    sys.exit(1)

dist = ROOT / "dist"
dist.mkdir(exist_ok=True)
out = dist / f"tabsweep-{version}.zip"
with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
    for f in all_files:
        z.write(f, f.relative_to(ROOT).as_posix())

print(f"OK  {out.relative_to(ROOT)}  ({out.stat().st_size:,} bytes, {len(all_files)} files)")
print(f"    keys used: {len(used)}, en/th messages: {len(messages['en'])}")
