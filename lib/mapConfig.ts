import type { BBox } from "@/types/geo";

export type BasemapId = "map" | "satellite";

export type BasemapConfig = {
  id: BasemapId;
  label: string;
  tileUrl: string;
  attribution: string;
  minZoom: number;
  maxZoom: number;
  maxNativeZoom: number;
  fallbackBasemapId?: BasemapId;
};

export const MAP_TILE_URL =
  process.env.NEXT_PUBLIC_MAP_TILE_URL ??
  process.env.NEXT_PUBLIC_TILE_URL ??
  "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

export const MAP_TILE_ATTRIBUTION =
  process.env.NEXT_PUBLIC_MAP_TILE_ATTRIBUTION ??
  process.env.NEXT_PUBLIC_TILE_ATTRIBUTION ??
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

export const SATELLITE_TILE_URL =
  process.env.NEXT_PUBLIC_SATELLITE_TILE_URL ??
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";

export const SATELLITE_TILE_ATTRIBUTION =
  process.env.NEXT_PUBLIC_SATELLITE_TILE_ATTRIBUTION ??
  "Tiles &copy; Esri, Maxar, Earthstar Geographics, and the GIS User Community";

export const BASEMAPS: BasemapConfig[] = [
  {
    id: "map",
    label: "Map",
    tileUrl: MAP_TILE_URL,
    attribution: MAP_TILE_ATTRIBUTION,
    minZoom: 0,
    maxZoom: 22,
    maxNativeZoom: 19
  },
  {
    id: "satellite",
    label: "Satellite",
    tileUrl: SATELLITE_TILE_URL,
    attribution: SATELLITE_TILE_ATTRIBUTION,
    minZoom: 0,
    maxZoom: 22,
    maxNativeZoom: 19,
    fallbackBasemapId: "map"
  }
];

export const AUTO_SATELLITE_ZOOM = 17;

export const AUSTRALIA_VIEW = {
  center: [-25.7, 134.6] as [number, number],
  zoom: 4
};

export const ACT_VIEW = {
  center: [-35.4735, 149.0124] as [number, number],
  zoom: 10
};

export const ACT_BBOX: BBox = [148.7628, -35.9205, 149.3993, -35.1245];

export const MAP_ZOOM = {
  min: 4,
  max: 22,
  suburb: 15,
  address: 17
};

export const PARCEL_STYLES = {
  normal: {
    color: "rgba(75,85,99,0.4)",
    weight: 1,
    opacity: 0.8,
    fillColor: "rgba(59,130,246,0)",
    fillOpacity: 0
  },
  context: {
    color: "rgba(156,163,184,0.45)",
    weight: 0.8,
    opacity: 0.6,
    fillColor: "rgba(156,163,184,0.06)",
    fillOpacity: 0.03
  },
  hover: {
    color: "#2563EB",
    weight: 2,
    opacity: 0.95,
    fillColor: "#3B82F6",
    fillOpacity: 0.18
  },
  selected: {
    color: "#1D4ED8",
    weight: 3,
    opacity: 1,
    fillColor: "#3B82F6",
    fillOpacity: 0.28
  },
  manual: {
    color: "#D97706",
    weight: 3,
    opacity: 1,
    dashArray: "8 7",
    fillColor: "#06B6D4",
    fillOpacity: 0.12
  }
};

export const ACTMAPI_CONFIG = {
  divisionUrl: process.env.ACTMAPI_DIVISION_URL ?? "",
  blockUrl: process.env.ACTMAPI_BLOCK_URL ?? "",
  addressesUrl: process.env.ACTMAPI_ADDRESSES_URL ?? ""
};

export const isActmapiConfigured = () =>
  Boolean(
    ACTMAPI_CONFIG.divisionUrl ||
      ACTMAPI_CONFIG.blockUrl ||
      ACTMAPI_CONFIG.addressesUrl
  );
