import type { GeoFeature, GeoFeatureCollection } from "@/types/geo";

export type ParcelSource = "ACTmapi" | "mock";

export type ParcelClassification =
  | "selectable-residential"
  | "context-residential-large"
  | "nonresidential"
  | "road-or-utility"
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
