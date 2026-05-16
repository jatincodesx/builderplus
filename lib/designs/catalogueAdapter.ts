import type { HouseDesign } from "@/types/design";
import { DESIGN_CATALOGUE_URL, loadS3DesignCatalogue } from "./s3Catalogue";
import { loadLocalDesignCatalogue } from "./localCatalogue";
import type { CatalogueResult, CatalogueSource } from "./s3Catalogue";

export type DesignCatalogueAdapter = {
  id: string;
  label: string;
  loadDesigns(): Promise<HouseDesign[]>;
  loadDesignsWithSource?(): Promise<CatalogueResult>;
};

export const localDemoCatalogueAdapter: DesignCatalogueAdapter = {
  id: "local_demo",
  label: "Local demo catalogue",
  loadDesigns: loadLocalDesignCatalogue,
  loadDesignsWithSource: async () => {
    const designs = await loadLocalDesignCatalogue();
    return { designs, source: "local-default" as CatalogueSource };
  }
};

export const s3CatalogueAdapter: DesignCatalogueAdapter = {
  id: "s3_catalogue",
  label: "S3 design catalogue",
  loadDesigns: async () => (await loadS3DesignCatalogue()).designs,
  loadDesignsWithSource: loadS3DesignCatalogue
};

export function getActiveAdapter(): DesignCatalogueAdapter {
  if (DESIGN_CATALOGUE_URL) {
    return s3CatalogueAdapter;
  }

  return localDemoCatalogueAdapter;
}
