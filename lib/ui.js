// Helpers ที่ popup กับ options ใช้ร่วมกัน
import { t } from "./i18n.js";

export const modeName = (mode) => t(mode === "close" ? "modeClose" : "modeVisit");
const MODES = ["visit", "close"];

// ---------- ซ่อนชื่อเว็บ (กันคนแอบมองจอ) ----------
// ความยาว mask คงที่ ไม่บอกใบ้ความยาวชื่อจริง; สถานะ "กดดู" อยู่แค่ในหน้านี้ ไม่บันทึก
export const MASK = "••••••";
let hidden = false;
export const setHidden = (v) => { hidden = !!v; };
export const isHidden = () => hidden;
export const shown = (domain) => (hidden ? MASK : domain);
// สำหรับ aria-label / title: screen reader ไม่ต้องอ่านจุด
export const spoken = (domain) => (hidden ? t("hiddenSite") : domain);

// ปุ่มรูปตา: onToggle() ถูกเรียกเมื่อกด — ผู้เรียกสลับ setHidden แล้ววาดใหม่เอง
export function eyeButton(onToggle) {
  const btn = el("button", { type: "button", class: "btn btn-ghost btn-icon eye" });
  const sync = () => {
    const label = hidden ? t("revealNames") : t("hideNamesNow");
    btn.title = label;
    btn.setAttribute("aria-label", label);
    btn.setAttribute("aria-pressed", String(!hidden));
    // แบบช่องรหัสผ่าน: ตอนซ่อนโชว์รูปตา (กดเพื่อดู), ตอนแสดงโชว์ตาขีดฆ่า (กดเพื่อซ่อน)
    btn.replaceChildren(eyeIcon(!hidden));
  };
  btn.addEventListener("click", () => { onToggle(); sync(); });
  btn.sync = sync;
  sync();
  return btn;
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
export function siteChips(sites, max = Infinity) {
  const sorted = [...sites].sort((a, b) => a.domain.localeCompare(b.domain));
  const shown = sorted.slice(0, max);
  const wrap = el("div", { class: "chips" },
    ...shown.map((s) => el("span", { class: `chip ${s.mode}${hidden ? " masked" : ""}`, title: modeName(s.mode) },
      el("span", { class: "dot" }), hidden ? MASK : s.domain))
  );
  if (sorted.length > shown.length) {
    wrap.append(el("span", { class: "chip more" }, `+${sorted.length - shown.length}`));
  }
  return wrap;
}

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
  return monogram(hidden ? "•" : domain, mode);
}

export function setMsg(node, text, kind = "") {
  node.className = node.className.replace(/\b(ok|err)\b/g, "").trim();
  if (kind) node.classList.add(kind);
  node.textContent = text;
}

// ส่งคำสั่ง "ลบเดี๋ยวนี้" ให้ background พร้อม animation บนปุ่ม
export async function runSweep(button, msgNode) {
  button.disabled = true;
  button.classList.add("running");
  setMsg(msgNode, t("sweeping"));
  try {
    const res = await chrome.runtime.sendMessage({ type: "sweepNow" });
    if (!res?.ok) throw new Error(res?.error ?? t("noReply"));
    if (!res.total) {
      setMsg(msgNode, t("nothingToDelete"), "ok");
    } else {
      const detail = res.byDomain.map((d) => `${shown(d.domain)} ${d.count.toLocaleString()}`).join(" · ");
      setMsg(msgNode, t("sweepDone", res.total.toLocaleString(), detail), "ok");
    }
  } catch (err) {
    setMsg(msgNode, t("sweepFailed", err.message), "err");
  } finally {
    button.disabled = false;
    button.classList.remove("running");
  }
}
