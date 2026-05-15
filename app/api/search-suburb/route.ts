export const runtime = "edge";

import { NextRequest, NextResponse } from "next/server";
import { searchSuburbs } from "@/lib/actmapi";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q") ?? "";
  const results = await searchSuburbs(q);

  return NextResponse.json({ results });
}
