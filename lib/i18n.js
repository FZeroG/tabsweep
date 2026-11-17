// ภาษา UI: "auto" (ตาม browser) | "th" | "en" — เลือกได้ในหน้า Options
// โหลด _locales/<lang>/messages.json เอง (ไฟล์ใน extension ไม่ใช่ network) เพราะ chrome.i18n
// สลับภาษาระหว่างใช้งานไม่ได้ ส่วนชื่อ/คำอธิบายใน manifest ยังตามภาษา browser
// เรียก `await initI18n()` ก่อนใช้ t()

export const LANGS = ["auto", "th", "en"];
let dict = null;
let fallback = null;
let current = "en";

async function load(locale) {
  const res = await fetch(chrome.runtime.getURL(`_locales/${locale}/messages.json`));
  return res.json();
}

export function resolveLang(pref, uiLanguage) {
  if (pref === "th" || pref === "en") return pref;
  return String(uiLanguage || "").toLowerCase().startsWith("th") ? "th" : "en";
}

export async function initI18n() {
  const { lang = "auto" } = await chrome.storage.local.get("lang");
  current = resolveLang(lang, chrome.i18n.getUILanguage());
  try {
    [dict, fallback] = await Promise.all([load(current), current === "en" ? null : load("en")]);
  } catch (err) {
    console.error("[HistoryClean] i18n", err); // ใช้ chrome.i18n แทน (ภาษาตาม browser)
    dict = fallback = null;
  }
  document.documentElement.lang = current;
  return current;
}

export function currentLang() {
  return current;
}

// แทน $1..$9 และ $$ แบบเดียวกับ chrome.i18n.getMessage
export function format(message, subs = []) {
  return message.replace(/\$(\$|\d)/g, (_, x) => (x === "$" ? "$" : String(subs[Number(x) - 1] ?? "")));
}

export function t(key, ...subs) {
  const message = dict?.[key]?.message ?? fallback?.[key]?.message;
  if (message == null) return chrome.i18n.getMessage(key, subs.map(String)) || key;
  return format(message, subs);
}

// ข้อความที่มี element แทรก เช่น "จะลบ $1 และ $2" -> ["จะลบ ", <code>, " และ ", <code>]
// ถ้าคำแปลลืมใส่ $n ตัวไหน จะต่อ element นั้นไว้ท้ายข้อความ (ไม่ให้หายเงียบ)
const MARK = "⁣";
export function tNodes(key, ...nodes) {
  const msg = t(key, ...nodes.map((_, i) => `${MARK}${i}${MARK}`));
  const used = new Set();
  const parts = msg
    .split(new RegExp(`${MARK}(\\d)${MARK}`))
    .map((part, i) => {
      if (i % 2 === 0) return part;
      const node = nodes[Number(part)];
      // $1 ซ้ำในข้อความ -> element เดียวกันใส่ DOM ได้ที่เดียว จึง clone ตัวถัดไป
      if (used.has(node) && node?.cloneNode) return node.cloneNode(true);
      used.add(node);
      return node;
    })
    .filter((part) => part !== "");
  for (const node of nodes) if (!used.has(node)) parts.push(" ", node);
  return parts;
}

// ใส่คำแปลให้ HTML:
//   <h1 data-i18n="headline">            -> textContent
//   <input data-i18n-attr="placeholder:domainPlaceholder;aria-label:add">
export function localize(root = document) {
  for (const node of root.querySelectorAll("[data-i18n]")) {
    node.textContent = t(node.dataset.i18n);
  }
  for (const node of root.querySelectorAll("[data-i18n-attr]")) {
    for (const pair of node.dataset.i18nAttr.split(";")) {
      const [attr, key] = pair.split(":").map((s) => s.trim());
      if (attr && key) node.setAttribute(attr, t(key));
    }
  }
}
