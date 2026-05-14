import type { Feature, Polygon } from "geojson";
import { ACT_BBOX } from "@/lib/mapConfig";

export const actBoundary: Feature<Polygon, { name: string }> = {
  type: "Feature",
  properties: { name: "Australian Capital Territory" },
  geometry: {
    type: "Polygon",
    coordinates: [
      [
        [148.7628, -35.1245],
        [149.3993, -35.1245],
        [149.3993, -35.9205],
        [148.7628, -35.9205],
        [148.7628, -35.1245]
      ]
    ]
  }
};

export const outsideActMask: Feature<Polygon, { name: string }> = {
  type: "Feature",
  properties: { name: "Outside ACT mask" },
  geometry: {
    type: "Polygon",
    coordinates: [
      [
        [105, -5],
        [160, -5],
        [160, -46],
        [105, -46],
        [105, -5]
      ],
      [
        [ACT_BBOX[0], ACT_BBOX[1]],
        [ACT_BBOX[0], ACT_BBOX[3]],
        [ACT_BBOX[2], ACT_BBOX[3]],
        [ACT_BBOX[2], ACT_BBOX[1]],
        [ACT_BBOX[0], ACT_BBOX[1]]
      ]
    ]
  }
};
