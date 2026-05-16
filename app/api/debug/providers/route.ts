export const runtime = "edge";

import { NextResponse } from "next/server";
import { getAllProviderStatuses } from "@/lib/parcels/registry";

export const dynamic = "force-dynamic";

export async function GET() {
  const statuses = await getAllProviderStatuses();
  return NextResponse.json({ providers: statuses });
}
