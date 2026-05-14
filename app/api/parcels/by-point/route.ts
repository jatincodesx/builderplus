import { NextRequest, NextResponse } from "next/server";
import { parcelByPoint } from "@/lib/actmapi";

export async function GET(request: NextRequest) {
  const lat = Number(request.nextUrl.searchParams.get("lat"));
  const lng = Number(request.nextUrl.searchParams.get("lng"));

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "lat and lng are required" }, { status: 400 });
  }

  const parcel = await parcelByPoint(lat, lng);
  return NextResponse.json({
    result: parcel,
    ...(parcel?.properties.fallbackReason
      ? { fallbackReason: parcel.properties.fallbackReason }
      : {})
  });
}
