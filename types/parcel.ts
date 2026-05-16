import type { GeoFeature, GeoFeatureCollection, LngLat } from "@/types/geo";

export type ParcelSource =
  | "ACTmapi"
  | "NSW_Cadastre"
  | "TAS_LIST"
  | "VIC_DataVic"
  | "QLD_Cadastre"
  | "SA_Location"
  | "WA_SLIP"
  | "NT_Geoserver"
  | "mock"
  | "User drawn";

export type ParcelClassification =
  | "selectable-residential"
  | "context-residential-large"
  | "nonresidential"
  | "road-or-utility"
  | "manual-plot"
  | "unknown";

export type JurisdictionCode = "ACT" | "NSW" | "VIC" | "QLD" | "SA" | "WA" | "TAS" | "NT";

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
  jurisdiction?: JurisdictionCode;
  rawProperties?: Record<string, unknown>;
  fallbackReason?: string;
  isManual?: boolean;
  centroid?: LngLat;
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
