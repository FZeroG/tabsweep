// Shared logic: ใช้ร่วมกันใน background, popup, options
// โหมด: "visit" = ลบทันทีตอนเข้า, "close" = ลบตอนปิดแท็บ (ชื่อที่แสดงอยู่ใน _locales)

// site = { domain, mode, data?: true }  (data = ลบ cookies/cache/ข้อมูลเว็บด้วย)
export const DEFAULTS = {
  sites: [], sweepMinutes: 5, showBadge: true, notify: false, lang: "auto", hideNames: false,
  schedule: 0, lastScheduledAt: 0,
};

// ลบตามเวลา (นาที): 0 = ปิด
export const SCHEDULES = [0, 60, 360, 720, 1440, 10080];

const HOST_RE =
  /^(?=.{1,253}$)[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/;

// "https://www.YouTube.com/watch?v=x" -> "youtube.com", input ผิดรูป -> null
export function normalizeDomain(input) {
  if (typeof input !== "string") return null;
  let s = input.trim().toLowerCase();
  if (!s) return null;
  if (!/^[a-z][a-z0-9+.-]*:\/\//.test(s)) s = "http://" + s;
  let host;
  try {
    host = new URL(s).hostname;
  } catch {
    return null;
  }
  host = host.replace(/\.$/, "").replace(/^www\./, "");
  return HOST_RE.test(host) ? host : null;
}

export function hostOf(url) {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

// โซนโดเมนที่เป็นของทั้งประเทศ/ทั้งกลุ่ม เช่น co.th, go.th, com.au, co.uk
// ถ้าใส่เข้ารายการจะลบประวัติหลายพันเว็บ (เช่นทุกธนาคาร .co.th) -> ไม่อนุญาต
const ZONE_LABELS = new Set([
  "ac", "co", "com", "edu", "go", "gob", "gov", "in", "ltd", "me", "mi", "ne", "net", "nic", "or", "org", "plc", "sch",
]);
export function isTooBroad(domain) {
  if (typeof domain !== "string" || !domain.includes(".")) return true;
  const [label, tld, ...rest] = domain.split(".");
  return rest.length === 0 && tld.length === 2 && ZONE_LABELS.has(label);
}

// ตรง domain เองหรือ subdomain (m.youtube.com) แต่ไม่โดน notyoutube.com
// domain ที่กว้างเกิน (isTooBroad) จะไม่ match อะไรเลย — กันลบเกินแม้จะหลุดเข้ารายการมาได้
export function isBlocked(url, domain) {
  if (isTooBroad(domain)) return false;
  const host = hostOf(url);
  return !!host && (host === domain || host.endsWith("." + domain));
}

export function findSite(url, sites) {
  return sites.find((s) => isBlocked(url, s.domain));
}

// ---- Tab tracking (ลบตอนปิดแท็บ) ----
// tabMap = { [tabId]: { "youtube.com": เวลาที่แท็บนี้เข้าเว็บครั้งแรก(ms) } }
// track ทุกโหมด: "close" = ลบตอนปิดแท็บ, "visit" = กวาดซ้ำตอนปิดแท็บเผื่อหลุด

// บันทึกว่าแท็บนี้เข้าเว็บในรายการ; คืน true ถ้า map เปลี่ยน
export function trackUrl(tabMap, tabId, url, sites, now = Date.now()) {
  const site = findSite(url, sites);
  if (!site) return false;
  let entry = tabMap[tabId];
  if (Array.isArray(entry)) entry = Object.fromEntries(entry.map((d) => [d, 0])); // format เก่า
  entry ??= {};
  if (site.domain in entry) return false;
  tabMap[tabId] = { ...entry, [site.domain]: now };
  return true;
}

// แท็บถูกปิด: เอาออกจาก map แล้วคืนงานที่ต้องลบ [{ domain, mode, startTime }]
// - ข้ามถ้าเว็บถูกเอาออกจากรายการแล้ว หรือยังมีแท็บอื่นเปิดเว็บนั้นค้างอยู่
// - close: ลบทั้งหมด (startTime 0) / visit: ค้นแค่ช่วงตั้งแต่แท็บเข้าเว็บ (เบา)
export function closeTab(tabMap, tabId, openUrls, sites) {
  let entry = tabMap[tabId] ?? {};
  if (Array.isArray(entry)) entry = Object.fromEntries(entry.map((d) => [d, 0]));
  delete tabMap[tabId];
  const jobs = [];
  for (const [domain, since] of Object.entries(entry)) {
    const site = sites.find((s) => s.domain === domain);
    if (!site || openUrls.some((u) => isBlocked(u, domain))) continue;
    jobs.push({
      domain,
      mode: site.mode,
      startTime: site.mode === "visit" ? Math.max(0, since - 60_000) : 0,
    });
  }
  return jobs;
}

export async function getSettings() {
  const s = await chrome.storage.local.get(DEFAULTS);
  return {
    sites: Array.isArray(s.sites) ? s.sites : [],
    sweepMinutes: Math.max(1, Math.floor(Number(s.sweepMinutes)) || 1),
    showBadge: s.showBadge !== false,
    notify: s.notify === true,
    lang: ["auto", "th", "en"].includes(s.lang) ? s.lang : "auto",
    hideNames: s.hideNames === true,
    schedule: SCHEDULES.includes(s.schedule) ? s.schedule : 0,
    lastScheduledAt: Number.isFinite(s.lastScheduledAt) ? s.lastScheduledAt : 0,
  };
}

// ---- ลบตามเวลา ----
// เวลารอบถัดไป (ms) — รอบไม่รีเซ็ตตอนเปิด browser ใหม่: เลยรอบแล้วคืน now (ทำทันที)
export function nextScheduleTime(last, periodMinutes, now = Date.now()) {
  if (!periodMinutes) return null;
  const period = periodMinutes * 60_000;
  if (!last || last > now) return now + period; // ยังไม่เคยเริ่ม / นาฬิกาเครื่องถูกย้อน
  return Math.max(now, last + period);
}

// ---- ลบ cookies / cache / ข้อมูลเว็บ (chrome.browsingData) ----
// ใช้ได้เฉพาะ cookies, storage, cache เมื่อระบุ origins และ cookies ถูกลบทั้ง registrable domain
// https://developer.chrome.com/docs/extensions/reference/api/browsingData
export const SITE_DATA_TYPES = {
  cookies: true, cache: true, cacheStorage: true, localStorage: true,
  indexedDB: true, serviceWorkers: true, fileSystems: true,
};
const MAX_HOSTS = 50;

// host ย่อยที่เคยเปิด (เช่น m.youtube.com) จะได้ลบ storage/cache ของมันด้วย; คืน true ถ้า map เปลี่ยน
export function rememberHost(hostsMap, domain, url) {
  const host = hostOf(url);
  if (!host || !(host === domain || host.endsWith("." + domain))) return false;
  const list = hostsMap[domain] ?? [];
  if (list.includes(host) || list.length >= MAX_HOSTS) return false;
  hostsMap[domain] = [...list, host];
  return true;
}

export function originsFor(domain, hosts = []) {
  const set = new Set([domain, `www.${domain}`]);
  for (const h of hosts) if (h === domain || h.endsWith("." + domain)) set.add(h);
  return [...set].flatMap((h) => [`https://${h}`, `http://${h}`]);
}

// คืนจำนวนเว็บที่สั่งลบ
export async function clearSiteData(domains, hostsMap = {}) {
  const safeDomains = domains.filter((d) => !isTooBroad(d));
  if (safeDomains.length === 0) return 0;
  const origins = safeDomains.flatMap((d) => originsFor(d, hostsMap[d]));
  await chrome.browsingData.remove({ origins }, SITE_DATA_TYPES);
  return safeDomains.length;
}

// เว็บที่เปิด "ลบ cookies" และไม่มีแท็บไหนเปิดอยู่ (กัน logout ระหว่างใช้งาน)
export function idleDataSites(sites, openUrls) {
  return sites
    .filter((s) => s.data === true && !openUrls.some((u) => isBlocked(u, s.domain)))
    .map((s) => s.domain);
}

export function saveSettings(patch) {
  return chrome.storage.local.set(patch);
}

const PAGE = 1000;
const MAX_ROUNDS = 100;
const DELETE_BATCH = 50;

// ลบประวัติของ domain นี้ คืนจำนวน URL ที่ลบ
// startTime: ค้นเฉพาะช่วงหลังเวลานี้ (0 = ทั้งหมด) — ใช้ตอน sweep เป็นระยะให้เบา
export async function sweepDomain(domain, { startTime = 0 } = {}) {
  let deleted = 0;
  let endTime = Date.now() + 60_000;
  for (let round = 0; round < MAX_ROUNDS; round++) {
    const items = await chrome.history.search({
      text: domain,
      startTime,
      endTime,
      maxResults: PAGE,
    });
    if (items.length === 0) break;

    // text search match title ด้วย จึงต้องกรอง hostname อีกชั้น
    const targets = items.filter((i) => isBlocked(i.url, domain));
    for (let i = 0; i < targets.length; i += DELETE_BATCH) {
      await Promise.all(
        targets.slice(i, i + DELETE_BATCH).map((t) => chrome.history.deleteUrl({ url: t.url }))
      );
    }
    deleted += targets.length;
    if (items.length < PAGE) break;

    // เลื่อนไปหน้าที่เก่ากว่า (ผลลัพธ์เรียงใหม่ -> เก่า)
    const oldest = Math.min(...items.map((i) => i.lastVisitTime ?? endTime));
    if (oldest >= endTime) break;
    endTime = oldest;
  }
  return deleted;
}

// mode = "visit" | "close" | undefined (ทุกเว็บ)
// คืน { total, byDomain: [{ domain, count }] } (byDomain มีเฉพาะเว็บที่ลบ > 0)
export async function sweep(mode, opts) {
  const { sites } = await getSettings();
  const byDomain = [];
  let total = 0;
  for (const site of sites) {
    if (mode && site.mode !== mode) continue;
    const count = await sweepDomain(site.domain, opts);
    total += count;
    if (count) byDomain.push({ domain: site.domain, count });
  }
  return { total, byDomain };
}

// ตัวเลขบน badge: 7 / 999 / 1.2k / 12k
export function badgeText(n) {
  if (!n) return "";
  if (n < 1000) return String(n);
  if (n < 10_000) return (Math.floor(n / 100) / 10).toString().replace(/\.0$/, "") + "k";
  if (n < 1_000_000) return Math.floor(n / 1000) + "k";
  return "1m+";
}

// เทียบรายการเก่า/ใหม่ -> domain ที่เพิ่งกลายเป็นโหมด visit (ต้อง sweep เต็ม)
export function newlyVisit(oldSites = [], newSites = []) {
  const before = new Set(oldSites.filter((s) => s.mode === "visit").map((s) => s.domain));
  return newSites.filter((s) => s.mode === "visit" && !before.has(s.domain)).map((s) => s.domain);
}
