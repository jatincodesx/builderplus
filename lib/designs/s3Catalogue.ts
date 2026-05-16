import type { HouseDesign } from "@/types/design";
import { loadLocalDesignCatalogue } from "./localCatalogue";

export const DESIGN_CATALOGUE_URL = process.env.NEXT_PUBLIC_DESIGN_CATALOGUE_URL?.trim() ?? "";

export async function loadS3DesignCatalogue(): Promise<HouseDesign[]> {
  if (!DESIGN_CATALOGUE_URL) {
    return loadLocalDesignCatalogue();
  }

  const response = await fetch(DESIGN_CATALOGUE_URL, {
    headers: { Accept: "application/json" }
  });

  if (!response.ok) {
    throw new Error(`Design catalogue request failed with ${response.status}`);
  }

  const records = (await response.json()) as HouseDesign[];
  return records.filter(isUsableHouseDesign);
}

function isUsableHouseDesign(design: HouseDesign): boolean {
  return Boolean(design.id && design.name && design.floorAreaSqm > 0);
}
