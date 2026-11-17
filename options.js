import { getSettings, saveSettings, normalizeDomain, isTooBroad } from "./lib/sites.js";
import {
  el, modeSeg, setMsg, runSweep, siteChips, toggle,
  setHidden, isHidden, shown, spoken, siteMonogram, eyeButton,
} from "./lib/ui.js";
import { t, tNodes, localize, initI18n } from "./lib/i18n.js";

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
  if (current.some((s) => s.domain === domain)) {
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
  await updateSites((list) => [...list, { domain, mode: addSeg.getValue() }]);
  $("domain").value = "";
  updateHint();
  showToast(t("toastAdded", shown(domain)));
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
  return el("li", { class: `item${isHidden() ? " masked" : ""}` },
    siteMonogram(site.domain, site.mode),
    el("div", { class: "info" },
      el("span", { class: "domain" }, shown(site.domain)),
      el("span", { class: "sub" }, `+ *.${shown(site.domain)}`)
    ),
    modeSeg(site.mode, (mode) =>
      updateSites((list) => list.map((s) => (s.domain === site.domain ? { ...s, mode } : s)))
    , t("modeLabelFor", spoken(site.domain))),
    el("button", {
      class: "btn btn-ghost btn-icon remove",
      title: t("removeTitle"),
      "aria-label": t("removeAria", spoken(site.domain)),
      onclick: async () => {
        await updateSites((list) => list.filter((s) => s.domain !== site.domain));
        showToast(t("toastRemoved", shown(site.domain)), () =>
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

function renderList() {
  const q = $("filter").value.trim().toLowerCase();
  const sites = [...current]
    .sort((a, b) => a.domain.localeCompare(b.domain))
    .filter((s) => isHidden() || !q || s.domain.includes(q));

  // ตอนซ่อนชื่อ ช่องค้นหาไม่มีประโยชน์ (ผลเป็นจุดหมด) แถมใช้เดาชื่อในรายการได้
  $("toolbar").hidden = current.length < 6 || isHidden();
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

const badgeToggle = toggle("showBadge", true, (v) => saveSettings({ showBadge: v }));
const notifyToggle = toggle("notify", false, (v) => saveSettings({ notify: v }));
$("showBadgeSlot").replaceWith(badgeToggle);
$("notifySlot").replaceWith(notifyToggle);

// ซ่อนชื่อเว็บ: สวิตช์บันทึกค่า, ปุ่มตากดดูชั่วคราวเฉพาะหน้านี้
let hideNames = false;
const hideToggle = toggle("hideNames", false, (v) => saveSettings({ hideNames: v }));
$("hideNamesSlot").replaceWith(hideToggle);
const eye = eyeButton(() => {
  setHidden(!isHidden());
  renderNames();
});
$("eyeSlot").replaceWith(eye);

$("testNotifyBtn").addEventListener("click", async () => {
  try {
    const res = await chrome.runtime.sendMessage({ type: "testPopup" });
    if (!res?.ok) throw new Error(res?.error ?? t("noReply"));
    setMsg($("notifyMsg"), t("popupOpened"), "ok");
  } catch (err) {
    setMsg($("notifyMsg"), t("popupFailed", err.message), "err");
  }
});

// ---------- render ----------

// ส่วนที่มีชื่อเว็บ — วาดใหม่ตอนสลับซ่อน/แสดง
function renderNames() {
  eye.hidden = !hideNames;
  eye.sync();
  $("sweepTargets").replaceChildren(
    current.length ? siteChips(current) : el("span", { class: "muted" }, t("noSites"))
  );
  renderList();
}

async function render() {
  const settings = await getSettings();
  const { sites, sweepMinutes, showBadge, notify } = settings;
  badgeToggle.checked = showBadge;
  notifyToggle.checked = notify;
  hideToggle.checked = settings.hideNames;
  // เพิ่งเปิดสวิตช์/เปิดหน้าใหม่ → เริ่มที่ซ่อนเสมอ; ปิดสวิตช์ → แสดงชื่อ
  if (settings.hideNames !== hideNames) setHidden(settings.hideNames);
  hideNames = settings.hideNames;
  current = sites;
  $("statAll").textContent = sites.length;
  $("statVisit").textContent = sites.filter((s) => s.mode === "visit").length;
  $("statClose").textContent = sites.filter((s) => s.mode === "close").length;
  $("sweepBtn").disabled = sites.length === 0;
  renderNames();
  renderInterval(sweepMinutes);
  updateHint();
}

chrome.storage.onChanged.addListener((_c, area) => area === "local" && render());
render();
