export const runtime = "edge";

import { NextResponse } from "next/server";
import { ACTMAPI_CONFIG, isActmapiConfigured } from "@/lib/mapConfig";

export const dynamic = "force-dynamic";

export async function GET() {
  const catalogueUrl = process.env.NEXT_PUBLIC_DESIGN_CATALOGUE_URL?.trim() ?? "";

  return NextResponse.json({
    hasActmapiBlockUrl: Boolean(ACTMAPI_CONFIG.blockUrl),
    hasActmapiDivisionUrl: Boolean(ACTMAPI_CONFIG.divisionUrl),
    hasActmapiAddressesUrl: Boolean(ACTMAPI_CONFIG.addressesUrl),
    actmapiConfigured: isActmapiConfigured(),
    hasDesignCatalogueUrl: Boolean(catalogueUrl),
    runtime: "edge"
  });
}
