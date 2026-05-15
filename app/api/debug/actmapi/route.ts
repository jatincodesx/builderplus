export const runtime = "edge";

import { NextResponse } from "next/server";
import { getActmapiDebug } from "@/lib/actmapi";

export const dynamic = "force-dynamic";

export async function GET() {
  const debug = await getActmapiDebug();
  return NextResponse.json(debug);
}
