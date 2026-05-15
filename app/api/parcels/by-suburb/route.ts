export const runtime = "edge";

import { NextRequest, NextResponse } from "next/server";
import { parcelsBySuburb } from "@/lib/actmapi";

export async function GET(request: NextRequest) {
  const division = request.nextUrl.searchParams.get("division") ?? "";
  const selectableOnly =
    request.nextUrl.searchParams.get("selectableOnly") === "true";
  const includeContext =
    request.nextUrl.searchParams.get("includeContext") !== "false";

  if (!division.trim()) {
    return NextResponse.json({ error: "division is required" }, { status: 400 });
  }

  const parcels = await parcelsBySuburb(division, {
    selectableOnly,
    includeContext
  });
  return NextResponse.json(parcels);
}
