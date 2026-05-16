import type { HouseDesign } from "@/types/design";
import demoDesigns from "@/data/demoHouseDesigns.json";

export async function loadLocalDesignCatalogue(): Promise<HouseDesign[]> {
  const designs = demoDesigns as HouseDesign[];
  return designs.filter((design) => design.id && design.name && design.floorAreaSqm > 0);
}
