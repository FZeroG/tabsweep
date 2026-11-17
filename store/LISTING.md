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
- Short description: `Delete history, cookies and cache of only the sites you choose: on visit, when the tab closes or on a schedule. The rest stays.`

**Description:**
```
Ever had to log in to a site you'd rather not keep in your history, then go back and delete it entry by entry? AutoClean History does it for you.

No need to wipe your whole browser. AutoClean History only cleans the sites you choose. The rest of your history, your other logins and your restorable tabs stay exactly as they are.

Add a site once, pick how it should be cleaned, and it's handled automatically:

• Delete on visit — pages from the site are removed from history the moment you open them, so nothing is ever kept.
• Delete on tab close — history stays while you're using the site, and is wiped as soon as you close its last tab. If the browser is closed all at once, leftovers are cleaned at the next start.
• Scheduled clean — optionally clean every listed site every hour, 6 or 12 hours, day or week.

Features
• + cookies (per site, optional): also delete that site's cookies, cache and site data when its last tab closes, so you're signed out too.
• Covers subdomains automatically (youtube.com also covers m.youtube.com and music.youtube.com) without touching look-alike sites.
• "Delete now" button that clearly lists which sites will be cleaned and reports how many items were removed per site.
• Hide site names: the list shows •••••• instead of names, so people looking at your screen can't see them. Click the eye to peek.
• Backup: export your list and settings to a file and import them on another computer, with a preview and Undo.
• Optional counter on the toolbar icon, and an optional popup that shows what was just cleaned, then closes itself.
• A short welcome guide on first install. English and Thai, light and dark themes.

Privacy first
• Runs 100% on your device. No servers, no analytics, no ads, no network requests at all.
• Only deletes data of the sites in your list. Saved passwords are never touched.
• Requests only the permissions it needs.

Note: AutoClean History deletes data stored in your browser. Activity saved in online accounts (for example Google My Activity or your Microsoft account) is managed by those services.
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

ไม่ต้องล้างทั้ง browser — AutoClean History ลบเฉพาะเว็บที่คุณเลือก ส่วนประวัติเว็บอื่น การล็อกอินเว็บอื่น และแท็บที่กู้คืนได้ยังอยู่ครบเหมือนเดิม

เพิ่มเว็บครั้งเดียว เลือกวิธีลบ แล้วที่เหลือทำงานอัตโนมัติ:

• ลบทันทีตอนเข้า — หน้าเว็บจะถูกลบออกจากประวัติทันทีที่เปิด ไม่มีอะไรค้าง
• ลบตอนปิดแท็บ — ระหว่างใช้งานยังเห็นประวัติตามปกติ พอปิดแท็บสุดท้ายของเว็บนั้นก็ลบให้ทันที ถ้าปิด browser ทีเดียวทั้งหมด จะเก็บตกให้ตอนเปิดครั้งถัดไป
• ลบตามเวลา — ตั้งให้ลบทุกเว็บในรายการทุกชั่วโมง ทุก 6 หรือ 12 ชั่วโมง ทุกวัน หรือทุกสัปดาห์ (ไม่บังคับ)

ความสามารถ
• + cookies (เลือกเป็นรายเว็บ): ลบ cookies, cache และข้อมูลเว็บของเว็บนั้นด้วยตอนปิดแท็บสุดท้าย ให้ logout ออกไปด้วยเลย
• ครอบคลุม subdomain อัตโนมัติ (ใส่ youtube.com ก็ครอบคลุม m.youtube.com และ music.youtube.com) โดยไม่โดนเว็บที่ชื่อคล้ายกัน
• ปุ่ม "ลบเดี๋ยวนี้" บอกชัดว่าจะลบเว็บไหนบ้าง และสรุปจำนวนที่ลบแยกรายเว็บ
• ซ่อนชื่อเว็บ: รายการแสดงเป็น •••••• แทนชื่อเว็บ กันคนแอบมองจอ กดรูปตาเพื่อดูชั่วคราว
• สำรองข้อมูล: ส่งออกรายการเว็บและการตั้งค่าเป็นไฟล์ แล้วนำเข้าในเครื่องอื่นได้ มีหน้าตัวอย่างก่อนนำเข้าและปุ่มย้อนกลับ
• ตัวเลขบนไอคอน และ popup แจ้งผลการลบที่ปิดเองได้ (เปิด/ปิดได้)
• หน้าแนะนำการใช้งานตอนติดตั้งครั้งแรก รองรับภาษาไทยและอังกฤษ ทั้งธีมสว่างและมืด

ความเป็นส่วนตัวมาก่อน
• ทำงานในเครื่องของคุณ 100% ไม่มีเซิร์ฟเวอร์ ไม่มีระบบวิเคราะห์ ไม่มีโฆษณา และไม่มีการเชื่อมต่อเครือข่ายเลย
• ลบเฉพาะข้อมูลของเว็บในรายการ ไม่ยุ่งกับรหัสผ่านที่บันทึกไว้
• ขอสิทธิ์เท่าที่จำเป็นเท่านั้น

หมายเหตุ: AutoClean History ลบข้อมูลที่เก็บใน browser ส่วนกิจกรรมที่บันทึกในบัญชีออนไลน์ (เช่น Google My Activity หรือบัญชี Microsoft) ต้องจัดการในบริการนั้นๆ
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
2. Add "example.com" with mode "Delete on visit". Visit https://example.com, then open edge://history — the visit is not listed.
3. Change the mode to "Delete on tab close". Visit https://example.com — the visit appears in edge://history. Close the tab — the entry is removed.
4. "+ cookies" (new in 1.4.0, uses the browsingData permission): turn it on for a site in the list, sign in to that site, close its last tab, then open it again — you are signed out. Cookies are never cleared while the site is open, except when the user clicks "Delete now".
5. "Scheduled clean" (new in 1.4.0) in the Behavior section: choose an interval; every listed site is fully cleaned on that schedule (chrome.alarms).
6. "Delete now" in the popup or options removes all past history of the listed sites and shows a per-site count.
7. "Hide site names" in the Site list section shows names as dots; the eye button reveals them temporarily. Display-only.
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
