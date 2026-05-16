export const runtime = "edge";

import { NextRequest, NextResponse } from "next/server";
import { getProvider, getDefaultJurisdiction } from "@/lib/parcels/registry";
import { inferJurisdictionFromText } from "@/lib/parcels/types";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q") ?? "";
  const jurisdiction =
    request.nextUrl.searchParams.get("jurisdiction") ??
    inferJurisdictionFromText(q) ??
    getDefaultJurisdiction();

  const provider = getProvider(jurisdiction);

  if (!provider.searchSuburb) {
    return NextResponse.json({ results: [] });
  }

  try {
    const results = await provider.searchSuburb(q);
    return NextResponse.json({ results });
  } catch (error) {
    console.warn(`Suburb search failed for ${jurisdiction}:`, error);
    return NextResponse.json({ results: [] });
  }
}
