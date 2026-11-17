// รหัสผ่านสำหรับเปิดดูเว็บที่ซ่อน (ไม่บังคับตั้ง)
// เป็น "ล็อกหน้าจอ" เท่านั้น: รายการเว็บใน storage ยังไม่ได้เข้ารหัส คนที่เปิด DevTools ของ extension ยังอ่านได้
// เก็บแค่ salt + PBKDF2-SHA256 hash (ไม่เก็บรหัสจริง) — ลืมรหัสแล้วกู้คืนไม่ได้
export const MIN_PASSWORD = 4;
// OWASP Password Storage Cheat Sheet แนะนำ PBKDF2-HMAC-SHA256 ≥ 600,000 รอบ
const ITERATIONS = 600_000;
const enc = new TextEncoder();

const toB64 = (bytes) => btoa(String.fromCharCode(...bytes));
const fromB64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function derive(password, salt, iterations) {
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations }, key, 256);
  return new Uint8Array(bits);
}

export async function makeLock(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derive(password, salt, ITERATIONS);
  return { v: 1, iter: ITERATIONS, salt: toB64(salt), hash: toB64(hash) };
}

export function isValidLock(lock) {
  return !!lock && typeof lock === "object" && lock.v === 1 &&
    Number.isInteger(lock.iter) && lock.iter >= 100_000 && lock.iter <= 10_000_000 &&
    typeof lock.salt === "string" && typeof lock.hash === "string";
}

export async function checkLock(password, lock) {
  if (!isValidLock(lock) || typeof password !== "string") return false;
  let expected;
  try {
    expected = fromB64(lock.hash);
    const got = await derive(password, fromB64(lock.salt), lock.iter);
    if (got.length !== expected.length) return false;
    let diff = 0;
    for (let i = 0; i < got.length; i++) diff |= got[i] ^ expected[i]; // เทียบแบบไม่หยุดกลางทาง
    return diff === 0;
  } catch {
    return false;
  }
}

export async function getLock() {
  const { lock } = await chrome.storage.local.get("lock");
  return isValidLock(lock) ? lock : null;
}
