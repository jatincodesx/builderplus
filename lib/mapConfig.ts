import type { BBox } from "@/types/geo";

export type BasemapId = "map" | "satellite";

export type BasemapConfig = {
  id: BasemapId;
  label: string;
  tileUrl: string;
  attribution: string;
  maxZoom?: number;
};

export const MAP_TILE_URL =
  process.env.NEXT_PUBLIC_MAP_TILE_URL ??
  process.env.NEXT_PUBLIC_TILE_URL ??
  "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";

export const MAP_TILE_ATTRIBUTION =
  process.env.NEXT_PUBLIC_MAP_TILE_ATTRIBUTION ??
  process.env.NEXT_PUBLIC_TILE_ATTRIBUTION ??
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

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
    maxZoom: 20
  },
  {
    id: "satellite",
    label: "Satellite",
    tileUrl: SATELLITE_TILE_URL,
    attribution: SATELLITE_TILE_ATTRIBUTION,
    maxZoom: 19
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
  max: 20,
  suburb: 15,
  address: 17
};

export const PARCEL_STYLES = {
  normal: {
    color: "rgba(15,23,42,0.55)",
    weight: 1,
    opacity: 0.8,
    fillColor: "rgba(255,255,255,0)",
    fillOpacity: 0
  },
  context: {
    color: "rgba(71,85,105,0.45)",
    weight: 0.8,
    opacity: 0.75,
    fillColor: "rgba(148,163,184,0.08)",
    fillOpacity: 0.04
  },
  hover: {
    color: "#0284C7",
    weight: 2,
    opacity: 0.95,
    fillColor: "#38BDF8",
    fillOpacity: 0.22
  },
  selected: {
    color: "#0369A1",
    weight: 3,
    opacity: 1,
    fillColor: "#0EA5E9",
    fillOpacity: 0.32
  },
  manual: {
    color: "#FBBF24",
    weight: 3,
    opacity: 1,
    dashArray: "8 7",
    fillColor: "#22D3EE",
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
