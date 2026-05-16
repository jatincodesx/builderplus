export const runtime = "edge";

import { NextRequest, NextResponse } from "next/server";
import { getProvider, getDefaultJurisdiction } from "@/lib/parcels/registry";
import { inferJurisdiction } from "@/lib/parcels/types";

export async function GET(request: NextRequest) {
  const lat = Number(request.nextUrl.searchParams.get("lat"));
  const lng = Number(request.nextUrl.searchParams.get("lng"));
  const jurisdiction =
    request.nextUrl.searchParams.get("jurisdiction") ??
    inferJurisdiction(lat, lng) ??
    getDefaultJurisdiction();

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "lat and lng are required" }, { status: 400 });
  }

  const provider = getProvider(jurisdiction);

  try {
    const parcel = await provider.getParcelByPoint(lat, lng);
    return NextResponse.json({
      result: parcel,
      ...(parcel?.properties.fallbackReason
        ? { fallbackReason: parcel.properties.fallbackReason }
        : {})
    });
  } catch (error) {
    console.warn(`Parcel by-point query failed for ${jurisdiction}:`, error);
    return NextResponse.json({
      result: null,
      fallbackReason: "Parcel data is temporarily unavailable for this location."
    });
  }
}
