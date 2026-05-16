import type { HouseDesign } from "@/types/design";
import { loadLocalDesignCatalogue } from "./localCatalogue";

export type DesignCatalogueAdapter = {
  id: string;
  label: string;
  loadDesigns(): Promise<HouseDesign[]>;
};

export const localDemoCatalogueAdapter: DesignCatalogueAdapter = {
  id: "local_demo",
  label: "Local demo catalogue",
  loadDesigns: loadLocalDesignCatalogue
};

// TODO: BrickBrick JSON export adapter
// export const brickbrickExportAdapter: DesignCatalogueAdapter = {
//   id: "brickbrick_export",
//   label: "BrickBrick JSON export",
//   loadDesigns: async () => {
//     const response = await fetch("/data/brickbrick-designs.json");
//     const records = (await response.json()) as BrickBrickDesignRecord[];
//     return records.map(mapBrickBrickRecord);
//   }
// };

// TODO: BrickBrick GraphQL adapter
// export const brickbrickGraphqlAdapter: DesignCatalogueAdapter = {
//   id: "brickbrick_graphql",
//   label: "BrickBrick GraphQL API",
//   loadDesigns: async () => {
//     const response = await fetch(process.env.BRICKBRICK_GRAPHQL_URL!, {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({ query: "{ designs { id name floorAreaSqm ... } }" })
//     });
//     const json = await response.json();
//     return json.data.designs.map(mapBrickBrickRecord);
//   }
// };

// TODO: BrickBrick FastAPI adapter
// export const brickbrickFastApiAdapter: DesignCatalogueAdapter = {
//   id: "brickbrick_fastapi",
//   label: "BrickBrick FastAPI",
//   loadDesigns: async () => {
//     const response = await fetch(`${process.env.BRICKBRICK_API_URL}/designs`);
//     const records = (await response.json()) as BrickBrickDesignRecord[];
//     return records.map(mapBrickBrickRecord);
//   }
// };

// TODO: Map BrickBrick API/export response into HouseDesign here.
// function mapBrickBrickRecord(record: BrickBrickDesignRecord): HouseDesign {
//   return {
//     id: String(record.id),
//     name: String(record.name),
//     floorAreaSqm: Number(record.floorAreaSqm),
//     ...
//   };
// }

export function getActiveAdapter(): DesignCatalogueAdapter {
  return localDemoCatalogueAdapter;
}
