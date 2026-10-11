import { NextResponse } from "next/server";
import { getRepByRepId, getRepDashboard } from "@/lib/data";
import { isActiveRep } from "@/lib/format";
import { verifyPin } from "@/lib/rep-pin";

export const dynamic = "force-dynamic";

// Best-effort in-memory brute-force throttle. On a single serverless instance
// the map is per-instance, but it still blunts password guessing.
const ATTEMPT_LIMIT = 10;
const WINDOW_MS = 60 * 1000;
const attempts = new Map();

function tooManyAttempts(key) {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || now - entry.windowStart >= WINDOW_MS) {
    attempts.set(key, { count: 1, windowStart: now });
    return false;
  }
  entry.count += 1;
  attempts.set(key, entry);
  return entry.count > ATTEMPT_LIMIT;
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch (err) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const repCode = String(body?.rep || "").trim();
  const pin = String(body?.pin || "");
  if (!repCode || !pin) {
    return NextResponse.json({ error: "Enter your rep code and PIN." }, { status: 400 });
  }

  const ip = (request.headers.get("x-forwarded-for") || "").split(",")[0]?.trim() || "unknown";
  const key = `${ip}::${repCode.toLowerCase()}`;
  if (tooManyAttempts(key)) {
    return NextResponse.json(
      { error: "Too many attempts. Please try again in a minute." },
      { status: 429 }
    );
  }

  const rep = await getRepByRepId(repCode);
  // Same 401 for unknown/inactive rep or wrong PIN so codes can't be enumerated.
  if (!rep || !isActiveRep(rep) || !verifyPin(pin, rep.pin_hash)) {
    return NextResponse.json({ error: "Invalid rep code or PIN." }, { status: 401 });
  }

  const dashboard = await getRepDashboard(repCode);
  const { pin_hash, ...safeRep } = dashboard.rep;

  return NextResponse.json(
    { rep: safeRep, payouts: dashboard.payouts },
    { headers: { "Cache-Control": "no-store" } }
  );
}