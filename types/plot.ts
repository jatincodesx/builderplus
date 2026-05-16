import type { GeoJSON } from "geojson";

export type PlotSource = "official_parcel" | "manual_drawn";

export type SelectedPlot = {
  id: string;
  source: PlotSource;
  state?: string;
  address?: string | null;
  suburb?: string | null;
  division?: string | null;
  block?: string | number | null;
  section?: string | number | null;
  zone?: string | null;
  areaSqm: number;
  approxWidthM?: number | null;
  approxDepthM?: number | null;
  centroid: {
    lat: number;
    lng: number;
  };
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon;
  rawProperties?: Record<string, unknown>;
};
