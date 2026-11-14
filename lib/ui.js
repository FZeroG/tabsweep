// Helpers ที่ popup กับ options ใช้ร่วมกัน
import { t } from "./i18n.js";

export const modeName = (mode) => t(mode === "close" ? "modeClose" : "modeVisit");
const MODES = ["visit", "close"];

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
    ...shown.map((s) => el("span", { class: `chip ${s.mode}`, title: modeName(s.mode) },
      el("span", { class: "dot" }), s.domain))
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
      const detail = res.byDomain.map((d) => `${d.domain} ${d.count.toLocaleString()}`).join(" · ");
      setMsg(msgNode, t("sweepDone", res.total.toLocaleString(), detail), "ok");
    }
  } catch (err) {
    setMsg(msgNode, t("sweepFailed", err.message), "err");
  } finally {
    button.disabled = false;
    button.classList.remove("running");
  }
}
