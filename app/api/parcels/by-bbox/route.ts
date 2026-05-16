export const runtime = "edge";

import { NextRequest, NextResponse } from "next/server";
import { getProvider, getDefaultJurisdiction } from "@/lib/parcels/registry";
import { inferJurisdiction } from "@/lib/parcels/types";
import type { BBox } from "@/types/geo";

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("bbox") ?? "";
  const bbox = raw.split(",").map(Number);

  if (bbox.length !== 4 || bbox.some((value) => !Number.isFinite(value))) {
    return NextResponse.json(
      { error: "bbox must be west,south,east,north" },
      { status: 400 }
    );
  }

  const jurisdiction =
    request.nextUrl.searchParams.get("jurisdiction") ??
    inferJurisdiction((bbox[1] + bbox[3]) / 2, (bbox[0] + bbox[2]) / 2) ??
    getDefaultJurisdiction();

  const provider = getProvider(jurisdiction);

  if (!provider.getParcelsByBbox) {
    return NextResponse.json({
      type: "FeatureCollection",
      features: [],
      fallbackReason: `Bbox parcel query is not supported for ${jurisdiction}.`
    });
  }

  try {
    const parcels = await provider.getParcelsByBbox(bbox as BBox);
    return NextResponse.json(parcels);
  } catch (error) {
    console.warn(`Parcel by-bbox query failed for ${jurisdiction}:`, error);
    return NextResponse.json({
      type: "FeatureCollection",
      features: [],
      fallbackReason: "Parcel data is temporarily unavailable for this location."
    });
  }
}
