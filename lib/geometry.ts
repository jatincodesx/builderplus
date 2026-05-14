import {
  area,
  bbox as turfBbox,
  bboxPolygon,
  booleanIntersects,
  booleanPointInPolygon,
  centroid as turfCentroid,
  point
} from "@turf/turf";
import type { Feature, Position } from "geojson";
import type { BBox, LngLat } from "@/types/geo";
import type { ParcelFeature } from "@/types/parcel";

export function featureBbox(feature: Feature): BBox {
  return turfBbox(feature) as BBox;
}

export function featureCentroid(feature: Feature): LngLat {
  const center = turfCentroid(feature).geometry.coordinates;
  return { lng: center[0], lat: center[1] };
}

export function featureAreaSqm(feature: Feature): number {
  return Math.round(area(feature));
}

export function pointInParcel(parcel: ParcelFeature, lat: number, lng: number) {
  return booleanPointInPolygon(point([lng, lat]), parcel);
}

export function parcelIntersectsBbox(parcel: ParcelFeature, bbox: BBox) {
  return booleanIntersects(parcel, bboxPolygon(bbox));
}

export function formatCoordinate(value: number) {
  return value.toFixed(5);
}

export function polygonToSvgPoints(
  positions: Position[],
  bbox: BBox,
  width: number,
  height: number
) {
  const [west, south, east, north] = bbox;
  return positions
    .map(([lng, lat]) => {
      const x = ((lng - west) / (east - west)) * width;
      const y = ((north - lat) / (north - south)) * height;
      return `${x},${y}`;
    })
    .join(" ");
}
