"use client";

import { useEffect, useMemo, useState } from "react";
import { GeoJSON, Marker, Polygon, useMap, useMapEvents } from "react-leaflet";
import L, { type LatLngLiteral, type PathOptions } from "leaflet";
import { Check, Edit3, RotateCcw, X } from "lucide-react";
import type { GeoJsonObject, Polygon as GeoJsonPolygon, Position } from "geojson";
import { Button } from "@/components/ui/button";
import { featureAreaSqm, featureCentroid } from "@/lib/geometry";
import { PARCEL_STYLES } from "@/lib/mapConfig";
import type { ManualPlotFeature } from "@/types/manualPlot";

const draftStyle: PathOptions = {
  color: "#FBBF24",
  weight: 2.5,
  opacity: 1,
  dashArray: "7 7",
  fillColor: "#22D3EE",
  fillOpacity: 0.12
};

const cornerIcon = L.divIcon({
  className: "",
  html: '<span class="block h-4 w-4 rounded-full border-2 border-slate-950 bg-amber-300 shadow-[0_0_0_3px_rgba(251,191,36,0.35)]"></span>',
  iconSize: [16, 16],
  iconAnchor: [8, 8]
});

const MIN_POINTS = 3;
const CLOSE_THRESHOLD_PX = 18;

export function ManualPlotDrawControl({
  active,
  manualPlot,
  division,
  onConfirm,
  onCancel,
  onSelectManualPlot
}: {
  active: boolean;
  manualPlot: ManualPlotFeature | null;
  division?: string;
  onConfirm: (plot: ManualPlotFeature) => void;
  onCancel: () => void;
  onSelectManualPlot: (plot: ManualPlotFeature) => void;
}) {
  const map = useMap();
  const [points, setPoints] = useState<LatLngLiteral[]>([]);
  const [hoveringClose, setHoveringClose] = useState(false);

  useEffect(() => {
    if (!active) {
      setPoints([]);
      setHoveringClose(false);
      map.getContainer().style.cursor = "";
      return;
    }

    map.getContainer().style.cursor = "crosshair";
    map.doubleClickZoom.disable();
    return () => {
      map.getContainer().style.cursor = "";
      map.doubleClickZoom.enable();
    };
  }, [active, map]);

  useMapEvents({
    mousemove(event) {
      if (!active || points.length < MIN_POINTS) {
        setHoveringClose(false);
        return;
      }
      const first = points[0];
      const firstPx = map.latLngToContainerPoint(first);
      const currentPx = map.latLngToContainerPoint(event.latlng);
      const dist = Math.sqrt(
        Math.pow(firstPx.x - currentPx.x, 2) + Math.pow(firstPx.y - currentPx.y, 2)
      );
      setHoveringClose(dist < CLOSE_THRESHOLD_PX);
    },
    click(event) {
      if (!active) return;

      if (points.length >= MIN_POINTS) {
        const first = points[0];
        const firstPx = map.latLngToContainerPoint(first);
        const currentPx = map.latLngToContainerPoint(event.latlng);
        const dist = Math.sqrt(
          Math.pow(firstPx.x - currentPx.x, 2) + Math.pow(firstPx.y - currentPx.y, 2)
        );
        if (dist < CLOSE_THRESHOLD_PX) {
          finalizePlot(points);
          return;
        }
      }

      setPoints((current) => [...current, event.latlng]);
    },
    dblclick(event) {
      if (!active) return;
      event.originalEvent.preventDefault();
    }
  });

  const draftGeometry = useMemo(
    () => (points.length >= 2 ? toDraftPositions(points) : null),
    [points]
  );

  const draftAreaSqm = useMemo(() => {
    if (points.length < MIN_POINTS) return null;
    const coordinates = closeRing(
      points.map((point) => [point.lng, point.lat] satisfies Position)
    );
    const geometry: GeoJsonPolygon = {
      type: "Polygon",
      coordinates: [coordinates]
    };
    return featureAreaSqm({
      type: "Feature",
      properties: {},
      geometry
    });
  }, [points]);

  const canConfirm = points.length >= MIN_POINTS;

  function finalizePlot(pts: LatLngLiteral[]) {
    if (pts.length < MIN_POINTS) return;
    const coordinates = closeRing(
      pts.map((point) => [point.lng, point.lat] satisfies Position)
    );
    const geometry: GeoJsonPolygon = {
      type: "Polygon",
      coordinates: [coordinates]
    };
    const centroid = featureCentroid({
      type: "Feature",
      properties: {},
      geometry
    });
    const id = `manual-${Date.now()}`;
    const feature: ManualPlotFeature = {
      type: "Feature",
      id,
      geometry,
      properties: {
        id,
        source: "User drawn",
        classification: "manual-plot",
        selectable: true,
        address: "User-drawn plot",
        block: "",
        section: "",
        division: division || "ACT",
        areaSqm: featureAreaSqm({
          type: "Feature",
          properties: {},
          geometry
        }),
        centroid,
        isManual: true
      }
    };
    onConfirm(feature);
    setPoints([]);
    setHoveringClose(false);
  }

  function confirmPlot() {
    finalizePlot(points);
  }

  return (
    <>
      {manualPlot && (
        <GeoJSON
          key={manualPlot.properties.id}
          data={manualPlot as GeoJsonObject}
          style={PARCEL_STYLES.manual}
          eventHandlers={{
            click: () => onSelectManualPlot(manualPlot)
          }}
        />
      )}

      {active && draftGeometry && (
        <Polygon positions={draftGeometry} pathOptions={draftStyle} />
      )}

      {active &&
        points.map((point, index) => (
          <Marker
            key={`${index}-${point.lat}-${point.lng}`}
            position={point}
            icon={cornerIcon}
            draggable
            eventHandlers={{
              drag: (event) => {
                const marker = event.target as L.Marker;
                const nextPoint = marker.getLatLng();
                setPoints((current) =>
                  current.map((item, itemIndex) =>
                    itemIndex === index
                      ? { lat: nextPoint.lat, lng: nextPoint.lng }
                      : item
                  )
                );
              }
            }}
          />
        ))}

      {active && (
        <div className="glass-panel pointer-events-auto absolute left-1/2 top-4 z-30 w-[420px] max-w-[calc(100%-2rem)] -translate-x-1/2 rounded-2xl p-4 text-slate-200">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-300/20 text-amber-100">
              <Edit3 className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white">
                Click around your intended site
              </p>
              <p className="mt-1 text-xs leading-relaxed text-slate-400">
                {points.length < MIN_POINTS
                  ? `${points.length}/${MIN_POINTS}+ corners placed. Keep clicking to outline your site.`
                  : `${points.length} corners placed. Click near the first point to close, or press Confirm.`}
              </p>
              {draftAreaSqm != null && (
                <p className="mt-2 text-sm font-semibold text-sky-200">
                  Approx area: {draftAreaSqm.toLocaleString()} m²
                </p>
              )}
              {hoveringClose && (
                <p className="mt-1 text-xs text-amber-200">
                  Release to close shape
                </p>
              )}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <Button type="button" variant="secondary" onClick={() => { setPoints([]); setHoveringClose(false); }}>
              <RotateCcw className="h-4 w-4" />
              Reset
            </Button>
            <Button type="button" variant="ghost" onClick={onCancel}>
              <X className="h-4 w-4" />
              Cancel
            </Button>
            <Button type="button" disabled={!canConfirm} onClick={confirmPlot}>
              <Check className="h-4 w-4" />
              Confirm
            </Button>
          </div>

          <p className="mt-3 text-xs leading-relaxed text-amber-200/70">
            Approximate manually drawn area. Not an official ACT cadastral boundary.
          </p>
        </div>
      )}
    </>
  );
}

function toDraftPositions(points: LatLngLiteral[]) {
  return points.map((point) => [point.lat, point.lng] as [number, number]);
}

function closeRing(coordinates: Position[]) {
  const first = coordinates[0];
  const last = coordinates[coordinates.length - 1];
  if (first && last && (first[0] !== last[0] || first[1] !== last[1])) {
    return [...coordinates, first];
  }
  return coordinates;
}
