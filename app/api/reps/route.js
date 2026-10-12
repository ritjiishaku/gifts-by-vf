import { NextResponse } from "next/server";
import { getRepByRepId, getRepDashboard } from "@/lib/data";
import { isActiveRep } from "@/lib/format";
import { verifyPin, hashPin } from "@/lib/rep-pin";
import { supabase } from "@/lib/supabase";

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

  const action = String(body?.action || "login").trim();
  const repCode = String(body?.rep || "").trim();
  const pin = String(body?.pin || "").trim();
  const newPin = String(body?.newPin || "").trim();
  const confirmPin = String(body?.confirmPin || "").trim();

  if (!repCode) {
    return NextResponse.json({ error: "Enter your rep code." }, { status: 400 });
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
  if (!rep || !isActiveRep(rep)) {
    return NextResponse.json({ error: "Invalid rep code." }, { status: 401 });
  }

  // --- ACTION: setup-pin (First-time PIN setup) ---
  if (action === "setup-pin") {
    if (rep.pin_hash) {
      return NextResponse.json(
        { error: "A PIN has already been set for this account. Please sign in with your PIN or contact the owner if you forgot it." },
        { status: 400 }
      );
    }

    if (!newPin || newPin.length < 4) {
      return NextResponse.json(
        { error: "PIN must be at least 4 digits or characters." },
        { status: 400 }
      );
    }

    if (confirmPin && newPin !== confirmPin) {
      return NextResponse.json(
        { error: "PINs do not match. Please re-enter." },
        { status: 400 }
      );
    }

    const hashed = hashPin(newPin);
    const { error: updateError } = await supabase()
      .from("sales_reps")
      .update({ pin_hash: hashed })
      .eq("id", rep.id);

    if (updateError) {
      console.error("[api/reps] setup-pin error:", updateError.message);
      return NextResponse.json(
        { error: "Could not save your PIN right now. Please try again." },
        { status: 500 }
      );
    }

    const dashboard = await getRepDashboard(repCode);
    const { pin_hash, ...safeRep } = dashboard.rep;

    return NextResponse.json(
      { rep: safeRep, payouts: dashboard.payouts, pinCreated: true },
      { headers: { "Cache-Control": "no-store" } }
    );
  }

  // --- ACTION: login / check ---
  // If rep has NO PIN set yet, trigger first-time setup!
  if (!rep.pin_hash) {
    return NextResponse.json({
      needsPinSetup: true,
      repCode: rep.rep_id,
      repName: rep.name || rep.rep_id,
      message: `Welcome, ${rep.name || rep.rep_id}! Please set a 4-digit PIN for your account.`,
    });
  }

  if (!pin) {
    return NextResponse.json({ error: "Enter your PIN." }, { status: 400 });
  }

  if (!verifyPin(pin, rep.pin_hash)) {
    return NextResponse.json({ error: "Invalid rep code or PIN." }, { status: 401 });
  }

  const dashboard = await getRepDashboard(repCode);
  const { pin_hash, ...safeRep } = dashboard.rep;

  return NextResponse.json(
    { rep: safeRep, payouts: dashboard.payouts },
    { headers: { "Cache-Control": "no-store" } }
  );
}

// Read-only status check used by the rep login screen to decide whether to show
// the "Set up your PIN" link. Returns just { found, hasPin } — never the name,
// PIN hash, or payouts. Deliberately NOT tied to the POST login brute-force
// throttle (this is called while typing, and must not lock out real logins).
export async function GET(request) {
  const headers = { "Cache-Control": "no-store" };
  const repCode = String(new URL(request.url).searchParams.get("rep") || "").trim();
  if (!repCode) {
    return NextResponse.json({ found: false }, { headers });
  }

  const rep = await getRepByRepId(repCode);
  if (!rep || !isActiveRep(rep)) {
    return NextResponse.json({ found: false }, { headers });
  }

  return NextResponse.json({ found: true, hasPin: Boolean(rep.pin_hash) }, { headers });
}