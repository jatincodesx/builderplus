import {
  area as turfArea,
  bbox as turfBbox,
  centroid as turfCentroid,
  destination as turfDestination
} from "@turf/turf";
import type { Feature, GeoJSON as GeoJsonType, Polygon, MultiPolygon } from "geojson";
import type { SelectedPlot, PlotSource } from "@/types/plot";
import type { ParcelFeature } from "@/types/parcel";
import type { BBox, LngLat } from "@/types/geo";

type AnalyseResult = {
  areaSqm: number;
  approxWidthM: number | null;
  approxDepthM: number | null;
  centroid: LngLat;
  bbox: BBox;
};

export function analysePlotGeometry(featureOrGeometry: Feature | GeoJsonType): AnalyseResult {
  const feature: Feature =
    featureOrGeometry.type === "Feature"
      ? (featureOrGeometry as Feature)
      : { type: "Feature", properties: {}, geometry: featureOrGeometry as Polygon | MultiPolygon };

  const areaSqm = Math.round(turfArea(feature));
  const bboxResult = turfBbox(feature) as BBox;
  const center = turfCentroid(feature).geometry.coordinates;

  const centroid: LngLat = { lng: center[0], lat: center[1] };

  const [west, south, east, north] = bboxResult;
  const approxWidthM = estimateDistanceM(centroid.lat, west, east);
  const approxDepthM = estimateDistanceM(
    (south + north) / 2,
    0,
    Math.abs(north - south) * 111_320
  ) !== null
    ? estimateLatitudeDepthM(south, north)
    : null;

  return { areaSqm, approxWidthM, approxDepthM, centroid, bbox: bboxResult };
}

function estimateDistanceM(lat: number, lngA: number, lngB: number): number | null {
  const cosLat = Math.cos((lat * Math.PI) / 180);
  const dLng = Math.abs(lngB - lngA);
  const metres = dLng * 111_320 * cosLat;
  return metres > 0 ? Math.round(metres * 10) / 10 : null;
}

function estimateLatitudeDepthM(south: number, north: number): number | null {
  const dLat = Math.abs(north - south);
  const metres = dLat * 110_574;
  return metres > 0 ? Math.round(metres * 10) / 10 : null;
}

export function createSelectedPlotFromParcel(parcel: ParcelFeature): SelectedPlot {
  const analysis = analysePlotGeometry(parcel);

  const source: PlotSource = parcel.properties.isManual ? "manual_drawn" : "official_parcel";

  return {
    id: parcel.properties.id,
    source,
    jurisdiction: parcel.properties.jurisdiction ?? undefined,
    address: parcel.properties.address ?? null,
    division: parcel.properties.division ?? null,
    block: parcel.properties.block ?? null,
    section: parcel.properties.section ?? null,
    zone: parcel.properties.zone ?? null,
    areaSqm: parcel.properties.areaSqm ?? analysis.areaSqm,
    approxWidthM: analysis.approxWidthM,
    approxDepthM: analysis.approxDepthM,
    centroid: analysis.centroid,
    geometry: parcel.geometry,
    rawProperties: parcel.properties.rawProperties
  };
}

export function createSelectedPlotFromManualDraw(
  geometry: Polygon | MultiPolygon,
  metadata: {
    id?: string;
    division?: string;
    areaSqm?: number;
    centroid?: LngLat;
  }
): SelectedPlot {
  const feature: Feature = { type: "Feature", properties: {}, geometry };
  const analysis = analysePlotGeometry(feature);

  return {
    id: metadata.id ?? `manual-${Date.now()}`,
    source: "manual_drawn",
    address: "User-drawn plot",
    division: metadata.division ?? null,
    areaSqm: metadata.areaSqm ?? analysis.areaSqm,
    approxWidthM: analysis.approxWidthM,
    approxDepthM: analysis.approxDepthM,
    centroid: metadata.centroid ?? analysis.centroid,
    geometry,
    rawProperties: undefined
  };
}

export function computePxPerMetre(
  map: { latLngToContainerPoint: (latlng: [number, number]) => { x: number; y: number } },
  centroid: LngLat
): number {
  const originPoint = map.latLngToContainerPoint([centroid.lat, centroid.lng]);

  const eastFeature = turfDestination(
    { type: "Feature", properties: {}, geometry: { type: "Point", coordinates: [centroid.lng, centroid.lat] } },
    10,
    90,
    { units: "meters" }
  );
  const eastCoord = eastFeature.geometry.coordinates;
  const eastPoint = map.latLngToContainerPoint([eastCoord[1], eastCoord[0]]);

  const pixelDist = Math.abs(eastPoint.x - originPoint.x);
  return pixelDist / 10;
}
