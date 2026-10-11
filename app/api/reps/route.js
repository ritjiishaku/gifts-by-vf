import { NextResponse } from "next/server";
import { getRepDashboard } from "@/lib/data";
import { isActiveRep } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const rep = searchParams.get("rep") || "";
  if (!String(rep).trim()) {
    return NextResponse.json({ error: "Missing rep code." }, { status: 400 });
  }
  const dashboard = await getRepDashboard(rep);
  if (!dashboard || !isActiveRep(dashboard.rep)) {
    return NextResponse.json({ error: "That rep code was not found." }, { status: 404 });
  }
  return NextResponse.json(
    { rep: dashboard.rep, payouts: dashboard.payouts },
    { headers: { "Cache-Control": "no-store" } }
  );
}