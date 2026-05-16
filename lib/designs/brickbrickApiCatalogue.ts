// TODO: Implement BrickBrick API catalogue adapter
// This module should map BrickBrick API/export data into the BuilderPlus HouseDesign type.
//
// Expected BrickBrick data fields:
// - RDS/GraphQL/FastAPI design id
// - design name
// - floor area (sqm)
// - width / depth (metres)
// - bedrooms / bathrooms / garage
// - CloudFront image URLs (thumbnail, floor plan, facade)
// - design detail page URL
//
// Do not hardcode BrickBrick backend assumptions into BuilderPlus components.
// Use the DesignCatalogueAdapter interface from catalogueAdapter.ts instead.

import type { HouseDesign, BrickBrickDesignRecord } from "@/types/design";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function mapBrickBrickRecord(record: BrickBrickDesignRecord): HouseDesign {
  return {
    id: String(record.id ?? ""),
    name: String(record.name ?? ""),
    floorAreaSqm: Number(record.floorAreaSqm ?? 0),
    widthM: record.widthM != null ? Number(record.widthM) : null,
    depthM: record.depthM != null ? Number(record.depthM) : null,
    bedrooms: record.bedrooms != null ? Number(record.bedrooms) : null,
    bathrooms: record.bathrooms != null ? Number(record.bathrooms) : null,
    garageSpaces: record.garageSpaces != null ? Number(record.garageSpaces) : null,
    storeys: record.storeys != null ? Number(record.storeys) : null,
    thumbnailUrl: record.thumbnailUrl != null ? String(record.thumbnailUrl) : null,
    floorPlanImageUrl: record.floorPlanImageUrl != null ? String(record.floorPlanImageUrl) : null,
    facadeImageUrl: record.facadeImageUrl != null ? String(record.facadeImageUrl) : null,
    detailsUrl: record.detailsUrl != null ? String(record.detailsUrl) : null,
    source: "brickbrick_api",
    raw: record
  };
}
