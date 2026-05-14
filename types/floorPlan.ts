import type { LngLat } from "@/types/geo";

export type FloorPlanOverlayState = {
  imageUrl: string;
  fileName: string;
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
};

export type FloorPlanUploadPayload = {
  imageUrl: string;
  fileName: string;
  anchorLatLng: LngLat;
};
