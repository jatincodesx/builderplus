export const runtime = "edge";

import { NextResponse } from "next/server";
import { getAllProviderStatuses } from "@/lib/parcels/registry";

export const dynamic = "force-dynamic";

export async function GET() {
  const statuses = await getAllProviderStatuses();
  const masked = statuses.map((s) => ({
    id: s.id,
    jurisdiction: s.id,
    label: s.label,
    status: s.status,
    configured: s.configured,
    live: s.live,
    supportsAddressSearch: s.supportsAddressSearch,
    supportsSuburbSearch: s.supportsSuburbSearch,
    supportsParcelByPoint: s.supportsParcelByPoint,
    supportsBbox: s.supportsBbox,
    sourceUrl: maskUrl(s.sourceUrl),
    capabilities: s.capabilities,
    notes: s.notes
  }));
  return NextResponse.json({ providers: masked });
}

function maskUrl(url: string): string {
  if (!url) return "";
  try {
    const parsed = new URL(url);
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return url;
  }
}
