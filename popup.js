import { getSettings, saveSettings, normalizeDomain, findSite, isTooBroad } from "./lib/sites.js";
import {
  el, modeSeg, modeName, monogram, setMsg, runSweep, siteChips, dataSwitch, hideSwitch, unlock,
  setPrivacy, setRevealed, isRevealed, isSecret, hasHiddenSites, siteMonogram, eyeButton,
} from "./lib/ui.js";
import { getLock, checkLock } from "./lib/lock.js";
import { t, tNodes, localize, initI18n } from "./lib/i18n.js";

const $ = (id) => document.getElementById(id);

await initI18n();
localize();
// เก็บ element ไว้ในตัวแปรเลย ไม่ต้องหาจาก id ทีหลัง (กัน null ถ้า DOM ไม่ตรง)
const countEl = el("b", {}, "0");
const deletedEl = el("b", {}, "0");
$("footerStats").replaceChildren(...tNodes("footerStats", countEl, deletedEl));

let tabUrl = null;

async function updateSites(fn) {
  const { sites } = await getSettings();
  await saveSettings({ sites: fn(sites) });
}

function renderNotWeb(card) {
  card.append(
    el("div", { class: "site-head" },
      monogram("·"),
      el("div", { class: "info" },
        el("div", { class: "site-domain" }, t("notWebTitle")),
        el("div", { class: "muted", style: "font-size:12px" }, t("notWebHint"))
      )
    )
  );
}

function setFlag(domain, key, on) {
  return updateSites((list) => list.map((s) => {
    if (s.domain !== domain) return s;
    const { [key]: _drop, ...rest } = s;
    return on ? { ...rest, [key]: true } : rest;
  }));
}

function renderTracked(card, site, hideAll) {
  card.append(
    el("div", { class: "site-head" },
      siteMonogram(site.domain, site.mode),
      el("div", { class: "info" },
        el("div", { class: "site-domain", title: site.domain }, site.domain),
        el("div", {}, el("span", { class: `pill ${site.mode}` }, t("inListPill", modeName(site.mode))))
      )
    ),
    modeSeg(site.mode, (mode) =>
      updateSites((list) => list.map((s) => (s.domain === site.domain ? { ...s, mode } : s)))
    ),
    el("div", { class: "switches" },
      dataSwitch(site.data === true, (on) => setFlag(site.domain, "data", on), site.domain),
      // ซ่อนได้เลย (การ์ดจะหายไปจาก popup) — ถ้าเห็นการ์ดของเว็บที่ซ่อน แปลว่าปลดล็อกอยู่แล้ว เลิกซ่อนได้
      hideSwitch(hideAll || site.hidden === true, (on) => {
        if (on) setRevealed(false);
        return setFlag(site.domain, "hidden", on);
      }, site.domain, hideAll)
    ),
    el("div", { class: "site-foot" },
      el("span", { class: "muted mono", style: "font-size:11.5px" }, `+ *.${site.domain}`),
      el("button", {
        class: "link danger",
        onclick: () => updateSites((list) => list.filter((s) => s.domain !== site.domain)),
      }, t("removeFromList"))
    )
  );
}

function renderUntracked(card, suggested) {
  const input = el("input", {
    class: "input",
    value: suggested ?? "",
    spellcheck: "false",
    "aria-label": "Domain",
    placeholder: "example.com",
  });
  const seg = modeSeg("visit");
  const msg = el("div", { class: "msg" });

  const add = async () => {
    const domain = normalizeDomain(input.value);
    if (!domain) return setMsg(msg, t("invalidDomain"), "err");
    if (isTooBroad(domain)) return setMsg(msg, t("domainTooBroad", domain), "err");
    // มีอยู่แล้ว (เช่นเว็บที่ซ่อนไว้) → ไม่ทับ ไม่งั้นจะล้างค่าซ่อน/cookies ของเดิม
    await updateSites((list) => (list.some((s) => s.domain === domain) ? list : [...list, { domain, mode: seg.getValue() }]));
  };
  input.addEventListener("keydown", (e) => e.key === "Enter" && add());

  card.append(
    el("div", { class: "site-head" },
      monogram(suggested),
      el("div", { class: "info" },
        el("div", { class: "site-domain", title: suggested ?? "" }, suggested ?? "—"),
        el("div", {}, el("span", { class: "pill" }, t("notInListPill")))
      )
    ),
    seg,
    el("div", { class: "site-actions" }, input, el("button", { class: "btn btn-ink", onclick: add }, t("add"))),
    msg
  );
}

// เว็บที่ซ่อน: popup ไม่แสดงเลย (ไม่ใช่แค่เป็นจุด) — ปุ่มตาใน header ปลดล็อกดูชั่วคราว (ปิด popup แล้วซ่อนเหมือนเดิม)
let lastBanner = null;
const eye = eyeButton(async () => {
  if (isRevealed()) setRevealed(false);
  else {
    await unlock(await getLock(), checkLock, {
      onForgot: () => chrome.runtime.openOptionsPage(), // ลืมรหัส → จัดการในหน้าตั้งค่า
    });
  }
  await render();
  if (lastBanner && !$("banner").hidden) showBanner(lastBanner, false);
});
$("optionsBtn").before(eye);

function applyPrivacy({ sites, hideNames }) {
  setPrivacy(sites, hideNames);
  eye.hidden = !hasHiddenSites();
  eye.sync();
}
// ตั้งค่าซ่อนก่อนวาดอะไรที่มีชื่อเว็บ (แบนเนอร์ด้านล่างวาดก่อน render ครั้งแรก)
applyPrivacy(await getSettings());

async function render() {
  const settings = await getSettings();
  const { sites } = settings;
  applyPrivacy(settings);
  const visible = sites.filter((s) => !isSecret(s.domain));
  countEl.textContent = visible.length;
  $("sweepBtn").disabled = sites.length === 0;
  $("targets").replaceChildren(
    sites.length ? siteChips(sites, 5, { omitSecret: true }) : el("span", { class: "muted" }, t("noSites"))
  );

  const card = $("siteCard");
  card.replaceChildren();

  if (!tabUrl || !/^https?:/i.test(tabUrl)) return renderNotWeb(card);
  const site = findSite(tabUrl, sites);
  // อยู่บนเว็บที่ซ่อน → ทำเหมือนไม่ใช่เว็บ ไม่บอกว่าเว็บนี้อยู่ในรายการ
  if (site && isSecret(site.domain)) return renderNotWeb(card);
  if (site) renderTracked(card, site, settings.hideNames);
  else renderUntracked(card, normalizeDomain(tabUrl));
}

$("sweepBtn").addEventListener("click", () => runSweep($("sweepBtn"), $("result"), { omitSecret: true }));
for (const id of ["optionsBtn", "manageBtn"]) {
  $(id).addEventListener("click", () => chrome.runtime.openOptionsPage());
}
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local") render();
  if (area === "session" && changes.deletedCount) renderDeleted(changes.deletedCount.newValue);
  if (area === "session" && changes.lastEvent?.newValue) showBanner(changes.lastEvent.newValue, false);
});

// ---------- แบนเนอร์ "ลบแล้ว" (ตอน extension เปิด popup เองหลังลบ) ----------

const REASON = { visit: "reasonVisit", close: "reasonClose", boot: "reasonBoot", test: "reasonTest", schedule: "reasonSchedule" };
const AUTO_CLOSE_MS = 4000;
let closeTimer = 0;

function checkIcon() {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  const path = document.createElementNS(ns, "path");
  path.setAttribute("d", "M5 12.5l4.2 4.2L19 7");
  svg.append(path);
  return svg;
}

function showBanner(ev, autoClose) {
  lastBanner = ev;
  const total = ev.items.reduce((n, i) => n + i.count, 0);
  const banner = $("banner");
  const bar = el("div", { class: "banner-bar" });
  banner.replaceChildren(
    el("div", { class: "banner-check" }, checkIcon()),
    el("div", { class: "banner-title" }, t("bannerTitle", total.toLocaleString())),
    el("div", { class: "banner-sub" }, REASON[ev.reason] ? t(REASON[ev.reason]) : ""),
    el("div", { class: "chips" },
      ...ev.items.filter((i) => !isSecret(i.domain)).map((i) => el("span", { class: "chip" },
        el("span", { class: "dot" }), `${i.domain} · ${i.count}`))
    ),
    autoClose ? bar : null
  );
  banner.hidden = false;
  banner.classList.remove("pop");
  void banner.offsetWidth; // restart animation
  banner.classList.add("pop");

  clearTimeout(closeTimer);
  if (!autoClose) return;
  // ปิดเองใน 4 วิ — แต่ถ้าผู้ใช้เอาเมาส์มาชี้/กดอะไร ถือว่าอยากใช้ต่อ ไม่ปิด
  bar.style.animationDuration = `${AUTO_CLOSE_MS}ms`;
  document.body.classList.add("announce"); // โชว์แค่แบนเนอร์ให้กะทัดรัด
  closeTimer = setTimeout(() => window.close(), AUTO_CLOSE_MS);
  const keep = () => {
    clearTimeout(closeTimer);
    bar.remove();
    document.body.classList.remove("announce");
  };
  for (const evt of ["pointerover", "pointerdown", "keydown"]) {
    document.addEventListener(evt, keep, { once: true });
  }
}

const { lastEvent } = await chrome.storage.session.get("lastEvent");
if (lastEvent && Date.now() - lastEvent.at < 6000) showBanner(lastEvent, true);

function renderDeleted(n) {
  deletedEl.textContent = (n ?? 0).toLocaleString();
}
chrome.storage.session.get("deletedCount").then((r) => renderDeleted(r.deletedCount));

const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
tabUrl = tab?.url ?? null;
await render();
