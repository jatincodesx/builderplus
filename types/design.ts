import type { GeoJSON } from "geojson";

export type HouseDesign = {
  id: string;
  name: string;
  slug?: string;
  builderName?: string;
  description?: string;
  floorAreaSqm: number;
  widthM?: number | null;
  depthM?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  garageSpaces?: number | null;
  storeys?: number | null;
  minLotWidthM?: number | null;
  minLotDepthM?: number | null;
  thumbnailUrl?: string | null;
  floorPlanImageUrl?: string | null;
  facadeImageUrl?: string | null;
  detailsUrl?: string | null;
  tags?: string[];
  source?: "local_demo" | "brickbrick_export" | "brickbrick_api";
  raw?: Record<string, unknown>;
  imageUrl?: string;
  footprint?: GeoJSON.Polygon | GeoJSON.MultiPolygon | null;
};

export type FitStatus =
  | "best_fit"
  | "may_fit"
  | "too_large"
  | "insufficient_data";

export type DesignMatch = {
  design: HouseDesign;
  status: FitStatus;
  score: number;
  reasons: string[];
  warnings: string[];
  checks: {
    areaFits: boolean | null;
    widthFits: boolean | null;
    depthFits: boolean | null;
  };
};

export type DesignPlacementMode = "real_size_design" | "uploaded-image" | "backend-design";

export type DesignFitStatus =
  | "visual-placement-only"
  | "likely-fits-by-area"
  | "too-large-by-area";

export type DesignPlacementState = {
  designId?: string;
  imageUrl: string;
  fileName?: string;
  anchorLatLng: { lat: number; lng: number };
  offsetX: number;
  offsetY: number;
  rotationDeg: number;
  scale: number;
  opacity: number;
  locked: boolean;
  widthM?: number | null;
  depthM?: number | null;
  floorAreaSqm?: number | null;
  placementMode: DesignPlacementMode;
  scaleAdjustment?: number;
};

export type BrickBrickDesignRecord = Record<string, unknown>;
