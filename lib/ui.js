// Helpers ที่ popup กับ options ใช้ร่วมกัน
import { t } from "./i18n.js";

export const modeName = (mode) => t(mode === "close" ? "modeClose" : "modeVisit");
const MODES = ["visit", "close"];

// ---------- ซ่อนเว็บ (กันคนแอบมองจอ) ----------
// เว็บ "ลับ" = เปิด "ซ่อนทุกเว็บ" หรือเว็บนั้นตั้ง hidden: true — และยังไม่ได้ปลดล็อกดูในหน้านี้
// ความยาว mask คงที่ ไม่บอกใบ้ความยาวชื่อจริง; สถานะปลดล็อกอยู่แค่ในหน้านี้ ไม่บันทึก
export const MASK = "••••••";
let hideAll = false;
let revealed = false;
let siteMap = new Map();

export function setPrivacy(sites, hideAllSites) {
  siteMap = new Map(sites.map((s) => [s.domain, s]));
  hideAll = !!hideAllSites;
}
export const setRevealed = (v) => { revealed = !!v; };
export const isRevealed = () => revealed;
export const isSecret = (domain) => !revealed && (hideAll || siteMap.get(domain)?.hidden === true);
// มีเว็บที่ตั้งซ่อนไว้ไหม (ไม่สนว่าปลดล็อกอยู่หรือเปล่า) — ใช้ตัดสินใจว่าจะโชว์ปุ่มตาไหม
export const hasHiddenSites = () => (hideAll ? siteMap.size > 0 : [...siteMap.values()].some((s) => s.hidden === true));
export const shown = (domain) => (isSecret(domain) ? MASK : domain);
// เรียงตามชื่อ แต่เว็บที่ซ่อนไว้ท้ายสุดตามลำดับที่เพิ่ม — ไม่งั้นตำแหน่งในลำดับอักษรจะบอกใบ้ชื่อ
export function sortSites(sites) {
  const open = sites.filter((s) => !isSecret(s.domain)).sort((a, b) => a.domain.localeCompare(b.domain));
  return [...open, ...sites.filter((s) => isSecret(s.domain))];
}
// สำหรับ aria-label / title: screen reader ไม่ต้องอ่านจุด
export const spoken = (domain) => (isSecret(domain) ? t("hiddenSite") : domain);

// ปุ่มรูปตา: onToggle() ถูกเรียกเมื่อกด (async ได้) — ผู้เรียกปลดล็อก/ล็อกแล้ววาดใหม่เอง
export function eyeButton(onToggle) {
  const btn = el("button", { type: "button", class: "btn btn-ghost btn-icon eye" });
  const sync = () => {
    const label = revealed ? t("hideNamesNow") : t("revealNames");
    btn.title = label;
    btn.setAttribute("aria-label", label);
    btn.setAttribute("aria-pressed", String(revealed));
    // แบบช่องรหัสผ่าน: ตอนซ่อนโชว์รูปตา (กดเพื่อดู), ตอนแสดงโชว์ตาขีดฆ่า (กดเพื่อซ่อน)
    btn.replaceChildren(eyeIcon(revealed));
  };
  btn.addEventListener("click", async () => { await onToggle(); sync(); });
  btn.sync = sync;
  sync();
  return btn;
}

// ---------- กล่องโต้ตอบ (รหัสผ่าน / ยืนยัน) ----------
// fields: [{ name, label, autocomplete }] (ช่องรหัสผ่านทั้งหมด)
// validate(values) → ข้อความ error (กล่องยังเปิดอยู่) หรือ null (ปิดแล้วคืน values) — กดยกเลิกคืน null
export function formDialog({ title, note = "", fields = [], ok = t("pwOk"), danger = false, validate, extraButton }) {
  return new Promise((resolve) => {
    const inputs = fields.map((f) => el("input", {
      class: "input", type: "password", name: f.name, autocomplete: f.autocomplete ?? "off",
      spellcheck: "false", "aria-label": f.label,
    }));
    const err = el("p", { class: "dlg-err", role: "alert" });
    const submit = el("button", { type: "submit", class: `btn ${danger ? "btn-danger" : "btn-ink"}` }, ok);
    let done = false;
    const dlg = el("dialog", { class: "modal" });
    const close = (value) => {
      if (done) return;
      done = true;
      dlg.close();
      dlg.remove();
      resolve(value);
    };
    const form = el("form", { class: "dlg", novalidate: true },
      el("h2", {}, title),
      note ? el("p", { class: "dlg-note" }, note) : null,
      ...fields.map((f, i) => el("label", { class: "dlg-field" }, el("span", {}, f.label), inputs[i])),
      err,
      el("div", { class: "dlg-actions" },
        extraButton ? el("button", {
          type: "button", class: "link dlg-extra",
          onclick: () => { close(null); extraButton.onClick(); },
        }, extraButton.label) : null,
        el("button", { type: "button", class: "btn btn-ghost", onclick: () => close(null) }, t("cancel")),
        submit
      )
    );
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const values = Object.fromEntries(inputs.map((i) => [i.name, i.value]));
      submit.disabled = true;
      const msg = validate ? await validate(values) : null;
      submit.disabled = false;
      if (msg) {
        err.textContent = msg;
        inputs[0]?.select();
        return;
      }
      close(values);
    });
    dlg.addEventListener("cancel", (e) => { e.preventDefault(); close(null); });
    dlg.append(form);
    document.body.append(dlg);
    dlg.showModal();
    inputs[0]?.focus();
  });
}

// ปลดล็อกดูเว็บที่ซ่อน: ไม่ได้ตั้งรหัส → ผ่านเลย, ตั้งไว้ → ต้องใส่รหัสถูก
export async function unlock(lock, checkLock, { onForgot } = {}) {
  if (revealed || !lock) {
    revealed = true;
    return true;
  }
  const res = await formDialog({
    title: t("pwTitleUnlock"),
    fields: [{ name: "pw", label: t("pwLabel"), autocomplete: "off" }],
    validate: async ({ pw }) => ((await checkLock(pw, lock)) ? null : t("pwWrong")),
    extraButton: onForgot ? { label: t("lockForgot"), onClick: onForgot } : null,
  });
  if (!res) return false;
  revealed = true;
  return true;
}

function eyeIcon(closed) {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "1.8");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.setAttribute("aria-hidden", "true");
  const paths = ["M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"];
  if (closed) paths.push("M4 4l16 16");
  for (const d of paths) {
    const p = document.createElementNS(ns, "path");
    p.setAttribute("d", d);
    svg.append(p);
  }
  if (!closed) {
    const c = document.createElementNS(ns, "circle");
    c.setAttribute("cx", "12");
    c.setAttribute("cy", "12");
    c.setAttribute("r", "3");
    svg.append(c);
  }
  return svg;
}

// สร้าง element แบบสั้นๆ: el("div", { class: "x" }, child1, "text")
export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === "class") node.className = v;
    else if (k.startsWith("on")) node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v === true ? "" : v);
  }
  node.append(...children.filter((c) => c != null));
  return node;
}

let segId = 0;

// segmented control โหมด (radio) — onChange(mode)
export function modeSeg(selected, onChange, label = t("modeLabel")) {
  const name = `mode-${++segId}`;
  const fs = el("fieldset", { class: "seg", "aria-label": label });
  for (const value of MODES) {
    const id = `${name}-${value}`;
    const input = el("input", { type: "radio", name, id, value, checked: value === selected });
    input.addEventListener("change", () => input.checked && onChange?.(value));
    fs.append(input, el("label", { for: id }, el("span", { class: "dot" }), modeName(value)));
  }
  fs.getValue = () => fs.querySelector("input:checked")?.value;
  return fs;
}

// ป้ายรายชื่อเว็บ (สีตามโหมด) — ใช้บอกว่า "ลบเดี๋ยวนี้" จะลบเว็บไหนบ้าง
// omitSecret: ไม่ใส่เว็บที่ซ่อนเลย (popup) — ไม่งั้นแสดงเป็น ••••••
export function siteChips(sites, max = Infinity, { omitSecret = false } = {}) {
  const sorted = sortSites(sites.filter((s) => !omitSecret || !isSecret(s.domain)));
  const visible = sorted.slice(0, max);
  const wrap = el("div", { class: "chips" },
    ...visible.map((s) => el("span", {
      class: `chip ${s.mode}${s.data === true ? " data" : ""}${isSecret(s.domain) ? " masked" : ""}`,
      title: s.data === true ? `${modeName(s.mode)} · ${t("dataShort")}` : modeName(s.mode),
    },
      el("span", { class: "dot" }), shown(s.domain)))
  );
  if (sorted.length > visible.length) {
    wrap.append(el("span", { class: "chip more" }, `+${sorted.length - visible.length}`));
  }
  return wrap;
}

// สวิตช์เล็กต่อเว็บ — onChange(checked, input)
function miniSwitch({ checked, disabled = false, onChange, label, aria, title, cls }) {
  const input = el("input", {
    type: "checkbox", class: "switch switch-sm", role: "switch", checked, disabled, "aria-label": aria,
  });
  input.addEventListener("change", () => onChange(input.checked, input));
  return el("label", { class: `mini-switch ${cls}`, title }, input, el("span", {}, label));
}

export const dataSwitch = (checked, onChange, domain) => miniSwitch({
  checked, onChange, label: t("dataShort"), aria: t("dataAria", spoken(domain)), title: t("dataTitle"), cls: "data-switch",
});

export const hideSwitch = (checked, onChange, domain, disabled = false) => miniSwitch({
  checked, disabled, onChange, label: t("hideShort"), aria: t("hideAria", spoken(domain)), title: t("hideTitle"), cls: "hide-switch",
});

// สวิตช์เปิด/ปิด — onChange(checked)
export function toggle(id, checked, onChange) {
  const input = el("input", { type: "checkbox", id, class: "switch", role: "switch", checked });
  input.addEventListener("change", () => onChange(input.checked));
  return input;
}

export function monogram(domain, mode) {
  return el("div", { class: `monogram ${mode ?? ""}`, "aria-hidden": "true" }, (domain || "?")[0]);
}

// monogram ของเว็บที่อยู่ในรายการ — ตอนซ่อนชื่อ ไม่โชว์ตัวอักษรแรก
export function siteMonogram(domain, mode) {
  return monogram(isSecret(domain) ? "•" : domain, mode);
}

export function setMsg(node, text, kind = "") {
  node.className = node.className.replace(/\b(ok|err)\b/g, "").trim();
  if (kind) node.classList.add(kind);
  node.textContent = text;
}

// ส่งคำสั่ง "ลบเดี๋ยวนี้" ให้ background พร้อม animation บนปุ่ม
// omitSecret: ไม่แสดงผลรายเว็บของเว็บที่ซ่อน (popup)
export async function runSweep(button, msgNode, { omitSecret = false } = {}) {
  button.disabled = true;
  button.classList.add("running");
  setMsg(msgNode, t("sweeping"));
  try {
    const res = await chrome.runtime.sendMessage({ type: "sweepNow" });
    if (!res?.ok) throw new Error(res?.error ?? t("noReply"));
    const dataNote = res.dataCleared ? " " + t("sweepDataNote", res.dataCleared) : "";
    if (!res.total) {
      setMsg(msgNode, t("nothingToDelete") + dataNote, "ok");
    } else {
      const detail = res.byDomain
        .filter((d) => !omitSecret || !isSecret(d.domain))
        .map((d) => `${shown(d.domain)} ${d.count.toLocaleString()}`)
        .join(" · ");
      const msg = detail ? t("sweepDone", res.total.toLocaleString(), detail) : t("sweepDoneTotal", res.total.toLocaleString());
      setMsg(msgNode, msg + dataNote, "ok");
    }
  } catch (err) {
    setMsg(msgNode, t("sweepFailed", err.message), "err");
  } finally {
    button.disabled = false;
    button.classList.remove("running");
  }
}
