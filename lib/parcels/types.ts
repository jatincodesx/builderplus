import type { BBox } from "@/types/geo";
import type { JurisdictionCode, ParcelFeature, ParcelFeatureCollection, ParcelSource } from "@/types/parcel";
import type { AddressSearchResult, SuburbSearchResult } from "@/types/search";

export type Jurisdiction = JurisdictionCode;

export type ProviderCapability =
  | "address-search"
  | "suburb-search"
  | "parcel-by-point"
  | "parcel-by-suburb"
  | "parcel-by-bbox";

export type ProviderStatus = {
  id: Jurisdiction;
  label: string;
  capabilities: ProviderCapability[];
  configured: boolean;
  live: boolean;
  status: "working" | "partial" | "stub" | "error";
  supportsAddressSearch: boolean;
  supportsSuburbSearch: boolean;
  supportsParcelByPoint: boolean;
  supportsBbox: boolean;
  sourceUrl: string;
  notes: string;
};

export interface ParcelProvider {
  readonly id: Jurisdiction;
  readonly label: string;
  readonly capabilities: ProviderCapability[];
  searchAddress?(query: string): Promise<AddressSearchResult[]>;
  searchSuburb?(query: string): Promise<SuburbSearchResult[]>;
  getParcelByPoint(lat: number, lng: number): Promise<ParcelFeature | null>;
  getParcelsBySuburb(
    division: string,
    options?: { selectableOnly?: boolean; includeContext?: boolean }
  ): Promise<ParcelFeatureCollection>;
  getParcelsByBbox?(bbox: BBox): Promise<ParcelFeatureCollection>;
  getStatus(): Promise<ProviderStatus>;
}

const JURISDICTION_BBOXES: Record<Jurisdiction, BBox> = {
  ACT: [148.7628, -35.9205, 149.3993, -35.1245],
  NSW: [140.9993, -37.5050, 153.6387, -28.1570],
  VIC: [140.9617, -39.1592, 149.9767, -33.9806],
  QLD: [137.9959, -29.1778, 153.5522, -9.9342],
  SA: [129.0013, -38.0626, 141.0027, -25.9961],
  WA: [112.9211, -35.1918, 129.0019, -13.6889],
  TAS: [143.7928, -44.1055, 148.4990, -39.1900],
  NT: [129.0000, -26.0000, 138.0000, -10.0000]
};

export function getJurisdictionBbox(jurisdiction: Jurisdiction): BBox {
  return JURISDICTION_BBOXES[jurisdiction];
}

export function inferJurisdiction(lat: number, lng: number): Jurisdiction {
  for (const [jurisdiction, bbox] of Object.entries(JURISDICTION_BBOXES)) {
    const [west, south, east, north] = bbox;
    if (lng >= west && lng <= east && lat >= south && lat <= north) {
      return jurisdiction as Jurisdiction;
    }
  }
  return "ACT";
}

const JURISDICTION_KEYWORDS: Record<Jurisdiction, string[]> = {
  ACT: ["ACT", "Canberra", "Australian Capital Territory"],
  NSW: ["NSW", "New South Wales", "Sydney"],
  VIC: ["VIC", "Victoria", "Melbourne"],
  QLD: ["QLD", "Queensland", "Brisbane"],
  SA: ["SA", "South Australia", "Adelaide"],
  WA: ["WA", "Western Australia", "Perth"],
  TAS: ["TAS", "Tasmania", "Hobart"],
  NT: ["NT", "Northern Territory", "Darwin"]
};

export function inferJurisdictionFromText(text: string): Jurisdiction | null {
  const upper = text.toUpperCase();
  for (const [jurisdiction, keywords] of Object.entries(JURISDICTION_KEYWORDS)) {
    if (keywords.some((kw) => upper.includes(kw.toUpperCase()))) {
      return jurisdiction as Jurisdiction;
    }
  }
  return null;
}

export const ALL_JURISDICTIONS: Jurisdiction[] = [
  "ACT",
  "NSW",
  "VIC",
  "QLD",
  "SA",
  "WA",
  "TAS",
  "NT"
];

export const JURISDICTION_LABELS: Record<Jurisdiction, string> = {
  ACT: "Australian Capital Territory",
  NSW: "New South Wales",
  VIC: "Victoria",
  QLD: "Queensland",
  SA: "South Australia",
  WA: "Western Australia",
  TAS: "Tasmania",
  NT: "Northern Territory"
};

export const SOURCE_JURISDICTION_MAP: Record<ParcelSource, Jurisdiction> = {
  ACTmapi: "ACT",
  NSW_Cadastre: "NSW",
  TAS_LIST: "TAS",
  VIC_DataVic: "VIC",
  QLD_Cadastre: "QLD",
  SA_Location: "SA",
  WA_SLIP: "WA",
  NT_Geoserver: "NT",
  mock: "ACT",
  "User drawn": "ACT"
};
