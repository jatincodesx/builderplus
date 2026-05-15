export const runtime = "edge";

import { NextRequest, NextResponse } from "next/server";
import { parcelsByBbox } from "@/lib/actmapi";
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

  const parcels = await parcelsByBbox(bbox as BBox);
  return NextResponse.json(parcels);
}
