import type { HouseDesign } from "@/types/design";
import { loadLocalDesignCatalogue } from "./localCatalogue";

export type CatalogueSource = "remote-s3" | "local-fallback" | "local-default";

export type CatalogueResult = {
  designs: HouseDesign[];
  source: CatalogueSource;
};

export const DESIGN_CATALOGUE_URL = process.env.NEXT_PUBLIC_DESIGN_CATALOGUE_URL?.trim() ?? "";

const FETCH_TIMEOUT_MS = 5000;

let cachedResult: CatalogueResult | null = null;

export async function loadS3DesignCatalogue(): Promise<CatalogueResult> {
  if (cachedResult) return cachedResult;

  if (!DESIGN_CATALOGUE_URL) {
    const designs = await loadLocalDesignCatalogue();
    cachedResult = { designs, source: "local-default" };
    return cachedResult;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(DESIGN_CATALOGUE_URL, {
        headers: { Accept: "application/json" },
        signal: controller.signal
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      if (process.env.NODE_ENV !== "production") {
        console.warn(`[BuilderPlus] S3 catalogue fetch failed (${response.status}), falling back to local.`);
      }
      const designs = await loadLocalDesignCatalogue();
      cachedResult = { designs, source: "local-fallback" };
      return cachedResult;
    }

    const raw = await response.json();

    if (!Array.isArray(raw)) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[BuilderPlus] S3 catalogue response is not an array, falling back to local.");
      }
      const designs = await loadLocalDesignCatalogue();
      cachedResult = { designs, source: "local-fallback" };
      return cachedResult;
    }

    const designs = (raw as HouseDesign[]).filter(isValidHouseDesign);

    if (designs.length === 0) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[BuilderPlus] S3 catalogue had no valid records, falling back to local.");
      }
      const localDesigns = await loadLocalDesignCatalogue();
      cachedResult = { designs: localDesigns, source: "local-fallback" };
      return cachedResult;
    }

    cachedResult = { designs, source: "remote-s3" };
    return cachedResult;
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`[BuilderPlus] S3 catalogue error (${message}), falling back to local.`);
    }
    const designs = await loadLocalDesignCatalogue();
    cachedResult = { designs, source: "local-fallback" };
    return cachedResult;
  }
}

function isValidHouseDesign(design: HouseDesign): boolean {
  if (!design || typeof design !== "object") return false;
  if (typeof design.id !== "string" || !design.id) return false;
  if (typeof design.name !== "string" || !design.name) return false;
  if (typeof design.floorAreaSqm !== "number" || design.floorAreaSqm <= 0) return false;
  return true;
}

export function clearCatalogueCache(): void {
  cachedResult = null;
}
