import type { GeoJSON } from "geojson";

export type HouseDesign = {
  id: string;
  name: string;
  imageUrl: string;
  widthM?: number;
  depthM?: number;
  floorAreaSqm?: number;
  bedrooms?: number;
  bathrooms?: number;
  garageSpaces?: number;
  minLotWidthM?: number;
  minLotDepthM?: number;
  footprint?: GeoJSON.Polygon | GeoJSON.MultiPolygon | null;
};

export type DesignPlacementMode = "uploaded-image" | "backend-design";

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
  widthM?: number;
  depthM?: number;
  floorAreaSqm?: number;
  placementMode: DesignPlacementMode;
};
