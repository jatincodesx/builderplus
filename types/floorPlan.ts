import type { LngLat } from "@/types/geo";
import type { DesignPlacementMode } from "@/types/design";

export type FloorPlanOverlayState = {
  imageUrl: string;
  fileName?: string;
  opacity: number;
  scale: number;
  rotation: number;
  offsetX: number;
  offsetY: number;
  anchorLatLng: {
    lat: number;
    lng: number;
  };
  locked: boolean;
  designId?: string;
  widthM?: number;
  depthM?: number;
  floorAreaSqm?: number;
  placementMode: DesignPlacementMode;
};

export type FloorPlanUploadPayload = {
  imageUrl: string;
  fileName: string;
  anchorLatLng: LngLat;
};
