"use client";

const REF_KEY = "vf_referral";
const NEW_KEY = "vf_ref_new";
const MAX_AGE = 30 * 24 * 60 * 60 * 1000;
const NAME_MAX = 60;

let ref = null;
const listeners = new Set();

export function getReferral() {
  return ref;
}

export function setReferral(value) {
  ref = value;
  listeners.forEach((fn) => fn());
}

export function subscribeReferral(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// Normalise a display name before persisting it (defensive: this value ends up
// in WhatsApp messages). Returns "" when there is nothing usable.
function cleanName(value) {
  const name = String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, NAME_MAX);
  return name || "";
}

export function readStoredReferral() {
  try {
    const raw = localStorage.getItem(REF_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.rep_id || Date.now() - parsed.arrive_at > MAX_AGE) {
      localStorage.removeItem(REF_KEY);
      return null;
    }
    // Older entries only stored rep_id — fall back to it for the display name.
    const name = cleanName(parsed.name);
    return { rep_id: parsed.rep_id, name: name || parsed.rep_id };
  } catch (e) {
    return null;
  }
}

export function storeReferral(repId, name) {
  try {
    const clean = String(repId).replace(/[^a-z0-9_-]/gi, "").toLowerCase().slice(0, 30);
    if (!clean) return null;
    const entry = { rep_id: clean, arrive_at: Date.now() };
    const display = cleanName(name);
    if (display) entry.name = display;
    localStorage.setItem(REF_KEY, JSON.stringify(entry));
    return clean;
  } catch (e) {
    return null;
  }
}

// Backfill/refresh the display name on an existing stored referral without
// extending the 30-day window (arrive_at is preserved).
export function updateStoredReferralName(repId, name) {
  try {
    const display = cleanName(name);
    if (!display) return;
    const raw = localStorage.getItem(REF_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (!parsed || String(parsed.rep_id || "").trim().toLowerCase() !== String(repId || "").trim().toLowerCase()) return;
    if (parsed.name === display) return;
    localStorage.setItem(REF_KEY, JSON.stringify({ ...parsed, name: display }));
  } catch (e) {}
}

export function clearReferral() {
  try {
    localStorage.removeItem(REF_KEY);
    localStorage.removeItem(NEW_KEY);
  } catch (e) {}
  setReferral(null);
}

export { REF_KEY, NEW_KEY };