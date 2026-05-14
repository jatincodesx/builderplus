import type { Feature, FeatureCollection, MultiPolygon, Polygon } from "geojson";

export type LngLat = {
  lng: number;
  lat: number;
};

export type BBox = [number, number, number, number];

export type PolygonGeometry = Polygon | MultiPolygon;

export type GeoFeature<TProperties> = Feature<PolygonGeometry, TProperties>;

export type GeoFeatureCollection<TProperties> = FeatureCollection<
  PolygonGeometry,
  TProperties
>;
