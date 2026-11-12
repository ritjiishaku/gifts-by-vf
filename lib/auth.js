import { createHash, createHmac, timingSafeEqual } from "crypto";

export const SESSION_COOKIE = "vf_admin";
const SESSION_TTL = 12 * 60 * 60 * 1000;

function secret() {
  // Never fall back to a hard-coded value: a known secret would let anyone
  // forge an admin session cookie. Fail closed if nothing is configured.
  const cookieSecret = String(process.env.ADMIN_COOKIE_SECRET || "").trim();
  if (cookieSecret) return cookieSecret;

  const passHash = String(process.env.ADMIN_PASS_HASH || "").trim();
  return /^[a-f0-9]{64}$/i.test(passHash) ? passHash : "";
}

export function verifyPassword(input) {
  const expected = String(process.env.ADMIN_PASS_HASH || "").trim();
  if (!/^[a-f0-9]{64}$/i.test(expected)) return false;

  const derived = createHash("sha256").update(String(input || "")).digest("hex");
  const a = Buffer.from(derived);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function createSessionCookieValue() {
  const key = secret();
  if (!key) {
    throw new Error(
      "Admin session secret is not configured. Set ADMIN_COOKIE_SECRET (or ADMIN_PASS_HASH)."
    );
  }
  const expires = Date.now() + SESSION_TTL;
  const payload = Buffer.from(JSON.stringify({ exp: expires })).toString("base64url");
  const sig = createHmac("sha256", secret()).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function verifySessionCookieValue(token) {
  if (!token || !String(token).includes(".")) return false;
  const key = secret();
  if (!key) return false;
  const [payload, sig] = String(token).split(".");
  if (!payload || !sig) return false;
  const expected = createHmac("sha256", key).update(payload).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (typeof data.exp !== "number" || data.exp < Date.now()) return false;
    return true;
  } catch (err) {
    return false;
  }
}