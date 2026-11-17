# AutoClean History — ข้อมูลกรอกหน้าร้าน Edge Add-ons (Partner Center)

ไฟล์นี้ใช้ copy ไปวางในแต่ละช่องของ Partner Center
คู่มือทางการ: https://learn.microsoft.com/en-us/microsoft-edge/extensions/publish/publish-extension

> GitHub: https://github.com/FZeroG/tabsweep · Pages: https://fzerog.github.io/tabsweep/

---

## 1. Package
- อัปโหลด `dist/tabsweep-1.4.0.zip` (สร้างด้วย `python -I tools/build_zip.py`)

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
AutoClean History deletes the browsing history (and, if the user turns it on per site, the cookies and cache) of websites the user explicitly adds to a list: when a page from that site is visited, when the site's last tab is closed, or on a user-chosen schedule.
```

### Permission justification
| Permission | Justification (copy) |
|---|---|
| `history` | `Core function: finds and deletes history entries that belong to the domains in the user's list (chrome.history.search / deleteUrl), and removes a page from history as soon as it is visited for sites set to "Delete on visit". History data never leaves the device and is not stored by the extension.` |
| `tabs` | `Needed to read the URL of open tabs so the extension knows when the last tab of a listed site is closed ("Delete on tab close" mode, and so it never clears cookies of a site that is still open), and to show the current site in the popup. Other tab URLs are only compared and never kept; only the domain names of listed sites are kept, in session storage, and nothing is ever transmitted.` |
| `storage` | `Stores the user's site list and settings locally (chrome.storage.local), and a temporary deleted-items counter for the toolbar badge (chrome.storage.session).` |
| `alarms` | `Runs a light periodic re-sweep of recent history (default every 5 minutes), and the optional scheduled clean the user chooses (hourly to weekly).` |
| `browsingData` | `Optional per-site feature: when the user turns on "+ cookies" for a site in their list, the extension calls chrome.browsingData.remove with that site's origins to delete its cookies, cache and site storage when the site's last tab closes, on "Delete now", or on the user's schedule. It never reads this data and never touches other sites.` |

### Are you using remote code?
- **No, I am not using remote code.** (ไม่มีโค้ดจากภายนอก ไม่มี network request เลย)

### Data usage
- ประเภทข้อมูล: ติ๊ก **Web history** *(extension อ่านประวัติเพื่อลบ แม้จะไม่ส่งออกนอกเครื่อง — หนูแนะนำให้เปิดเผยไว้ตรงๆ เพราะเอกสารเน้นว่าต้องตรงกับพฤติกรรมจริง)* — `browsingData` แค่สั่งลบ ไม่ได้อ่าน/เก็บ จึงไม่ต้องติ๊กเพิ่ม
- ติ๊ก certification ทุกข้อ (ไม่ขาย / ไม่ใช้นอกวัตถุประสงค์ / ไม่ใช้ประเมินเครดิต) — ตรงกับพฤติกรรมจริงทั้งหมด

### Privacy policy URL
```
https://fzerog.github.io/tabsweep/privacy.html
```

---

## 5. Store listing — English (en)

**Extension name / Short description:** มาจาก manifest อัตโนมัติ (แก้ในหน้าร้านไม่ได้)
- Name: `AutoClean History: Delete Chosen Sites`
- Short description: `Delete history, cookies and cache of the sites you choose: on visit, on tab close or on a schedule. Other sites stay.`

**Description:**
```
Ever had to log in to a site you'd rather not keep in your history, then go back and delete it entry by entry? AutoClean History does it for you.

You pick the sites. AutoClean History cleans those and leaves the rest of your history, your other logins and your restorable tabs alone.

Add a site once and choose a mode:

• Delete on visit: AutoClean History removes each page from history as you open it.
• Delete on tab close: you keep the history while you use the site. When you close its last tab, AutoClean History deletes it. If you close the whole browser at once, it cleans up at the next start.
• Scheduled clean (optional): cleans every listed site every hour, 6 or 12 hours, day or week.

Features
• + cookies (per site, optional): also deletes that site's cookies, cache and site data when its last tab closes, so you sign out too.
• Covers subdomains: youtube.com includes m.youtube.com and music.youtube.com, and leaves look-alike sites alone.
• "Delete now" lists the sites it will clean and tells you how many items it removed from each.
• Hide sites: hide some or all of your sites from people looking at your screen. Hidden sites show as •••••• in settings and stay out of the popup. Set a password if you want one.
• Backup: export your list and settings to a file and import them on another computer, with a preview and Undo.
• A counter on the toolbar icon and a popup that shows what it cleaned, both optional.
• A welcome guide on first install. English and Thai, light and dark themes.

Privacy
• Runs on your device and makes no network requests. Your list never leaves your computer.
• Deletes data of the sites in your list. Your saved passwords stay.
• Uses five permissions, each explained in the privacy policy.

Note: AutoClean History deletes data stored in your browser. Google My Activity and your Microsoft account keep their own activity, so manage that on their sites.
```

**Search terms** (สูงสุด 7 คำ/วลี, วลีละ ≤30 ตัวอักษร, รวม ≤21 คำ):
```
auto delete history
history cleaner
delete site history
delete cookies on close
privacy
clear browsing history
auto clean
```

**Logo:** `store/logo300.png`
**Screenshots (1280×800):** `store/screenshot-1-popup-en.png`, `store/screenshot-2-banner-en.png`, `store/screenshot-3-options-en.png`, `store/screenshot-4-hide-en.png`

---

## 6. Store listing — Thai (th)

- Name (จาก manifest): `AutoClean History: Delete Chosen Sites` (ชื่อเดียวกันทุกภาษา)
- Short description (จาก manifest): ข้อความภาษาอังกฤษเดียวกับด้านบน (คำอธิบายยาวด้านล่างเป็นภาษาไทยได้)

**Description:**
```
ลำบากไหม ทุกครั้งที่ต้องล็อกอินเว็บที่ไม่อยากให้มีในประวัติ แล้วต้องมานั่งไล่ลบทีละรายการ? AutoClean History ช่วยจัดการให้

คุณเลือกเว็บเอง AutoClean History ลบแค่เว็บเหล่านั้น ประวัติเว็บอื่น การล็อกอินเว็บอื่น และแท็บที่กู้คืนได้ยังอยู่ครบ

เพิ่มเว็บครั้งเดียวแล้วเลือกโหมด:

• ลบทันทีตอนเข้า: ลบหน้าเว็บออกจากประวัติตอนที่คุณเปิด
• ลบตอนปิดแท็บ: ระหว่างใช้ยังเห็นประวัติ พอปิดแท็บสุดท้ายก็ลบให้ ถ้าปิด browser ทีเดียวทั้งหมด จะเก็บตกตอนเปิดครั้งถัดไป
• ลบตามเวลา (ไม่บังคับ): ลบทุกเว็บในรายการทุกชั่วโมง ทุก 6 หรือ 12 ชั่วโมง ทุกวัน หรือทุกสัปดาห์

ความสามารถ
• + cookies (เลือกเป็นรายเว็บ): ลบ cookies, cache และข้อมูลเว็บด้วยตอนปิดแท็บสุดท้าย คุณจะ logout จากเว็บนั้นไปด้วย
• ครอบคลุม subdomain: ใส่ youtube.com ก็รวม m.youtube.com และ music.youtube.com แต่ไม่ยุ่งกับเว็บชื่อคล้าย
• ปุ่ม "ลบเดี๋ยวนี้" บอกว่าจะลบเว็บไหน และลบไปกี่รายการต่อเว็บ
• ซ่อนเว็บ: ซ่อนบางเว็บหรือทุกเว็บ กันคนแอบมองจอ เว็บที่ซ่อนแสดงเป็น •••••• ในหน้าตั้งค่า และไม่โผล่ใน popup ตั้งรหัสผ่านไว้เปิดดูได้
• สำรองข้อมูล: ส่งออกรายการและการตั้งค่าเป็นไฟล์ แล้วนำเข้าในเครื่องอื่น มีหน้าตัวอย่างและปุ่มย้อนกลับ
• ตัวเลขบนไอคอน และ popup บอกผลการลบ เปิดหรือปิดได้
• หน้าแนะนำตอนติดตั้งครั้งแรก มีภาษาไทยและอังกฤษ ธีมสว่างและมืด

ความเป็นส่วนตัว
• ทำงานในเครื่องคุณ ไม่เชื่อมต่อเครือข่าย รายการเว็บไม่ออกจากเครื่อง
• ลบเฉพาะข้อมูลของเว็บในรายการ รหัสผ่านที่บันทึกไว้อยู่ครบ
• ใช้สิทธิ์ 5 อย่าง อธิบายไว้ทุกอย่างในนโยบายความเป็นส่วนตัว

หมายเหตุ: AutoClean History ลบข้อมูลใน browser ส่วนกิจกรรมใน Google My Activity หรือบัญชี Microsoft ต้องจัดการที่เว็บของบริการนั้น
```

**Search terms:**
```
ลบประวัติอัตโนมัติ
ลบประวัติ
ลบประวัติเว็บ
ลบ cookies
history cleaner
ความเป็นส่วนตัว
auto delete history
```

**Logo:** `store/logo300.png` (ใช้ Duplicate ได้)
**Screenshots:** `store/screenshot-1-popup-th.png`, `store/screenshot-2-banner-th.png`, `store/screenshot-3-options-th.png`, `store/screenshot-4-hide-th.png`

---

## 7. Notes for certification
```
AutoClean History has no login and no network access.

How to test:
1. Installing opens the options page with a short welcome guide (options.html?welcome=1). Options can also be opened via right-click on the toolbar icon > Extension options.
2. Add "example.com" with mode "Delete on visit". Visit https://example.com, then open edge://history. The visit is not listed.
3. Change the mode to "Delete on tab close". Visit https://example.com and the visit appears in edge://history. Close the tab and the entry disappears.
4. "+ cookies" (new in 1.4.0, uses the browsingData permission): turn it on for a site in the list, sign in to that site, close its last tab, then open it again. You are signed out. Cookies are never cleared while the site is open, except when the user clicks "Delete now".
5. "Scheduled clean" (new in 1.4.0) in the Behavior section: choose an interval; every listed site is fully cleaned on that schedule (chrome.alarms).
6. "Delete now" in the popup or options removes all past history of the listed sites and shows a per-site count.
7. Site list section: "Hide all sites" or the per-site "Hide" switch shows names as dots and leaves those sites out of the popup; the eye button reveals them temporarily. Optional password ("Set password"): stored only as a salted PBKDF2 hash in chrome.storage.local, required to reveal, unhide, import or export. Display-only; deletion is unchanged.
8. "Backup" section: "Export to file" saves a JSON file locally (Blob + download link, no downloads permission, nothing sent anywhere). "Import from file" reads a user-selected JSON file, validates it, and shows a preview; nothing is saved until "Import" is clicked, and Undo is offered afterwards.

The extension was renamed from "TabSweep" to "AutoClean History" in 1.4.0. New permission: browsingData (used only for the optional per-site "+ cookies" feature).

The UI is available in English and Thai (follows the browser language, or can be changed in Options).
```

---

## 8. GitHub Pages
- Repository: https://github.com/FZeroG/tabsweep (Public, source ทั้ง extension ยกเว้น `dist/`)
- Pages: Settings → Pages → *Deploy from a branch* → `main` / `/docs`
- Privacy policy: https://fzerog.github.io/tabsweep/privacy.html
- อัปเดตหน้าเว็บ: แก้ไฟล์ใน `docs/` → commit → push แล้วรอ 1–2 นาที

คู่มือ GitHub Pages: https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site
