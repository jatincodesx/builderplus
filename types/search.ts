import type { BBox, LngLat, PolygonGeometry } from "@/types/geo";

export type SearchResultType = "suburb" | "address";

export type SuburbSearchResult = {
  id: string;
  name: string;
  type: "suburb";
  bbox: BBox;
  centroid: LngLat;
  geometry: PolygonGeometry;
};

export type AddressSearchResult = {
  id: string;
  label: string;
  type: "address";
  address?: string;
  lat: number;
  lng: number;
  centroid?: LngLat;
  division?: string;
  district?: string;
  block?: string;
  section?: string;
  blockSection?: string;
  areaSqm?: number;
  zone?: string;
  lifecycle?: string;
  geometry?: PolygonGeometry;
  source?: string;
  selectable?: boolean;
};

export type SearchResult = SuburbSearchResult | AddressSearchResult;
