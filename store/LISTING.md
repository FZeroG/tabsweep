# TabSweep — ข้อมูลกรอกหน้าร้าน Edge Add-ons (Partner Center)

ไฟล์นี้ใช้ copy ไปวางในแต่ละช่องของ Partner Center
คู่มือทางการ: https://learn.microsoft.com/en-us/microsoft-edge/extensions/publish/publish-extension

> GitHub: https://github.com/FZeroG/tabsweep · Pages: https://fzerog.github.io/tabsweep/

---

## 1. Package
- อัปโหลด `dist/tabsweep-1.2.0.zip` (สร้างด้วย `python -I tools/build_zip.py`)

## 2. Availability
- Visibility: **Public**
- Markets: ทั้งหมด (default)

## 3. Properties
- **Category:** Productivity *(ถ้ามีหมวด privacy/security ใน dropdown ให้เลือกอันนั้นแทน — หนูยังไม่ได้เห็นรายการหมวดจริงของ Edge)*
- **Website:** `https://fzerog.github.io/tabsweep/`
- **Support contact:** `https://github.com/FZeroG/tabsweep/issues`
- **Mature content:** ไม่ติ๊ก

## 4. Privacy

### Single purpose
```
TabSweep deletes the browser history of websites the user explicitly adds to a list, either immediately when a page from that site is visited or when the user closes the site's last tab.
```

### Permission justification
| Permission | Justification (copy) |
|---|---|
| `history` | `Core function: finds and deletes history entries that belong to the domains in the user's list (chrome.history.search / deleteUrl), and removes a page from history as soon as it is visited for sites set to "Delete on visit". History data never leaves the device and is not stored by the extension.` |
| `tabs` | `Needed to read the URL of open tabs so the extension knows when the last tab of a listed site is closed ("Delete on tab close" mode), and to show the current site in the popup. Other tab URLs are only compared and never kept; only the domain names of listed sites are kept, in session storage, and nothing is ever transmitted.` |
| `storage` | `Stores the user's site list and settings locally (chrome.storage.local), and a temporary deleted-items counter for the toolbar badge (chrome.storage.session).` |
| `alarms` | `Runs a light periodic re-sweep (user-configurable interval, default 5 minutes) that only scans recent history, in case any entry was missed.` |

### Are you using remote code?
- **No, I am not using remote code.** (ไม่มีโค้ดจากภายนอก ไม่มี network request เลย)

### Data usage
- ประเภทข้อมูล: ติ๊ก **Web history** *(extension อ่านประวัติเพื่อลบ แม้จะไม่ส่งออกนอกเครื่อง — หนูแนะนำให้เปิดเผยไว้ตรงๆ เพราะเอกสารเน้นว่าต้องตรงกับพฤติกรรมจริง ถ้าแบบฟอร์มมีคำอธิบายว่า "collect = ส่งออกนอกเครื่อง" ค่อยพิจารณาใหม่)*
- ติ๊ก certification ทุกข้อ (ไม่ขาย / ไม่ใช้นอกวัตถุประสงค์ / ไม่ใช้ประเมินเครดิต) — ตรงกับพฤติกรรมจริงทั้งหมด

### Privacy policy URL
```
https://fzerog.github.io/tabsweep/privacy.html
```

---

## 5. Store listing — English (en)

**Extension name / Short description:** มาจาก manifest อัตโนมัติ (แก้ในหน้าร้านไม่ได้)
- Name: `TabSweep: Site History Cleaner`
- Short description: `Auto-delete browsing history for the sites you choose: instantly on visit, or when you close the tab. Works offline.`

**Description:**
```
Keep chosen websites out of your browsing history — automatically.

Add a site once, pick how it should be cleaned, and TabSweep takes care of the rest:

• Delete on visit — pages from the site are removed from history the moment you open them, so nothing is ever kept. TabSweep also re-sweeps when you close the tab and on a light schedule, in case anything slips through.
• Delete on tab close — history stays while you're using the site, and is wiped as soon as you close its last tab. If the browser is closed all at once, leftovers are cleaned at the next start.

Features
• Covers subdomains automatically (youtube.com also covers m.youtube.com and music.youtube.com) without touching look-alike sites.
• "Delete now" button that clearly lists which sites will be cleaned and reports how many items were removed per site.
• Optional counter on the toolbar icon, and an optional popup that drops down to show what was just cleaned, then closes itself.
• Clean, simple interface in English and Thai, with light and dark themes.

Privacy first
• Runs 100% on your device. No servers, no analytics, no ads, no network requests at all.
• Deletes browsing history only — cookies, cache and saved passwords are not touched.
• Requests only the permissions it needs.

Note: TabSweep deletes the history stored in your browser. Activity saved in online accounts (for example Google My Activity or your Microsoft account) is managed by those services.
```

**Search terms** (สูงสุด 7 คำ/วลี, วลีละ ≤30 ตัวอักษร, รวม ≤21 คำ):
```
history cleaner
delete history
auto delete history
privacy
clear browsing history
tab close
site history
```

**Logo:** `store/logo300.png`
**Screenshots (1280×800):** `store/screenshot-1-popup-en.png`, `store/screenshot-2-banner-en.png`, `store/screenshot-3-options-en.png`

---

## 6. Store listing — Thai (th)

- Name (จาก manifest): `TabSweep: ลบประวัติเฉพาะเว็บที่เลือก`
- Short description (จาก manifest): `ลบประวัติการเข้าเว็บเฉพาะเว็บที่เลือกให้อัตโนมัติ ทันทีตอนเข้า หรือตอนปิดแท็บ ทำงานในเครื่อง ไม่ส่งข้อมูลออก`

**Description:**
```
ไม่ให้เว็บที่คุณเลือกค้างอยู่ในประวัติการเข้าเว็บ — แบบอัตโนมัติ

เพิ่มเว็บครั้งเดียว เลือกวิธีลบ แล้ว TabSweep จัดการให้ที่เหลือ:

• ลบทันทีตอนเข้า — หน้าเว็บจะถูกลบออกจากประวัติทันทีที่เปิด ไม่มีอะไรค้าง และยังกวาดซ้ำตอนปิดแท็บกับตามรอบเวลาเบาๆ เผื่อมีรายการหลุด
• ลบตอนปิดแท็บ — ระหว่างใช้งานยังเห็นประวัติตามปกติ พอปิดแท็บสุดท้ายของเว็บนั้นก็ลบให้ทันที ถ้าปิด browser ทีเดียวทั้งหมด จะเก็บตกให้ตอนเปิดครั้งถัดไป

ความสามารถ
• ครอบคลุม subdomain อัตโนมัติ (ใส่ youtube.com ก็ครอบคลุม m.youtube.com และ music.youtube.com) โดยไม่โดนเว็บที่ชื่อคล้ายกัน
• ปุ่ม "ลบเดี๋ยวนี้" บอกชัดว่าจะลบเว็บไหนบ้าง และสรุปจำนวนที่ลบแยกรายเว็บ
• ตัวเลขบนไอคอน และ popup แจ้งผลการลบที่เลื่อนลงมาแล้วปิดเอง (เปิด/ปิดได้)
• หน้าตาเรียบง่าย รองรับภาษาไทยและอังกฤษ ทั้งธีมสว่างและมืด

ความเป็นส่วนตัวมาก่อน
• ทำงานในเครื่องของคุณ 100% ไม่มีเซิร์ฟเวอร์ ไม่มีระบบวิเคราะห์ ไม่มีโฆษณา และไม่มีการเชื่อมต่อเครือข่ายเลย
• ลบเฉพาะประวัติการเข้าเว็บ — ไม่ยุ่งกับ cookies, cache หรือรหัสผ่านที่บันทึกไว้
• ขอสิทธิ์เท่าที่จำเป็นเท่านั้น

หมายเหตุ: TabSweep ลบประวัติที่เก็บใน browser ส่วนกิจกรรมที่บันทึกในบัญชีออนไลน์ (เช่น Google My Activity หรือบัญชี Microsoft) ต้องจัดการในบริการนั้นๆ
```

**Search terms:**
```
ลบประวัติ
ลบประวัติอัตโนมัติ
history cleaner
ความเป็นส่วนตัว
ลบประวัติเว็บ
ปิดแท็บ
privacy
```

**Logo:** `store/logo300.png` (ใช้ Duplicate ได้)
**Screenshots:** `store/screenshot-1-popup-th.png`, `store/screenshot-2-banner-th.png`, `store/screenshot-3-options-th.png`

---

## 7. Notes for certification
```
TabSweep has no login and no network access.

How to test:
1. Open the extension options (right-click the toolbar icon > Extension options).
2. Add "example.com" with mode "Delete on visit". Visit https://example.com, then open edge://history — the visit is not listed.
3. Change the mode to "Delete on tab close". Visit https://example.com — the visit appears in edge://history. Close the tab — the entry is removed.
4. "Delete now" in the popup or options removes all past history of the listed sites and shows a per-site count.
5. Optional: enable "Show a popup when deleting" and click "Test popup". It uses chrome.action.openPopup() and only opens while the browser window is focused.

The UI is available in English and Thai (follows the browser language).
```

---

## 8. GitHub Pages
- Repository: https://github.com/FZeroG/tabsweep (Public, source ทั้ง extension ยกเว้น `dist/`)
- Pages: Settings → Pages → *Deploy from a branch* → `main` / `/docs`
- Privacy policy: https://fzerog.github.io/tabsweep/privacy.html
- อัปเดตหน้าเว็บ: แก้ไฟล์ใน `docs/` → commit → push แล้วรอ 1–2 นาที

คู่มือ GitHub Pages: https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site
