import {
  getSettings,
  findSite,
  sweep,
  sweepDomain,
  trackUrl,
  closeTab,
  newlyVisit,
  badgeText,
  saveSettings,
  nextScheduleTime,
  rememberHost,
  clearSiteData,
  idleDataSites,
} from "./lib/sites.js";

const ALARM = "hc-sweep";
const SCHEDULE_ALARM = "hc-schedule";
const BOOT_DATA_DELAY_MS = 10_000; // รอแท็บที่ browser restore กลับมาก่อน ค่อยเช็กว่าเว็บไหนไม่ได้เปิดอยู่
const BADGE_COLOR = "#e8461b";
const NOTIFY_DEBOUNCE_MS = 2000;            // รวมการลบที่ติดกันเป็น popup เดียว
const NOTIFY_THROTTLE_MS = 5 * 60_000;      // โหมด visit: เว็บเดียวกันเด้งได้ทุก 5 นาที

function safe(promise) {
  promise.catch((err) => console.error("[AutoClean]", err));
}

// ---- Settings cache: onVisited / onUpdated ยิงบ่อยมาก ไม่ต้องอ่าน storage ทุกครั้ง ----
let settingsPromise = null;
const settings = () => (settingsPromise ??= getSettings());

async function scheduleAlarm() {
  const { sweepMinutes } = await settings();
  await chrome.alarms.create(ALARM, { periodInMinutes: sweepMinutes });
}

// ======================= ลบตามเวลา =======================
// alarm ตั้งด้วย when = รอบล่าสุด + ระยะ (ไม่ใช่นับใหม่ทุกครั้งที่เปิด browser)
async function scheduleCleanup() {
  const { schedule, lastScheduledAt } = await getSettings();
  await chrome.alarms.clear(SCHEDULE_ALARM);
  if (!schedule) return;
  let last = lastScheduledAt;
  if (!last || last > Date.now()) {
    last = Date.now();
    await saveSettings({ lastScheduledAt: last });
  }
  const when = nextScheduleTime(last, schedule);
  await chrome.alarms.create(SCHEDULE_ALARM, { when, periodInMinutes: schedule });
}

async function runScheduled() {
  await saveSettings({ lastScheduledAt: Date.now() });
  const { total, byDomain } = await sweep();
  addDeleted(total);
  await clearIdleSiteData();
  if (total) await announce("schedule", byDomain);
}

// ======================= ลบ cookies / ข้อมูลเว็บ =======================
// host ย่อยที่เคยเปิด เก็บใน session (ล้างเองตอนปิด browser)
let hostsPromise = null;
const getDataHosts = () =>
  (hostsPromise ??= chrome.storage.session.get("dataHosts").then((r) => r.dataHosts ?? {}));

async function clearIdleSiteData() {
  const [{ sites }, tabs, hosts] = await Promise.all([settings(), chrome.tabs.query({}), getDataHosts()]);
  const openUrls = tabs.flatMap((t) => [t.url, t.pendingUrl]).filter(Boolean);
  return clearSiteData(idleDataSites(sites, openUrls), hosts);
}

// ======================= Badge (ตัวเลขบนไอคอน) =======================
// นับจำนวน URL ที่ลบตั้งแต่เปิด browser (storage.session ล้างเองตอนปิด browser)

let countChain = chrome.storage.session.get("deletedCount").then((r) => r.deletedCount ?? 0);

async function renderBadge(count) {
  const { showBadge } = await settings();
  await chrome.action.setBadgeText({ text: showBadge ? badgeText(count) : "" });
}

function addDeleted(n) {
  if (!n) return;
  countChain = countChain.then(async (c) => {
    const next = c + n;
    try {
      await chrome.storage.session.set({ deletedCount: next });
      await renderBadge(next);
    } catch (err) {
      console.error("[AutoClean] badge", err); // ไม่ให้ chain พัง
    }
    return next;
  });
}

safe(chrome.action.setBadgeBackgroundColor({ color: BADGE_COLOR }));
safe(chrome.action.setBadgeTextColor?.({ color: "#ffffff" }) ?? Promise.resolve());

// ======================= แจ้งเตือน: เปิด popup ของ extension เอง =======================
// บันทึกเหตุการณ์ล่าสุดไว้ให้ popup อ่าน แล้วสั่งเปิด popup (chrome.action.openPopup, Chrome 127+)
// ถ้าหน้าต่าง Edge ไม่ได้ active อยู่ (ย่อ/สลับไปโปรแกรมอื่น) จะเปิดไม่ได้ -> เงียบไว้

async function openPopup() {
  if (typeof chrome.action.openPopup !== "function") throw new Error(chrome.i18n.getMessage("popupUnsupported"));
  await chrome.action.openPopup();
}

// reason: "visit" | "close" | "boot" | "test", items: [{ domain, count }]
async function announce(reason, items) {
  await chrome.storage.session.set({ lastEvent: { reason, items, at: Date.now() } });
  if (!(await settings()).notify) return;
  try {
    await openPopup();
  } catch (err) {
    console.debug("[AutoClean] เปิด popup ไม่ได้:", String(err));
  }
}

// โหมด visit ลบบ่อยมาก (ทุกหน้าที่เข้า) -> รวมเป็นก้อนแล้วเด้งแบบจำกัดความถี่
const pending = new Map();      // domain -> count
const lastNotified = new Map(); // domain -> ms
let flushTimer = 0;

function queueNotify(domain, count) {
  pending.set(domain, (pending.get(domain) ?? 0) + count);
  clearTimeout(flushTimer);
  flushTimer = setTimeout(() => safe(flushNotify()), NOTIFY_DEBOUNCE_MS);
}

async function flushNotify() {
  const now = Date.now();
  const items = [];
  for (const [domain, count] of pending) {
    if (now - (lastNotified.get(domain) ?? 0) < NOTIFY_THROTTLE_MS) continue;
    lastNotified.set(domain, now);
    items.push({ domain, count });
  }
  pending.clear();
  if (items.length) await announce("visit", items);
}

// ======================= Tab tracking =======================
// เก็บใน storage.session เพราะ service worker ถูกปิด/เปิดใหม่ได้ตลอด
// ใช้ object ตัวเดียวใน memory ร่วมกันทุก event จะได้ไม่มี race ตอน read-modify-write
let tabMapPromise = null;
const getTabMap = () =>
  (tabMapPromise ??= chrome.storage.session.get("tabMap").then((r) => r.tabMap ?? {}));

async function saveTabMap() {
  await chrome.storage.session.set({ tabMap: await getTabMap() });
}

// track แท็บที่เปิดอยู่แล้ว (ตอนติดตั้ง / เปิด browser / เพิ่มเว็บใหม่)
async function seedOpenTabs() {
  const [{ sites }, tabMap, tabs] = await Promise.all([
    settings(),
    getTabMap(),
    chrome.tabs.query({}),
  ]);
  if (sites.length === 0) return;
  let changed = false;
  for (const tab of tabs) {
    if (tab.url && trackUrl(tabMap, tab.id, tab.url, sites)) changed = true;
  }
  if (changed) await saveTabMap();
}

// ======================= Events =======================

// 1) เข้าเว็บโหมด "visit" -> ลบ URL นั้นทันที
chrome.history.onVisited.addListener((item) => {
  safe(
    (async () => {
      const { sites } = await settings();
      const site = findSite(item.url, sites);
      if (site?.mode !== "visit") return;
      await chrome.history.deleteUrl({ url: item.url });
      addDeleted(1);
      queueNotify(site.domain, 1);
    })()
  );
});

// 2) แท็บเปลี่ยน URL -> จำไว้ว่าแท็บนี้เปิดเว็บในรายการ
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (!changeInfo.url) return;
  safe(
    (async () => {
      const { sites } = await settings();
      if (sites.length === 0) return;
      if (trackUrl(await getTabMap(), tabId, changeInfo.url, sites)) await saveTabMap();
      const site = findSite(changeInfo.url, sites);
      if (site?.data === true) {
        const hosts = await getDataHosts();
        if (rememberHost(hosts, site.domain, changeInfo.url)) await chrome.storage.session.set({ dataHosts: hosts });
      }
    })()
  );
});

// 3) ปิดแท็บ -> close: ลบประวัติเว็บนั้นทั้งหมด / visit: กวาดซ้ำช่วงที่เปิดแท็บ
//    (ถ้ายังมีแท็บอื่นเปิดเว็บเดียวกันอยู่ จะรอลบตอนปิดแท็บสุดท้าย)
chrome.tabs.onRemoved.addListener((tabId) => {
  safe(
    (async () => {
      const tabMap = await getTabMap();
      if (!tabMap[tabId]) return; // แท็บทั่วไป ไม่ต้องทำอะไร
      const [{ sites }, tabs] = await Promise.all([settings(), chrome.tabs.query({})]);
      const openUrls = tabs.filter((t) => t.id !== tabId && t.url).map((t) => t.url);
      const jobs = closeTab(tabMap, tabId, openUrls, sites);
      await saveTabMap();
      const closed = [];
      for (const job of jobs) {
        const count = await sweepDomain(job.domain, { startTime: job.startTime });
        addDeleted(count);
        if (count && job.mode === "close") closed.push({ domain: job.domain, count });
        else if (count) queueNotify(job.domain, count);
      }
      // แท็บสุดท้ายของเว็บที่เปิด "ลบ cookies" ปิดแล้ว → ลบ cookies/cache/ข้อมูลเว็บ (ไม่ลบตอนเข้าเว็บ ไม่งั้นจะ logout ระหว่างใช้)
      const dataDomains = jobs
        .filter((job) => sites.some((s) => s.domain === job.domain && s.data === true))
        .map((job) => job.domain);
      if (dataDomains.length) await clearSiteData(dataDomains, await getDataHosts());
      if (closed.length) await announce("close", closed);
    })()
  );
});

// 4) ติดตั้ง / เปิด browser -> ลบทุกเว็บในรายการแบบเต็ม (ครั้งเดียว)
//    เก็บตกแท็บที่ปิดไปตอนปิด browser ซึ่ง service worker อาจลบไม่ทัน
function onBoot() {
  safe(scheduleAlarm());
  safe(scheduleCleanup());
  safe(countChain.then(renderBadge));
  safe(
    (async () => {
      const { total, byDomain } = await sweep();
      addDeleted(total);
      if (total) await announce("boot", byDomain);
      await seedOpenTabs();
    })()
  );
  // cookies ที่ค้างจากการปิด browser ทีเดียวทั้งหมด — รอให้แท็บที่ restore กลับมาก่อน แล้วข้ามเว็บที่เปิดอยู่
  setTimeout(() => safe(clearIdleSiteData()), BOOT_DATA_DELAY_MS);
}
chrome.runtime.onInstalled.addListener(onBoot);
chrome.runtime.onStartup.addListener(onBoot);

// ติดตั้งครั้งแรก → เปิดหน้าต้อนรับ
chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === "install") safe(chrome.tabs.create({ url: chrome.runtime.getURL("options.html?welcome=1") }));
});

// 5) ลบซ้ำเป็นระยะ (เว็บโหมด "visit") — ค้นเฉพาะช่วงล่าสุด ไม่สแกนประวัติทั้งหมด
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === SCHEDULE_ALARM) return safe(runScheduled());
  if (alarm.name !== ALARM) return;
  safe(
    (async () => {
      const { sweepMinutes } = await settings();
      const startTime = Date.now() - (sweepMinutes * 2 + 5) * 60_000;
      const { total, byDomain } = await sweep("visit", { startTime });
      addDeleted(total);
      for (const d of byDomain) queueNotify(d.domain, d.count);
    })()
  );
});

// ตั้งค่าเปลี่ยน -> ล้าง cache, อัปเดต alarm/badge, sweep เฉพาะเว็บที่เพิ่งเป็นโหมด visit
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  settingsPromise = null;
  if (changes.sweepMinutes) safe(scheduleAlarm());
  if (changes.schedule) safe(scheduleCleanup());
  if (changes.showBadge) safe(countChain.then(renderBadge));
  if (changes.sites) {
    for (const d of newlyVisit(changes.sites.oldValue, changes.sites.newValue)) {
      safe(sweepDomain(d).then(addDeleted));
    }
    safe(seedOpenTabs());
  }
});

// 6) ปุ่ม "ลบเดี๋ยวนี้" / ปุ่มทดสอบแจ้งเตือน จาก popup/options (รับเฉพาะหน้าของ extension นี้)
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (sender.id !== chrome.runtime.id) return;
  if (msg?.type === "sweepNow") {
    (async () => {
      const res = await sweep(msg.mode);
      addDeleted(res.total);
      // ผู้ใช้กดเอง → ลบ cookies ของเว็บที่เปิด "ลบ cookies" ด้วย แม้แท็บยังเปิดอยู่
      const { sites } = await settings();
      const dataCleared = await clearSiteData(
        sites.filter((s) => s.data === true && (!msg.mode || s.mode === msg.mode)).map((s) => s.domain),
        await getDataHosts()
      );
      return { ...res, dataCleared };
    })().then(
      (res) => sendResponse({ ok: true, ...res }),
      (err) => sendResponse({ ok: false, error: String(err) })
    );
    return true; // ตอบกลับแบบ async
  }
  if (msg?.type === "testPopup") {
    chrome.storage.session
      .set({ lastEvent: { reason: "test", items: [{ domain: "example.com", count: 3 }], at: Date.now() } })
      .then(openPopup)
      .then(() => sendResponse({ ok: true }), (err) => sendResponse({ ok: false, error: err.message ?? String(err) }));
    return true;
  }
});
