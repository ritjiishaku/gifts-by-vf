import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

const KEY_LEN = 64;

// Hash a rep PIN with scrypt (salt + hash, hex encoded as `salt:hash`).
// scrypt is a slow, memory-hard KDF, so it resists brute-force and rainbow
// tables without any extra dependencies.
export function hashPin(pin) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(String(pin || ""), salt, KEY_LEN).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPin(pin, stored) {
  const storedStr = String(stored || "");
  const parts = storedStr.split(":");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return false;
  const [salt, hash] = parts;
  const a = Buffer.from(scryptSync(String(pin || ""), salt, KEY_LEN).toString("hex"), "utf8");
  const b = Buffer.from(hash, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}