// สำรอง/นำเข้ารายการเว็บ + การตั้งค่า (ไฟล์ JSON)
// ไฟล์นำเข้าถือเป็นข้อมูลที่ไม่น่าไว้ใจเสมอ (อาจถูกแก้หรือปลอมมา):
// - ใช้แค่ JSON.parse ไม่มีการรันโค้ดจากไฟล์
// - หยิบเฉพาะ field ที่รู้จัก ตรวจชนิดทีละตัว ไม่ spread/assign object จากไฟล์ (กัน __proto__ และ key แปลกๆ)
// - ทุก domain ผ่าน normalizeDomain + isTooBroad ซ้ำ เหมือนพิมพ์เพิ่มเอง
// - จำกัดขนาดไฟล์และจำนวนเว็บ กันไฟล์ใหญ่ทำให้หน้าค้างหรือ sweep หนักเกิน
import { normalizeDomain, isTooBroad, newlyVisit } from "./sites.js";

export const FORMAT = "history-clean-backup";
export const VERSION = 1;
export const MAX_FILE_BYTES = 512 * 1024;
export const MAX_SITES = 1000;

const MODES = ["visit", "close"];
const LANGS = ["auto", "th", "en"];
const has = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);
const isPlainObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

// settings = ผลจาก getSettings() (ผ่านการตรวจแล้ว)
export function buildBackup(settings, appVersion, now = new Date()) {
  return {
    format: FORMAT,
    version: VERSION,
    app: { name: "History Clean", version: String(appVersion ?? "") },
    exportedAt: now.toISOString(),
    sites: settings.sites
      .filter((s) => typeof s?.domain === "string" && MODES.includes(s.mode))
      .map((s) => ({ domain: s.domain, mode: s.mode })),
    settings: {
      sweepMinutes: settings.sweepMinutes,
      showBadge: settings.showBadge,
      notify: settings.notify,
      hideNames: settings.hideNames,
      lang: settings.lang,
    },
  };
}

export function backupFileName(now = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  return `history-clean-backup-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.json`;
}

// คืน { ok: false, error, arg? } หรือ { ok: true, sites, skipped, settings, exportedAt }
// error เป็นชื่อ key ใน _locales
export function parseBackup(text) {
  if (typeof text !== "string") return { ok: false, error: "importNotJson" };
  if (text.length > MAX_FILE_BYTES) return { ok: false, error: "importTooLarge", arg: MAX_FILE_BYTES / 1024 };

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: "importNotJson" };
  }
  if (!isPlainObject(data) || data.format !== FORMAT) return { ok: false, error: "importWrongFormat" };
  if (!Number.isInteger(data.version) || data.version < 1) return { ok: false, error: "importWrongFormat" };
  if (data.version > VERSION) return { ok: false, error: "importNewer" };

  const rawSites = has(data, "sites") ? data.sites : [];
  if (!Array.isArray(rawSites)) return { ok: false, error: "importWrongFormat" };
  if (rawSites.length > MAX_SITES) return { ok: false, error: "importTooMany", arg: MAX_SITES };

  const sites = [];
  const seen = new Set();
  let skipped = 0;
  for (const entry of rawSites) {
    const raw = isPlainObject(entry) && typeof entry.domain === "string" ? entry.domain : null;
    const mode = isPlainObject(entry) ? entry.mode : null;
    const domain = raw && raw.length <= 2048 ? normalizeDomain(raw) : null;
    if (!domain || isTooBroad(domain) || !MODES.includes(mode)) {
      skipped++;
      continue;
    }
    if (seen.has(domain)) continue; // ซ้ำในไฟล์ → ใช้ตัวแรก
    seen.add(domain);
    sites.push({ domain, mode });
  }

  const settings = has(data, "settings") ? pickSettings(data.settings) : null;
  if (sites.length === 0 && !settings) return { ok: false, error: "importEmpty" };

  const exportedAt = typeof data.exportedAt === "string" && !Number.isNaN(Date.parse(data.exportedAt))
    ? new Date(data.exportedAt)
    : null;
  return { ok: true, sites, skipped, settings, exportedAt };
}

// หยิบเฉพาะค่าที่ถูกชนิดและอยู่ในช่วงที่ยอมรับ ค่าที่ผิดจะถูกข้าม (ไม่ใช้ค่าจากไฟล์)
function pickSettings(raw) {
  if (!isPlainObject(raw)) return null;
  const out = {};
  if (has(raw, "sweepMinutes") && Number.isInteger(raw.sweepMinutes) && raw.sweepMinutes >= 1 && raw.sweepMinutes <= 1440) {
    out.sweepMinutes = raw.sweepMinutes;
  }
  for (const key of ["showBadge", "notify", "hideNames"]) {
    if (has(raw, key) && typeof raw[key] === "boolean") out[key] = raw[key];
  }
  if (has(raw, "lang") && LANGS.includes(raw.lang)) out.lang = raw.lang;
  return Object.keys(out).length ? out : null;
}

// วางแผนนำเข้า (ยังไม่บันทึก) — mode: "merge" | "replace"
// merge: เพิ่มเฉพาะเว็บใหม่ เว็บที่มีอยู่แล้วคงโหมดเดิม
// replace: รายการกลายเป็นเหมือนในไฟล์
export function planImport(currentSites, incoming, mode) {
  const byDomain = new Map(currentSites.map((s) => [s.domain, s]));
  const inFile = new Set(incoming.map((s) => s.domain));
  const added = incoming.filter((s) => !byDomain.has(s.domain));
  const existing = incoming.filter((s) => byDomain.has(s.domain));
  const modeChanged = existing.filter((s) => byDomain.get(s.domain).mode !== s.mode);

  const result = mode === "replace"
    ? incoming.map((s) => ({ domain: s.domain, mode: s.mode }))
    : [...currentSites, ...added.map((s) => ({ domain: s.domain, mode: s.mode }))];

  return {
    mode,
    result,
    added,
    existing: existing.length,
    modeChanged: mode === "replace" ? modeChanged.length : 0,
    removed: mode === "replace" ? currentSites.filter((s) => !inFile.has(s.domain)).length : 0,
    // เว็บที่จะถูกลบประวัติเก่าทั้งหมดทันทีหลังบันทึก (background sweep เว็บที่เพิ่งเป็นโหมด visit)
    willSweep: newlyVisit(currentSites, result),
    tooMany: result.length > MAX_SITES,
  };
}
