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
import { BasemapToggle } from "@/components/BasemapToggle";
import { FloorPlanControls } from "@/components/FloorPlanControls";
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
  fillOpacity: 0.28,
  fillRule: "evenodd",
  interactive: false
};

const boundaryStyle: PathOptions = {
  color: "#38BDF8",
  weight: 2.4,
  opacity: 0.9,
  fillColor: "#0B63CE",
  fillOpacity: 0.05,
  interactive: false
};

export type BuilderPlusMapProps = {
  parcels: GeoFeatureCollection<ParcelProperties>;
  activeLocation: SearchResult | null;
  selectedParcel: ParcelFeature | null;
  floorPlanOverlay: FloorPlanOverlayState | null;
  manualPlot: ManualPlotFeature | null;
  manualDrawActive: boolean;
  onSelectParcel: (parcel: ParcelFeature) => void;
  onChangeFloorPlanOverlay: (overlay: FloorPlanOverlayState) => void;
  onResetFloorPlanOverlay: () => void;
  onRemoveFloorPlanOverlay: () => void;
  onConfirmManualPlot: (plot: ManualPlotFeature) => void;
  onCancelManualPlotDraw: () => void;
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
  onResetFloorPlanOverlay,
  onRemoveFloorPlanOverlay,
  onConfirmManualPlot,
  onCancelManualPlotDraw
}: BuilderPlusMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const layerRefs = useRef(new Map<string, Path>());
  const selectedIdRef = useRef<string | null>(null);
  const [activeBasemap, setActiveBasemap] = useState<BasemapId>("map");
  const [autoSatellite, setAutoSatellite] = useState(true);
  const [manualBasemapOverride, setManualBasemapOverride] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{
    parcel: ParcelFeature;
    x: number;
    y: number;
  } | null>(null);

  useEffect(() => {
    selectedIdRef.current = selectedParcel?.properties.id ?? null;
  }, [selectedParcel]);

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
          setTooltip({
            parcel,
            x: event.originalEvent.clientX,
            y: event.originalEvent.clientY
          });
        },
        mouseout: () => {
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

  function selectBasemap(nextBasemap: BasemapId) {
    setActiveBasemap(nextBasemap);
    setManualBasemapOverride(true);
  }

  return (
    <div className="absolute inset-0 overflow-hidden bg-[#050B18]">
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
          onAutoBasemap={setActiveBasemap}
        />
        <TileLayer
          key={basemap.id}
          url={basemap.tileUrl}
          attribution={basemap.attribution}
          className={
            basemap.id === "satellite"
              ? "builderplus-tiles-satellite"
              : "builderplus-tiles"
          }
          updateWhenIdle
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
      </MapContainer>
      <BasemapToggle
        activeBasemap={activeBasemap}
        autoSatellite={autoSatellite}
        manualOverride={manualBasemapOverride}
        onChange={selectBasemap}
        onToggleAutoSatellite={() => {
          setAutoSatellite((value) => !value);
          setManualBasemapOverride(false);
        }}
      />
      <div className="pointer-events-none absolute inset-0 z-10 bg-[linear-gradient(90deg,rgba(5,11,24,0.18),transparent_36%,rgba(5,11,24,0.08))]" />
      <div className="pointer-events-none absolute bottom-6 left-1/2 z-20 -translate-x-1/2 rounded-full border border-sky-300/20 bg-slate-950/70 px-4 py-2 text-xs font-medium text-sky-50 shadow-glass backdrop-blur-xl">
        Currently available for ACT blocks only
      </div>
      {floorPlanOverlay && (
        <FloorPlanControls
          overlay={floorPlanOverlay}
          onChange={onChangeFloorPlanOverlay}
          onReset={onResetFloorPlanOverlay}
          onRemove={onRemoveFloorPlanOverlay}
        />
      )}
      {tooltip && (
        <ParcelTooltip parcel={tooltip.parcel} x={tooltip.x} y={tooltip.y} />
      )}
    </div>
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
