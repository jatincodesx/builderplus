import type { Feature, Polygon } from "geojson";
import type { GeoFeatureCollection } from "@/types/geo";
import type { ParcelFeature, ParcelProperties } from "@/types/parcel";
import type { AddressSearchResult, SuburbSearchResult } from "@/types/search";
import { featureAreaSqm, featureBbox, featureCentroid } from "@/lib/geometry";

type MockSuburb = Feature<
  Polygon,
  {
    id: string;
    name: string;
  }
>;

const rect = (
  west: number,
  south: number,
  east: number,
  north: number
): Polygon => ({
  type: "Polygon",
  coordinates: [
    [
      [west, south],
      [east, south],
      [east, north],
      [west, north],
      [west, south]
    ]
  ]
});

const parcel = (
  id: string,
  division: string,
  block: string,
  section: string,
  west: number,
  south: number,
  east: number,
  north: number
): ParcelFeature => {
  const geometry = rect(west, south, east, north);
  const feature: ParcelFeature = {
    type: "Feature",
    id,
    properties: {
      id,
      block,
      section,
      division,
      source: "mock"
    },
    geometry
  };

  feature.properties.areaSqm = featureAreaSqm(feature);
  return feature;
};

// Deliberately small mock geometries for UI development before ACTmapi URLs are configured.
const mockSuburbFeatures: MockSuburb[] = [
  {
    type: "Feature",
    properties: { id: "division-denman-prospect", name: "Denman Prospect" },
    geometry: rect(148.9925, -35.3132, 149.0328, -35.2878)
  },
  {
    type: "Feature",
    properties: { id: "division-coombs", name: "Coombs" },
    geometry: rect(149.0291, -35.3288, 149.0572, -35.3042)
  },
  {
    type: "Feature",
    properties: { id: "division-whitlam", name: "Whitlam" },
    geometry: rect(149.0207, -35.2828, 149.0568, -35.2546)
  },
  {
    type: "Feature",
    properties: { id: "division-taylor", name: "Taylor" },
    geometry: rect(149.085, -35.167, 149.13, -35.143)
  },
  {
    type: "Feature",
    properties: { id: "division-wright", name: "Wright" },
    geometry: rect(149.025, -35.329, 149.052, -35.306)
  },
  {
    type: "Feature",
    properties: { id: "division-gungahlin", name: "Gungahlin" },
    geometry: rect(149.115, -35.205, 149.155, -35.175)
  },
  {
    type: "Feature",
    properties: { id: "division-belconnen", name: "Belconnen" },
    geometry: rect(149.052, -35.255, 149.092, -35.225)
  }
];

export const mockSuburbs: SuburbSearchResult[] = mockSuburbFeatures.map(
  (feature) => ({
    id: feature.properties.id,
    name: feature.properties.name,
    type: "suburb",
    bbox: featureBbox(feature),
    centroid: featureCentroid(feature),
    geometry: feature.geometry
  })
);

export const mockAddresses: AddressSearchResult[] = [
  {
    id: "addr-denman-1",
    label: "18 Holborow Avenue, Denman Prospect ACT 2611",
    type: "address",
    lat: -35.29774,
    lng: 149.01415,
    division: "Denman Prospect"
  },
  {
    id: "addr-coombs-1",
    label: "42 Finemore Street, Coombs ACT 2611",
    type: "address",
    lat: -35.31402,
    lng: 149.04421,
    division: "Coombs"
  },
  {
    id: "addr-whitlam-1",
    label: "7 Sculthorpe Avenue, Whitlam ACT 2611",
    type: "address",
    lat: -35.26802,
    lng: 149.04084,
    division: "Whitlam"
  }
];

export const mockParcels: GeoFeatureCollection<ParcelProperties> = {
  type: "FeatureCollection",
  features: [
    parcel("denman-b12-s7", "Denman Prospect", "Block 12", "Section 7", 149.014, -35.2979, 149.01436, -35.29758),
    parcel("denman-b13-s7", "Denman Prospect", "Block 13", "Section 7", 149.01439, -35.2979, 149.01475, -35.29758),
    parcel("denman-b19-s8", "Denman Prospect", "Block 19", "Section 8", 149.01355, -35.29828, 149.01395, -35.29794),
    parcel("coombs-b4-s21", "Coombs", "Block 4", "Section 21", 149.044, -35.31416, 149.04439, -35.31383),
    parcel("coombs-b5-s21", "Coombs", "Block 5", "Section 21", 149.04442, -35.31416, 149.04481, -35.31383),
    parcel("coombs-b17-s18", "Coombs", "Block 17", "Section 18", 149.04355, -35.31456, 149.04398, -35.3142),
    parcel("whitlam-b2-s5", "Whitlam", "Block 2", "Section 5", 149.04066, -35.26814, 149.04105, -35.26781),
    parcel("whitlam-b3-s5", "Whitlam", "Block 3", "Section 5", 149.04108, -35.26814, 149.04147, -35.26781),
    parcel("whitlam-b8-s6", "Whitlam", "Block 8", "Section 6", 149.0402, -35.26856, 149.04062, -35.2682)
  ]
};
