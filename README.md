# TabSweep: Site History Cleaner (Microsoft Edge, Manifest V3)

ลบประวัติ (history) เฉพาะเว็บที่กำหนด — UI ภาษาไทย/อังกฤษ ตามภาษาของ browser
(ชื่อเดิม: History Cleaner — โฟลเดอร์ยังชื่อ `HistoryCleaner`)

## ติดตั้ง (ระหว่างพัฒนา)
1. เปิด `edge://extensions`
2. เปิด **Developer mode** (มุมซ้ายล่าง)
3. กด **Load unpacked** → เลือกโฟลเดอร์ `HistoryCleaner` นี้
4. (แนะนำ) กดไอคอนจิ๊กซอว์ → ปักหมุด TabSweep ไว้บน toolbar

แก้โค้ดแล้วต้องกด **Reload** ที่การ์ด extension ใน `edge://extensions`

## ส่งร้าน Edge Add-ons
1. `python -I tools/build_zip.py` → `dist/tabsweep-<version>.zip` (ตรวจคำแปล/ไฟล์ให้ก่อน build)
2. ข้อความกรอกหน้าร้าน, เหตุผล permission, notes for certification → `store/LISTING.md`
3. โลโก้ 300×300 + ภาพหน้าจอ 1280×800 (en/th) → `store/`
4. Privacy policy (GitHub Pages) → `docs/privacy.html` → https://fzerog.github.io/tabsweep/privacy.html
5. ออกเวอร์ชันใหม่: แก้ `version` ใน `manifest.json` → build zip ใหม่ → อัปโหลดใน Partner Center

## ภาษา
- ข้อความทั้งหมดอยู่ใน `_locales/en/messages.json` และ `_locales/th/messages.json` (default = en)
- HTML ใช้ `data-i18n="key"` / `data-i18n-attr="placeholder:key"`, JS ใช้ `t("key", ...)` จาก `lib/i18n.js`
- `tools/build_zip.py` จะ fail ถ้ามี key ที่ใช้แต่ไม่มีคำแปลครบทั้งสองภาษา

## ใช้งาน
- **Popup** (กดไอคอน): เพิ่มเว็บที่เปิดอยู่เข้ารายการ, ปุ่ม "ลบเดี๋ยวนี้"
- **Options** (คลิกขวาไอคอน → Extension options): เพิ่ม/เอาออก/เปลี่ยนโหมด, ตั้งรอบการลบซ้ำ

### โหมด
| โหมด | ทำงานยังไง |
|---|---|
| ลบทันทีตอนเข้า | ลบทุกครั้งที่เข้าเว็บ + กวาดซ้ำตอนปิดแท็บ + ลบซ้ำทุก N นาที + ลบตอนเปิด browser (= เปิดทั้งสองโหมดพร้อมกัน) |
| ลบตอนปิดแท็บ | เก็บประวัติระหว่างใช้ ลบเมื่อปิดแท็บของเว็บนั้น (เปิดหลายแท็บ → ลบตอนปิดแท็บสุดท้าย) + เก็บตกตอนเปิด browser |

ใส่ domain หลักจะครอบคลุม subdomain ด้วย (`youtube.com` → `m.youtube.com`) แต่ไม่โดนเว็บอื่นที่ชื่อคล้าย (`notyoutube.com`)

### การแจ้งเตือน (ตั้งใน Options → 03 การทำงาน)
- **ตัวเลขบนไอคอน** (เปิดเป็นค่าเริ่มต้น) — จำนวนรายการที่ลบไปตั้งแต่เปิด browser
- **เปิด popup แจ้งตอนลบ** (ปิดเป็นค่าเริ่มต้น) — popup ของ extension เลื่อนลงมาจากไอคอน
  บอกว่าลบเว็บไหนกี่รายการ แล้วปิดเองใน 4 วินาที (เอาเมาส์ชี้/กด = ไม่ปิด)
  - ปิดแท็บ (โหมดลบตอนปิดแท็บ): เด้งทุกครั้งที่ลบได้
  - โหมดลบทันที: รวมเป็นก้อน และเด้งไม่เกินเว็บละ 1 ครั้งต่อ 5 นาที
  - ใช้ `chrome.action.openPopup()` (Chrome 127+) — เปิดได้เฉพาะตอนหน้าต่าง Edge active อยู่
    ถ้าย่อหน้าต่าง/สลับไปโปรแกรมอื่นจะไม่เด้ง (ตัวเลขบนไอคอนยังนับปกติ)
  - popup จะดึง focus ไปชั่วคราว ถ้ากำลังพิมพ์อยู่ตัวอักษรอาจเข้า popup แทน

## ข้อจำกัด
- **ปิดแท็บพร้อมปิด browser** — ถ้าปิดทั้ง Edge ทีเดียว service worker อาจลบไม่ทัน
  จึงมีการเก็บตกตอนเปิด browser (`runtime.onStartup`)
- **ย้ายไปเว็บอื่นในแท็บเดิม** (ไม่ได้ปิดแท็บ) ยังไม่ลบ — จะลบตอนปิดแท็บนั้น
- **Edge Sync** — ยังไม่ได้ยืนยันว่าการลบจะ sync ไปลบในเครื่องอื่นด้วย
- InPrivate ไม่บันทึก history อยู่แล้ว
- ลบเฉพาะ **History** — ไม่ลบ cookies, cache, รายการใน "Recently closed"

## Debug
`edge://extensions` → การ์ด TabSweep → **Inspect views: service worker** → ดู Console (log ขึ้นต้นด้วย `[TabSweep]`)

## ไฟล์
- `manifest.json` — permissions: history, storage, alarms, tabs (อ่าน URL ของแท็บตอน track)
- `icons/` — ไอคอน 16/32/48/128 (สร้างใหม่ได้ด้วย `python -I tools/make_icons.py icons`)
- `background.js` — service worker (history.onVisited, tabs.onUpdated/onRemoved, onStartup, alarms)
- `lib/sites.js` — logic ร่วม (normalize domain, match, sweep)
- `lib/ui.js` — UI helpers (segmented control, ปุ่มลบ)
- `lib/i18n.js` — คำแปล (`t`, `tNodes`, `localize`)
- `_locales/` — ข้อความ en / th (เลือกภาษาได้ใน Options; ชื่อ/คำอธิบายใน manifest ตามภาษา browser)
- `fonts/` — Bai Jamjuree, Anuphan, IBM Plex Mono (SIL OFL 1.1, แนบ `OFL-*.txt`) — subset thai+latin,
  ดาวน์โหลดใหม่ได้ด้วย `python -I tools/fetch_fonts.py fonts`
- `popup.*`, `options.*`, `styles.css` — UI (ฟอนต์ของ Windows ไม่โหลดจากเน็ต, รองรับ dark mode)
- `tools/` — `make_icons.py` (ไอคอน/โลโก้), `build_zip.py` (package) — ไม่ถูกใส่ใน zip
- `store/` — โลโก้, ภาพหน้าจอ, `LISTING.md` — ไม่ถูกใส่ใน zip
- `docs/` — หน้าเว็บ GitHub Pages (`index.html`, `privacy.html`) — ไม่ถูกใส่ใน zip

## Performance
- ลบซ้ำเป็นระยะ (default 5 นาที) ค้นเฉพาะช่วงล่าสุด ไม่สแกนประวัติทั้งหมด
- สแกนเต็มแค่ตอนเปิด browser / ติดตั้ง / กด "ลบเดี๋ยวนี้" / เพิ่มเว็บใหม่
- settings cache ใน memory, ลบเป็น batch ละ 50

## ความปลอดภัย
- ไม่มี content script, ไม่มี `externally_connectable`, ไม่มี `web_accessible_resources` → เว็บทั่วไปเข้าถึง/สั่ง extension ไม่ได้
- รับคำสั่งเฉพาะจากหน้าของ extension เอง (เช็ค `sender.id`)
- ไม่มีการเรียก network ใดๆ, ไม่มี `innerHTML`/`eval`, ไม่มี library ภายนอก, ใช้ CSP default ของ MV3
- กันลบเกิน: โดเมนกลางแบบ `co.th`, `go.th`, `com.au`, `co.uk` เพิ่มเข้ารายการไม่ได้
  และต่อให้หลุดเข้ามา `isBlocked()` ก็ไม่ match อะไร (กัน 2 ชั้น)
- ข้อจำกัดที่รู้: รายการเว็บเก็บใน `storage.local` แบบไม่เข้ารหัส (ไม่ sync) — คนที่เข้าถึงไฟล์โปรไฟล์ Windows ได้จะเห็นรายการ;
  popup แจ้งตอนลบแสดงชื่อเว็บบนจอ (ปิดเป็นค่าเริ่มต้น)

## อ้างอิง
- https://developer.chrome.com/docs/extensions/reference/api/history
- https://developer.chrome.com/docs/extensions/reference/api/runtime#event-onStartup
- https://developer.chrome.com/docs/extensions/reference/api/alarms
- https://developer.chrome.com/docs/extensions/reference/api/tabs
- https://developer.chrome.com/docs/extensions/reference/api/storage#property-session
- https://developer.chrome.com/docs/extensions/reference/api/action#badge
- https://developer.chrome.com/docs/extensions/reference/api/action#method-openPopup
- https://github.com/w3c/webextensions/issues/160 (openPopup: ไม่ต้องมี user gesture, ต้องเป็นหน้าต่าง active)
- https://learn.microsoft.com/en-us/microsoft-edge/extensions/developer-guide/api-support
- https://learn.microsoft.com/en-us/microsoft-edge/extensions/publish/publish-extension
- https://learn.microsoft.com/en-us/microsoft-edge/extensions/publish/create-dev-account (ไม่มีค่าสมัคร)
- https://developer.chrome.com/docs/extensions/mv3/i18n-messages
