"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { GeoJSON, MapContainer, TileLayer, useMap } from "react-leaflet";
import L, {
  type GeoJSON as LeafletGeoJSON,
  type LatLngBoundsExpression,
  type LeafletMouseEvent,
  type Path,
  type PathOptions
} from "leaflet";
import type { GeoJsonObject } from "geojson";
import { FloorPlanOverlay } from "@/components/FloorPlanOverlay";
import { ManualPlotDrawControl } from "@/components/ManualPlotDrawControl";
import { ParcelTooltip } from "@/components/ParcelTooltip";
import {
  ACT_BBOX,
  ACT_VIEW,
  AUTO_SATELLITE_ZOOM,
  AUSTRALIA_VIEW,
  BASEMAPS,
  type BasemapId,
  MAP_ZOOM,
  PARCEL_STYLES
} from "@/lib/mapConfig";
import { actBoundary, outsideActMask } from "@/lib/geojson";
import { featureBbox } from "@/lib/geometry";
import type { FloorPlanOverlayState } from "@/types/floorPlan";
import type { GeoFeatureCollection } from "@/types/geo";
import type { ManualPlotFeature } from "@/types/manualPlot";
import type { ParcelFeature, ParcelProperties } from "@/types/parcel";
import type { SearchResult } from "@/types/search";

const ACT_BOUNDS = bboxToLeafletBounds(ACT_BBOX);

const maskStyle: PathOptions = {
  color: "#020617",
  weight: 0,
  fillColor: "#020617",
  fillOpacity: 0.15,
  fillRule: "evenodd",
  interactive: false
};

const boundaryStyle: PathOptions = {
  color: "#38BDF8",
  weight: 2.4,
  opacity: 0.9,
  fillColor: "#0B63CE",
  fillOpacity: 0.04,
  interactive: false
};

const TILE_ERROR_THRESHOLD = 4;
const TILE_ERROR_WINDOW_MS = 8000;

export type BuilderPlusMapProps = {
  parcels: GeoFeatureCollection<ParcelProperties>;
  activeLocation: SearchResult | null;
  selectedParcel: ParcelFeature | null;
  floorPlanOverlay: FloorPlanOverlayState | null;
  manualPlot: ManualPlotFeature | null;
  manualDrawActive: boolean;
  onSelectParcel: (parcel: ParcelFeature) => void;
  onChangeFloorPlanOverlay: (overlay: FloorPlanOverlayState) => void;
  onConfirmManualPlot: (plot: ManualPlotFeature) => void;
  onCancelManualPlotDraw: () => void;
  activeBasemap: BasemapId;
  autoSatellite: boolean;
  manualBasemapOverride: boolean;
  onBasemapChange: (basemap: BasemapId) => void;
  sidebarWidth: number;
};

export function BuilderPlusMap({
  parcels,
  activeLocation,
  selectedParcel,
  floorPlanOverlay,
  manualPlot,
  manualDrawActive,
  onSelectParcel,
  onChangeFloorPlanOverlay,
  onConfirmManualPlot,
  onCancelManualPlotDraw,
  activeBasemap,
  autoSatellite,
  manualBasemapOverride,
  onBasemapChange,
  sidebarWidth
}: BuilderPlusMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const layerRefs = useRef(new Map<string, Path>());
  const selectedIdRef = useRef<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{
    parcel: ParcelFeature;
    x: number;
    y: number;
  } | null>(null);

  useEffect(() => {
    selectedIdRef.current = selectedParcel?.properties.id ?? null;
  }, [selectedParcel]);

  useEffect(() => {
    if (manualDrawActive) {
      setHoveredId(null);
      setTooltip(null);
    }
  }, [manualDrawActive]);

  const selectableParcels = {
    ...parcels,
    features: parcels.features.filter((parcel) => parcel.properties.selectable === true)
  };
  const contextParcels = {
    ...parcels,
    features: parcels.features.filter((parcel) => parcel.properties.selectable !== true)
  };

  useEffect(() => {
    layerRefs.current.forEach((layer, id) => {
      layer.setStyle(getParcelStyle(id, hoveredId, selectedIdRef.current));
      if (id === selectedIdRef.current) {
        layer.bringToFront();
      }
    });
  }, [hoveredId, selectedParcel, parcels]);

  const setMapCursor = useCallback((cursor: string) => {
    mapRef.current?.getContainer().style.setProperty("cursor", cursor);
  }, []);

  const onEachParcel = useCallback(
    (feature: GeoJsonObject, layer: L.Layer) => {
      const parcel = feature as ParcelFeature;
      const id = parcel.properties?.id;
      if (!id || !(layer instanceof L.Path)) return;
      if (parcel.properties.selectable !== true) {
        layer.setStyle(PARCEL_STYLES.context);
        return;
      }

      layerRefs.current.set(id, layer);
      layer.setStyle(getParcelStyle(id, hoveredId, selectedIdRef.current));

      layer.on({
        mouseover: (event: LeafletMouseEvent) => {
          if (manualDrawActive) return;
          setHoveredId(id);
          setMapCursor("pointer");
          layer.setStyle(PARCEL_STYLES.hover);
          layer.bringToFront();
          setTooltip({
            parcel,
            x: event.originalEvent.clientX,
            y: event.originalEvent.clientY
          });
        },
        mousemove: (event: LeafletMouseEvent) => {
          if (manualDrawActive) return;
          setTooltip({
            parcel,
            x: event.originalEvent.clientX,
            y: event.originalEvent.clientY
          });
        },
        mouseout: () => {
          if (manualDrawActive) return;
          setHoveredId(null);
          setMapCursor("");
          setTooltip(null);
          layer.setStyle(getParcelStyle(id, null, selectedIdRef.current));
        },
        click: () => {
          if (manualDrawActive) return;
          if (parcel.properties.selectable === true) {
            onSelectParcel(parcel);
          }
        }
      });
    },
    [hoveredId, manualDrawActive, onSelectParcel, setMapCursor]
  );

  const basemap =
    BASEMAPS.find((item) => item.id === activeBasemap) ?? BASEMAPS[0];

  return (
    <div className="absolute inset-0 overflow-hidden bg-[#0a1628]" style={{ left: sidebarWidth }}>
      <MapContainer
        ref={mapRef}
        center={AUSTRALIA_VIEW.center}
        zoom={AUSTRALIA_VIEW.zoom}
        minZoom={MAP_ZOOM.min}
        maxZoom={MAP_ZOOM.max}
        maxBounds={[
          [-46, 105],
          [-5, 160]
        ]}
        zoomControl
        className="builderplus-leaflet-map absolute inset-0 z-0 h-full w-full"
        preferCanvas
      >
        <MapViewport activeLocation={activeLocation} />
        <BasemapZoomController
          autoSatellite={autoSatellite}
          manualOverride={manualBasemapOverride}
          onAutoBasemap={onBasemapChange}
        />
        <TileLayerWithFallback
          key={basemap.id}
          basemap={basemap}
          activeBasemap={activeBasemap}
          onBasemapChange={onBasemapChange}
        />
        <GeoJSON
          data={outsideActMask as GeoJsonObject}
          style={maskStyle}
          interactive={false}
        />
        <GeoJSON
          data={actBoundary as GeoJsonObject}
          style={boundaryStyle}
          interactive={false}
        />
        <GeoJSON
          key={`context-${contextParcels.features.map((parcel) => parcel.properties.id).join("|")}`}
          data={contextParcels as GeoJsonObject}
          style={PARCEL_STYLES.context}
          interactive={false}
        />
        <GeoJSON
          key={`selectable-${selectableParcels.features.map((parcel) => parcel.properties.id).join("|")}`}
          ref={(layer) => {
            if (!layer) return;
            registerParcelLayers(layer, layerRefs.current);
          }}
          data={selectableParcels as GeoJsonObject}
          style={(feature) =>
            getParcelStyle(
              (feature as ParcelFeature | undefined)?.properties.id,
              hoveredId,
              selectedIdRef.current
            )
          }
          onEachFeature={onEachParcel}
        />
        <ManualPlotDrawControl
          active={manualDrawActive}
          manualPlot={manualPlot}
          division={
            activeLocation?.type === "suburb"
              ? activeLocation.name
              : activeLocation?.division
          }
          onConfirm={onConfirmManualPlot}
          onCancel={onCancelManualPlotDraw}
          onSelectManualPlot={onSelectParcel}
        />
        {floorPlanOverlay && (
          <FloorPlanOverlay
            overlay={floorPlanOverlay}
            onChange={onChangeFloorPlanOverlay}
          />
        )}
        {process.env.NODE_ENV !== "production" && (
          <TileDiagnostics activeBasemap={activeBasemap} />
        )}
      </MapContainer>
      {tooltip && (
        <ParcelTooltip parcel={tooltip.parcel} x={tooltip.x} y={tooltip.y} />
      )}
    </div>
  );
}

function TileLayerWithFallback({
  basemap,
  activeBasemap,
  onBasemapChange
}: {
  basemap: typeof BASEMAPS[number];
  activeBasemap: BasemapId;
  onBasemapChange: (basemap: BasemapId) => void;
}) {
  const map = useMap();
  const errorTimestampsRef = useRef<number[]>([]);
  const fallbackTriggeredRef = useRef(false);

  useEffect(() => {
    errorTimestampsRef.current = [];
    fallbackTriggeredRef.current = false;
  }, [activeBasemap]);

  useEffect(() => {
    const tileLayer = findTileLayer(map);
    if (!tileLayer) return;

    const onTileError = () => {
      if (fallbackTriggeredRef.current) return;
      if (!basemap.fallbackBasemapId) return;

      const now = Date.now();
      errorTimestampsRef.current.push(now);
      errorTimestampsRef.current = errorTimestampsRef.current.filter(
        (t) => now - t < TILE_ERROR_WINDOW_MS
      );

      if (errorTimestampsRef.current.length >= TILE_ERROR_THRESHOLD) {
        fallbackTriggeredRef.current = true;
        console.warn(
          `[BuilderPlus] ${basemap.label} tiles failing — falling back to ${basemap.fallbackBasemapId}`
        );
        onBasemapChange(basemap.fallbackBasemapId);
      }
    };

    tileLayer.on("tileerror", onTileError);
    return () => {
      tileLayer.off("tileerror", onTileError);
    };
  }, [map, basemap, onBasemapChange]);

  return (
    <TileLayer
      url={basemap.tileUrl}
      attribution={basemap.attribution}
      minZoom={basemap.minZoom}
      maxZoom={basemap.maxZoom}
      maxNativeZoom={basemap.maxNativeZoom}
      keepBuffer={6}
      updateWhenIdle={false}
      updateWhenZooming={true}
      className={
        basemap.id === "satellite"
          ? "builderplus-tiles-satellite"
          : "builderplus-tiles"
      }
    />
  );
}

function BasemapZoomController({
  autoSatellite,
  manualOverride,
  onAutoBasemap
}: {
  autoSatellite: boolean;
  manualOverride: boolean;
  onAutoBasemap: (basemap: BasemapId) => void;
}) {
  const map = useMap();

  useEffect(() => {
    if (!autoSatellite || manualOverride) return;

    const updateBasemap = () => {
      onAutoBasemap(
        map.getZoom() >= AUTO_SATELLITE_ZOOM ? "satellite" : "map"
      );
    };

    updateBasemap();
    map.on("zoomend", updateBasemap);
    return () => {
      map.off("zoomend", updateBasemap);
    };
  }, [autoSatellite, manualOverride, map, onAutoBasemap]);

  return null;
}

function MapViewport({ activeLocation }: { activeLocation: SearchResult | null }) {
  const map = useMap();

  useEffect(() => {
    if (!activeLocation) {
      map.flyTo(ACT_VIEW.center, ACT_VIEW.zoom, { duration: 0.85 });
      return;
    }

    if (activeLocation.type === "suburb") {
      map.fitBounds(bboxToLeafletBounds(activeLocation.bbox), {
        animate: true,
        duration: 0.85,
        padding: [88, 88],
        maxZoom: MAP_ZOOM.suburb
      });
      return;
    }

    if (activeLocation.geometry) {
      map.fitBounds(bboxToLeafletBounds(featureBbox({
        type: "Feature",
        properties: {},
        geometry: activeLocation.geometry
      })), {
        animate: true,
        duration: 0.85,
        padding: [96, 96],
        maxZoom: MAP_ZOOM.address
      });
      return;
    }

    map.flyTo([activeLocation.lat, activeLocation.lng], MAP_ZOOM.address, {
      duration: 0.85
    });
  }, [activeLocation, map]);

  useEffect(() => {
    map.fitBounds(ACT_BOUNDS, { padding: [52, 52], animate: false });
  }, [map]);

  return null;
}

function bboxToLeafletBounds([west, south, east, north]: [
  number,
  number,
  number,
  number
]): LatLngBoundsExpression {
  return [
    [south, west],
    [north, east]
  ];
}

function getParcelStyle(
  id: string | undefined,
  hoveredId: string | null,
  selectedId: string | null
): PathOptions {
  if (id && id === selectedId) return PARCEL_STYLES.selected;
  if (id && id === hoveredId) return PARCEL_STYLES.hover;
  return PARCEL_STYLES.normal;
}

function registerParcelLayers(layer: LeafletGeoJSON, layerMap: Map<string, Path>) {
  layerMap.clear();
  layer.eachLayer((child) => {
    const feature = (child as Path & { feature?: ParcelFeature }).feature;
    if (feature?.properties.id && child instanceof L.Path) {
      layerMap.set(feature.properties.id, child);
    }
  });
}

function findTileLayer(map: L.Map): L.TileLayer | null {
  const layers = (map as unknown as { _layers?: Record<string, L.Layer> })._layers;
  if (!layers) return null;
  for (const layer of Object.values(layers)) {
    if (layer instanceof L.TileLayer) return layer;
  }
  return null;
}

function TileDiagnostics({ activeBasemap }: { activeBasemap: BasemapId }) {
  const map = useMap();
  const [stats, setStats] = useState({ loaded: 0, errors: 0, zoom: 0 });

  useEffect(() => {
    const updateZoom = () => setStats((s) => ({ ...s, zoom: map.getZoom() }));

    const tileLayer = findTileLayer(map);
    if (!tileLayer) {
      updateZoom();
      map.on("zoomend", updateZoom);
      return () => { map.off("zoomend", updateZoom); };
    }

    const onLoad = () => setStats((s) => ({ ...s, loaded: s.loaded + 1 }));
    const onError = () => setStats((s) => ({ ...s, errors: s.errors + 1 }));

    tileLayer.on("tileload", onLoad);
    tileLayer.on("tileerror", onError);
    map.on("zoomend", updateZoom);
    updateZoom();

    const timer = setInterval(() => {
      setStats((s) => ({ ...s, loaded: 0, errors: 0 }));
    }, 10000);

    return () => {
      tileLayer.off("tileload", onLoad);
      tileLayer.off("tileerror", onError);
      map.off("zoomend", updateZoom);
      clearInterval(timer);
    };
  }, [map, activeBasemap]);

  return (
    <div className="pointer-events-none absolute bottom-14 right-4 z-50 rounded-lg border border-white/10 bg-slate-950/80 px-3 py-2 text-[10px] text-slate-300 backdrop-blur-sm">
      <div>Basemap: {activeBasemap} | Zoom: {stats.zoom}</div>
      <div>Tiles: {stats.loaded} loaded / {stats.errors} errors</div>
      {stats.errors > 0 && (
        <div className="text-amber-300">Tile errors detected</div>
      )}
    </div>
  );
}
