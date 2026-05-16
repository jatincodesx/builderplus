export const runtime = "edge";

import { NextRequest, NextResponse } from "next/server";
import { getProvider, getDefaultJurisdiction } from "@/lib/parcels/registry";

export async function GET(request: NextRequest) {
  const division = request.nextUrl.searchParams.get("division") ?? "";
  const jurisdiction =
    request.nextUrl.searchParams.get("jurisdiction") ?? getDefaultJurisdiction();
  const selectableOnly =
    request.nextUrl.searchParams.get("selectableOnly") === "true";
  const includeContext =
    request.nextUrl.searchParams.get("includeContext") !== "false";

  if (!division.trim()) {
    return NextResponse.json({ error: "division is required" }, { status: 400 });
  }

  const provider = getProvider(jurisdiction);

  try {
    const parcels = await provider.getParcelsBySuburb(division, {
      selectableOnly,
      includeContext
    });
    return NextResponse.json(parcels);
  } catch (error) {
    console.warn(`Parcel by-suburb query failed for ${jurisdiction}:`, error);
    return NextResponse.json({
      type: "FeatureCollection",
      features: [],
      fallbackReason: "Parcel data is temporarily unavailable for this location."
    });
  }
}
