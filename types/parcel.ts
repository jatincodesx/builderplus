import type { GeoFeature, GeoFeatureCollection } from "@/types/geo";

export type ParcelSource = "ACTmapi" | "mock" | "User drawn";

export type ParcelClassification =
  | "selectable-residential"
  | "context-residential-large"
  | "nonresidential"
  | "road-or-utility"
  | "manual-plot"
  | "unknown";

export type ParcelProperties = {
  id: string;
  block: string;
  section?: string;
  blockSection?: string;
  division: string;
  district?: string;
  areaSqm?: number;
  zone?: string;
  lifecycle?: string;
  address?: string;
  classification?: ParcelClassification;
  selectable?: boolean;
  source: ParcelSource;
  rawProperties?: Record<string, unknown>;
  fallbackReason?: string;
  isManual?: boolean;
};

export type ParcelFeature = GeoFeature<ParcelProperties>;

export type ParcelFeatureCollection = GeoFeatureCollection<ParcelProperties> & {
  source?: ParcelSource;
  fallbackReason?: string;
  totalFeatures?: number;
  selectableCount?: number;
  contextCount?: number;
  nonSelectableCount?: number;
  serviceStatus?: {
    blockConfigured: boolean;
    blockLive: boolean;
  };
};
