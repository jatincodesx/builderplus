import type { LngLat } from "@/types/geo";
import type { ParcelFeature } from "@/types/parcel";

export type ManualPlotFeature = ParcelFeature & {
  properties: ParcelFeature["properties"] & {
    source: "User drawn";
    classification: "manual-plot";
    isManual: true;
    centroid?: LngLat;
  };
};

export type ManualPlotDrawMode = "idle" | "drawing";
