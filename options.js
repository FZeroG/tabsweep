import { getSettings, saveSettings, normalizeDomain, isTooBroad, SCHEDULES, nextScheduleTime } from "./lib/sites.js";
import {
  el, modeSeg, setMsg, runSweep, siteChips, toggle, dataSwitch, hideSwitch, formDialog, unlock,
  setPrivacy, setRevealed, isRevealed, isSecret, hasHiddenSites, shown, spoken, siteMonogram, eyeButton, sortSites,
} from "./lib/ui.js";
import { getLock, makeLock, checkLock, MIN_PASSWORD } from "./lib/lock.js";
import { t, tNodes, localize, initI18n } from "./lib/i18n.js";
import { buildBackup, backupFileName, parseBackup, planImport, MAX_FILE_BYTES, MAX_SITES } from "./lib/backup.js";

const $ = (id) => document.getElementById(id);
const INTERVALS = [1, 5, 10, 15, 30, 60];

await initI18n();
localize();

// ---------- language ----------
// ชื่อภาษาเขียนด้วยภาษาของตัวเอง (คนอ่านภาษาปัจจุบันไม่ออกก็ยังหาเจอ)
const LANG_OPTIONS = [["auto", () => t("langAuto")], ["th", () => "ไทย"], ["en", () => "English"]];
const { lang: savedLang } = await getSettings();
$("lang").replaceChildren(
  ...LANG_OPTIONS.map(([value, label]) => new Option(label(), value, false, value === savedLang))
);
$("lang").addEventListener("change", async () => {
  await saveSettings({ lang: $("lang").value });
  location.reload(); // วาดใหม่ทั้งหน้าด้วยภาษาใหม่
});

let current = [];

async function updateSites(fn) {
  const { sites } = await getSettings();
  await saveSettings({ sites: fn(sites) });
}

// ---------- add form ----------

const addSeg = modeSeg("visit");
$("addSeg").replaceWith(addSeg);

function code(text) {
  return el("code", {}, text);
}

function updateHint() {
  const hint = $("hint");
  const raw = $("domain").value.trim();
  hint.classList.remove("err");
  if (!raw) {
    hint.replaceChildren(t("hintDefault"));
    return null;
  }
  const domain = normalizeDomain(raw);
  if (!domain) {
    hint.classList.add("err");
    hint.replaceChildren(t("invalidDomain"));
    return null;
  }
  if (isTooBroad(domain)) {
    hint.classList.add("err");
    hint.replaceChildren(t("domainTooBroad", domain));
    return null;
  }
  // เว็บที่ซ่อนอยู่: ไม่บอกว่ามีในรายการแล้ว (ไม่งั้นพิมพ์เดาชื่อเพื่อเช็กได้) — กดเพิ่มก็แค่ไม่ซ้ำ
  if (current.some((s) => s.domain === domain) && !isSecret(domain)) {
    hint.classList.add("err");
    hint.replaceChildren(...tNodes("hintDuplicate", code(domain)));
    return null;
  }
  hint.replaceChildren(...tNodes("hintWillDelete", code(domain), code(`*.${domain}`)));
  return domain;
}

$("domain").addEventListener("input", updateHint);

$("addForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const domain = updateHint();
  if (!domain) return $("domain").focus();
  const site = { domain, mode: addSeg.getValue() };
  if ($("addData").checked) site.data = true;
  if ($("addHidden").checked) site.hidden = true;
  const label = site.hidden || isSecret(domain) ? t("hiddenSite") : domain;
  await updateSites((list) => (list.some((s) => s.domain === domain) ? list : [...list, site]));
  $("domain").value = "";
  $("addData").checked = false;
  $("addHidden").checked = false;
  updateHint();
  showToast(t("toastAdded", label));
});

// ---------- toast + undo ----------

let toastTimer = 0;
let undoFn = null;

function showToast(text, undo = null) {
  $("toastText").textContent = text;
  $("toastUndo").hidden = !undo;
  undoFn = undo;
  $("toast").classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $("toast").classList.remove("show"), undo ? 6000 : 2500);
}

$("toastUndo").addEventListener("click", async () => {
  $("toast").classList.remove("show");
  const fn = undoFn;
  undoFn = null;
  await fn?.();
});

// ---------- list ----------

function emptyState(text) {
  return el("li", { class: "empty" },
    el("div", { class: "bars", "aria-hidden": "true" },
      el("i", { style: "width:120px" }), el("i", { style: "width:180px" }), el("i", { style: "width:90px" })
    ),
    text
  );
}

function itemRow(site) {
  return el("li", { class: `item${isSecret(site.domain) ? " masked" : ""}` },
    siteMonogram(site.domain, site.mode),
    el("div", { class: "info" },
      el("span", { class: "domain" }, shown(site.domain)),
      el("span", { class: "sub" }, `+ *.${shown(site.domain)}`),
      el("div", { class: "switches" },
        dataSwitch(site.data === true, (on) => setFlag(site.domain, "data", on), site.domain),
        hideSwitch(hideAll || site.hidden === true, async (on, input) => {
          // ซ่อน: ทำได้เลย / เลิกซ่อน: ต้องปลดล็อกก่อน (ถ้าตั้งรหัสไว้)
          if (!on && !(await passwordGate())) {
            input.checked = true;
            return;
          }
          if (on) setRevealed(false);
          await setFlag(site.domain, "hidden", on);
        }, site.domain, hideAll)
      )
    ),
    modeSeg(site.mode, (mode) =>
      updateSites((list) => list.map((s) => (s.domain === site.domain ? { ...s, mode } : s)))
    , t("modeLabelFor", spoken(site.domain))),
    el("button", {
      class: "btn btn-ghost btn-icon remove",
      title: t("removeTitle"),
      "aria-label": t("removeAria", spoken(site.domain)),
      onclick: async () => {
        const label = shown(site.domain); // คำนวณก่อนลบ (หลังลบจะไม่รู้แล้วว่าเคยซ่อน)
        await updateSites((list) => list.filter((s) => s.domain !== site.domain));
        showToast(t("toastRemoved", label), () =>
          updateSites((list) => (list.some((s) => s.domain === site.domain) ? list : [...list, site]))
        );
      },
    }, xIcon())
  );
}

function xIcon() {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "2");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("aria-hidden", "true");
  const path = document.createElementNS(ns, "path");
  path.setAttribute("d", "M6 6l12 12M18 6L6 18");
  svg.append(path);
  return svg;
}

// เปิด/ปิด field แบบ boolean ของเว็บ (เก็บเฉพาะตอนเป็น true)
function setFlag(domain, key, on) {
  return updateSites((list) => list.map((s) => {
    if (s.domain !== domain) return s;
    const { [key]: _drop, ...rest } = s;
    return on ? { ...rest, [key]: true } : rest;
  }));
}

function renderList() {
  const q = $("filter").value.trim().toLowerCase();
  // ค้นหาไม่เจอเว็บที่ซ่อน (ไม่งั้นพิมพ์เดาชื่อแล้วดูว่ามีแถวโผล่ไหมได้)
  const sites = sortSites(current).filter((s) => !q || (!isSecret(s.domain) && s.domain.includes(q)));

  $("toolbar").hidden = current.length < 6;
  const list = $("list");
  if (current.length === 0) list.replaceChildren(emptyState(t("emptyList")));
  else if (sites.length === 0) list.replaceChildren(emptyState(t("noMatch", q)));
  else list.replaceChildren(...sites.map(itemRow));
}

$("filter").addEventListener("input", renderList);

// ---------- settings ----------

function renderInterval(minutes) {
  const sel = $("interval");
  if (document.activeElement === sel) return;
  const values = INTERVALS.includes(minutes) ? INTERVALS : [...INTERVALS, minutes].sort((a, b) => a - b);
  sel.replaceChildren(
    ...values.map((m) => new Option(m === 60 ? t("oneHour") : t("minutes", m), String(m), false, m === minutes))
  );
}

$("interval").addEventListener("change", async () => {
  await saveSettings({ sweepMinutes: Number($("interval").value) });
  setMsg($("intervalMsg"), t("saved"), "ok");
});

$("sweepBtn").addEventListener("click", () => runSweep($("sweepBtn"), $("sweepMsg")));

// ลบตามเวลา: เปลี่ยนรอบ = เริ่มนับใหม่จากตอนนี้
function scheduleLabel(m) {
  if (m === 0) return t("scheduleOff");
  if (m === 60) return t("scheduleHour");
  if (m === 1440) return t("scheduleDay");
  if (m === 10080) return t("scheduleWeek");
  return t("scheduleHours", m / 60);
}

function renderSchedule({ schedule, lastScheduledAt }) {
  const sel = $("schedule");
  if (document.activeElement !== sel) {
    sel.replaceChildren(...SCHEDULES.map((m) => new Option(scheduleLabel(m), String(m), false, m === schedule)));
  }
  const next = nextScheduleTime(lastScheduledAt, schedule);
  $("scheduleNext").textContent = next
    ? t("scheduleNext", new Date(next).toLocaleString(document.documentElement.lang, { dateStyle: "medium", timeStyle: "short" }))
    : "";
}

$("schedule").addEventListener("change", async () => {
  await saveSettings({ schedule: Number($("schedule").value), lastScheduledAt: Date.now() });
  setMsg($("scheduleMsg"), t("saved"), "ok");
});

// หน้าต้อนรับ (เปิดเองตอนติดตั้งครั้งแรก: options.html?welcome=1)
if (new URLSearchParams(location.search).has("welcome")) {
  $("welcome").hidden = false;
  $("welcomeAdd").addEventListener("click", () => {
    $("domain").focus();
    $("domain").scrollIntoView({ block: "center", behavior: "smooth" });
  });
  $("welcomeDone").addEventListener("click", () => {
    $("welcome").hidden = true;
    history.replaceState(null, "", location.pathname);
    $("domain").focus();
  });
}

const badgeToggle = toggle("showBadge", true, (v) => saveSettings({ showBadge: v }));
const notifyToggle = toggle("notify", false, (v) => saveSettings({ notify: v }));
$("showBadgeSlot").replaceWith(badgeToggle);
$("notifySlot").replaceWith(notifyToggle);

// ---------- ซ่อนเว็บ + รหัสผ่าน ----------
// "ซ่อนทุกเว็บ" (setting hideNames) หรือซ่อนรายเว็บ (site.hidden)
// ปุ่มตา = ปลดล็อกดูชั่วคราวเฉพาะหน้านี้ (ถ้าตั้งรหัสไว้ต้องใส่รหัส)
let hideAll = false;

async function unlockNames() {
  const ok = await unlock(await getLock(), checkLock, { onForgot: forgotPassword });
  if (ok) renderNames();
  return ok;
}

// งานที่ต้องรู้รหัส (เลิกซ่อน / export): ไม่ได้ตั้งรหัส → ผ่านเลยโดยไม่เปิดเผยเว็บอื่น
async function passwordGate() {
  return (await getLock()) ? unlockNames() : true;
}

const hideToggle = toggle("hideNames", false, async (v) => {
  if (!v && !(await passwordGate())) {
    hideToggle.checked = true;
    return;
  }
  if (v) setRevealed(false);
  await saveSettings({ hideNames: v });
});
$("hideNamesSlot").replaceWith(hideToggle);

const eye = eyeButton(async () => {
  if (isRevealed()) setRevealed(false);
  else await unlockNames();
  renderNames();
});
$("eyeSlot").replaceWith(eye);

async function renderLock() {
  const lock = await getLock();
  // ยังไม่มีอะไรให้ล็อก → ไม่ต้องรก; มีรหัสค้างอยู่ → โชว์เด่น ผู้ใช้จะได้รู้ (ลบได้)
  $("lockRow").hidden = !lock && !hasHiddenSites();
  $("lockRow").classList.toggle("on", !!lock);
  $("lockStatus").textContent = lock ? t("lockStatusOn") : t("lockStatusOff");
  $("lockSet").textContent = lock ? t("lockChange") : t("lockSet");
  $("lockRemove").hidden = !lock;
  $("lockForgot").hidden = !lock;
}

const passwordFields = () => [
  // "off": ไม่ให้ Edge เสนอ/เติมรหัสที่สุ่มให้เอง (ผู้ใช้จะไม่รู้ว่าตั้งรหัสอะไรไป)
  { name: "pw", label: t("pwNewLabel"), autocomplete: "off" },
  { name: "pw2", label: t("pwConfirmLabel"), autocomplete: "off" },
];

$("lockSet").addEventListener("click", async () => {
  // เปลี่ยนรหัส: ต้องรู้รหัสเดิมก่อน (ปลดล็อก)
  if (!(await passwordGate())) return;
  const res = await formDialog({
    title: t("pwTitleSet"),
    note: t("pwNote"),
    fields: passwordFields(),
    validate: async ({ pw, pw2 }) => {
      if (pw.length < MIN_PASSWORD) return t("pwTooShort", MIN_PASSWORD);
      if (pw !== pw2) return t("pwMismatch");
      return null;
    },
  });
  if (!res) return;
  await chrome.storage.local.set({ lock: await makeLock(res.pw) });
  setRevealed(false);
  renderNames();
  renderLock();
  showToast(t("pwSaved"));
});

$("lockRemove").addEventListener("click", async () => {
  if (!(await unlockNames())) return;
  await chrome.storage.local.remove("lock");
  renderLock();
  showToast(t("pwRemoved"));
});

// ลืมรหัส: กู้คืนไม่ได้ ทางเดียวคือลบเว็บที่ซ่อนทั้งหมด แล้วเพิ่มใหม่
async function forgotPassword() {
  const { sites, hideNames } = await getSettings();
  const doomed = hideNames ? sites.length : sites.filter((s) => s.hidden === true).length;
  const res = await formDialog({
    title: t("forgotTitle"),
    note: t("forgotDesc", doomed),
    ok: t("forgotConfirm"),
    danger: true,
  });
  if (!res) return;
  const keep = hideNames ? [] : sites.filter((s) => s.hidden !== true);
  await chrome.storage.local.remove("lock");
  await saveSettings({ sites: keep, hideNames: false });
  setRevealed(false);
  renderLock();
  showToast(t("forgotDone", doomed));
}
$("lockForgot").addEventListener("click", forgotPassword);

$("testNotifyBtn").addEventListener("click", async () => {
  try {
    const res = await chrome.runtime.sendMessage({ type: "testPopup" });
    if (!res?.ok) throw new Error(res?.error ?? t("noReply"));
    setMsg($("notifyMsg"), t("popupOpened"), "ok");
  } catch (err) {
    setMsg($("notifyMsg"), t("popupFailed", err.message), "err");
  }
});

// ---------- backup: export / import ----------
// export: สร้างไฟล์ในหน้านี้เองด้วย Blob + <a download> (ไม่ต้องขอสิทธิ์ downloads)
// import: ผู้ใช้ต้องเลือกไฟล์เอง → ตรวจใน lib/backup.js → แสดงตัวอย่าง → กดยืนยันถึงจะบันทึก

$("exportBtn").addEventListener("click", async () => {
  // ไฟล์มีชื่อเว็บทั้งหมด (รวมที่ซ่อน) → ถ้าตั้งรหัสไว้ต้องปลดล็อกก่อน
  if (hasHiddenSites() && !(await passwordGate())) return;
  try {
    const now = new Date();
    const data = buildBackup(await getSettings(), chrome.runtime.getManifest().version, now);
    const name = backupFileName(now);
    const blob = new Blob([JSON.stringify(data, null, 2) + "\n"], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = el("a", { href: url, download: name, hidden: true });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
    setMsg($("backupMsg"), t("exportDone", data.sites.length, name), "ok");
  } catch (err) {
    setMsg($("backupMsg"), t("exportFailed", err.message), "err");
  }
});

let pending = null; // { parsed, fileName } ระหว่างรอผู้ใช้ยืนยัน

$("importBtn").addEventListener("click", () => $("importFile").click());

$("importFile").addEventListener("change", async () => {
  const input = $("importFile");
  const file = input.files?.[0];
  closePreview();
  if (!file) return;
  try {
    if (file.size > MAX_FILE_BYTES) {
      return setMsg($("backupMsg"), t("importTooLarge", MAX_FILE_BYTES / 1024), "err");
    }
    const parsed = parseBackup(await file.text());
    if (!parsed.ok) return setMsg($("backupMsg"), t(parsed.error, parsed.arg ?? ""), "err");
    setMsg($("backupMsg"), "");
    pending = { parsed, fileName: file.name };
    $("importMerge").checked = true;
    $("importSettings").checked = true;
    $("importPreview").hidden = false;
    renderPreview();
    $("importPreview").focus();
  } catch (err) {
    setMsg($("backupMsg"), t("importFailed", err.message), "err");
  } finally {
    input.value = ""; // เลือกไฟล์เดิมซ้ำได้
  }
});

const importMode = () => ($("importReplace").checked ? "replace" : "merge");
const siteKey = (list) => list.map((s) => `${s.domain}:${s.mode}:${s.data === true}:${s.hidden === true}`).sort().join("|");

function renderPreview() {
  if (!pending) return;
  const { parsed, fileName } = pending;
  const plan = planImport(current, parsed.sites, importMode());
  const withSettings = !!parsed.settings && $("importSettings").checked;
  const changesSites = plan.mode === "replace" ? siteKey(plan.result) !== siteKey(current) : plan.added.length > 0;

  $("importFileInfo").textContent = parsed.exportedAt
    ? t("importFileInfoDate", fileName, parsed.exportedAt.toLocaleString(document.documentElement.lang))
    : t("importFileInfo", fileName);

  let summary;
  if (plan.tooMany) summary = t("importTooMany", MAX_SITES);
  else if (plan.mode === "replace") summary = t("importSummaryReplace", plan.result.length, plan.removed, plan.modeChanged);
  else summary = t("importSummaryMerge", plan.added.length, plan.existing);
  if (!plan.tooMany && !changesSites && !withSettings) summary += " " + t("importNothing");
  $("importSummary").textContent = summary;
  $("importAdded").replaceChildren(...(plan.added.length ? [siteChips(plan.added, 24)] : []));

  $("importSkipped").hidden = !parsed.skipped;
  $("importSkipped").textContent = t("importSkipped", parsed.skipped);

  // เตือนก่อน: เว็บที่จะกลายเป็นโหมด "ลบทันที" จะถูกลบประวัติเก่าทั้งหมดทันที (ย้อนกลับไม่ได้)
  $("importWarn").hidden = plan.willSweep.length === 0;
  $("importWarnText").textContent = t("importVisitWarn", plan.willSweep.length);
  $("importWarnSites").replaceChildren(siteChips(plan.willSweep.map((domain) => ({ domain, mode: "visit" })), 24));

  $("importSettingsRow").hidden = !parsed.settings;
  $("importConfirm").disabled = plan.tooMany || (!changesSites && !withSettings);
}

function closePreview() {
  pending = null;
  $("importPreview").hidden = true;
}

for (const id of ["importMerge", "importReplace", "importSettings"]) {
  $(id).addEventListener("change", renderPreview);
}

$("importCancel").addEventListener("click", () => {
  closePreview();
  $("importBtn").focus();
});

$("importConfirm").addEventListener("click", async () => {
  if (!pending) return;
  const { parsed } = pending;
  const plan = planImport((await getSettings()).sites, parsed.sites, importMode()); // ใช้รายการล่าสุดจริง
  if (plan.tooMany) return renderPreview();
  // นำเข้าอาจเลิกซ่อนเว็บ (แทนที่รายการ / ปิดซ่อนทุกเว็บ) → ถ้าตั้งรหัสไว้ต้องปลดล็อกก่อน
  if (hasHiddenSites() && !(await passwordGate())) return;
  // parsed.settings มาจาก pickSettings: มีเฉพาะ key ที่รู้จักและค่าผ่านการตรวจแล้ว
  const imported = parsed.settings && $("importSettings").checked ? parsed.settings : {};
  try {
    const prev = await getSettings();
    const undo = { sites: prev.sites };
    for (const key of Object.keys(imported)) undo[key] = prev[key];
    const extra = "schedule" in imported ? { lastScheduledAt: Date.now() } : {}; // เริ่มนับรอบใหม่
    await saveSettings({ ...imported, ...extra, sites: plan.result });
    closePreview();
    const langNote = imported.lang && imported.lang !== prev.lang ? " " + t("importLangNote") : "";
    showToast(t("importDone", plan.result.length) + langNote, () => saveSettings(undo));
  } catch (err) {
    setMsg($("backupMsg"), t("importFailed", err.message), "err");
  }
});

// ---------- render ----------

// ส่วนที่มีชื่อเว็บ — วาดใหม่ตอนสลับซ่อน/แสดง
function renderNames() {
  eye.hidden = !hasHiddenSites();
  eye.sync();
  $("sweepTargets").replaceChildren(
    current.length ? siteChips(current) : el("span", { class: "muted" }, t("noSites"))
  );
  renderList();
  renderPreview();
}

async function render() {
  const settings = await getSettings();
  const { sites, sweepMinutes, showBadge, notify } = settings;
  badgeToggle.checked = showBadge;
  notifyToggle.checked = notify;
  hideToggle.checked = settings.hideNames;
  $("lang").value = settings.lang; // อาจเปลี่ยนจากการนำเข้า (ภาษาหน้านี้เปลี่ยนตอนเปิดใหม่)
  hideAll = settings.hideNames;
  current = sites;
  setPrivacy(sites, hideAll);
  $("statAll").textContent = sites.length;
  $("statVisit").textContent = sites.filter((s) => s.mode === "visit").length;
  $("statClose").textContent = sites.filter((s) => s.mode === "close").length;
  $("sweepBtn").disabled = sites.length === 0;
  renderNames();
  renderInterval(sweepMinutes);
  renderSchedule(settings);
  renderLock();
  updateHint();
}

chrome.storage.onChanged.addListener((_c, area) => area === "local" && render());
render();
