"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import { AccessGate } from "@/components/access-gate/AccessGate";
import { BuilderPlusMapDynamic as BuilderPlusMap } from "@/components/BuilderPlusMapDynamic";
import { BuilderPlusSidebar, SIDEBAR_WIDTH } from "@/components/BuilderPlusSidebar";
import { SelectedPlotPanel } from "@/components/SelectedPlotPanel";
import { createSelectedPlotFromParcel } from "@/lib/plot/plotAnalysis";
import type {
  FloorPlanOverlayState,
  FloorPlanUploadPayload
} from "@/types/floorPlan";
import type { ManualPlotFeature } from "@/types/manualPlot";
import type { ParcelFeature, ParcelFeatureCollection } from "@/types/parcel";
import type { SearchResult } from "@/types/search";
import type { BasemapId } from "@/lib/mapConfig";
import type { DesignMatch } from "@/types/design";

const DESIGN_PLACEHOLDER_SVG = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect width="400" height="300" fill="#f0f4f8" rx="8"/><text x="200" y="140" text-anchor="middle" font-family="system-ui" font-size="14" fill="#94a3b8">Floor plan placeholder</text><text x="200" y="170" text-anchor="middle" font-family="system-ui" font-size="12" fill="#cbd5e1">Design overlay at real-world size</text></svg>'
)}`;

const emptyParcels: ParcelFeatureCollection = {
  type: "FeatureCollection",
  features: []
};

function BuilderPlusApp() {
  const [activeLocation, setActiveLocation] = useState<SearchResult | null>(null);
  const [parcels, setParcels] = useState<ParcelFeatureCollection>(emptyParcels);
  const [selectedParcel, setSelectedParcel] = useState<ParcelFeature | null>(null);
  const [floorPlanOverlay, setFloorPlanOverlay] =
    useState<FloorPlanOverlayState | null>(null);
  const [manualPlot, setManualPlot] = useState<ManualPlotFeature | null>(null);
  const [manualDrawActive, setManualDrawActive] = useState(false);
  const [loadingParcels, setLoadingParcels] = useState(false);
  const [notice, setNotice] = useState("");
  const [activeBasemap, setActiveBasemap] = useState<BasemapId>("map");
  const [autoSatellite, setAutoSatellite] = useState(true);
  const [manualBasemapOverride, setManualBasemapOverride] = useState(false);
  const floorPlanOverlayRef = useRef<FloorPlanOverlayState | null>(null);

  useEffect(() => {
    floorPlanOverlayRef.current = floorPlanOverlay;
  }, [floorPlanOverlay]);

  useEffect(() => () => revokeFloorPlanImage(floorPlanOverlayRef.current), []);

  const activeLabel = useMemo(() => {
    if (!activeLocation) return undefined;
    return activeLocation.type === "suburb"
      ? activeLocation.name
      : activeLocation.label;
  }, [activeLocation]);

  const parcelSource =
    parcels.source ??
    (parcels.features.some((feature) => feature.properties.source === "mock")
      ? "mock"
      : parcels.features.some((feature) => feature.properties.source === "ACTmapi")
        ? "ACTmapi"
        : undefined);
  const fallbackReason =
    parcelSource === "ACTmapi"
      ? undefined
      : parcels.fallbackReason ??
        parcels.features.find((feature) => feature.properties.fallbackReason)
          ?.properties.fallbackReason;
  const showFallbackWarning =
    parcelSource !== "ACTmapi" && (parcelSource === "mock" || Boolean(fallbackReason));

  async function loadSuburbParcels(division: string) {
    const response = await fetch(
      `/api/parcels/by-suburb?division=${encodeURIComponent(division)}`
    );
    if (!response.ok) throw new Error("Parcel query failed");
    return (await response.json()) as ParcelFeatureCollection;
  }

  async function handleSelectResult(result: SearchResult) {
    setNotice("");
    setActiveLocation(result);
    setLoadingParcels(true);
    setSelectedParcel(null);
    setManualPlot(null);
    setManualDrawActive(false);
    removeFloorPlanOverlay();

    try {
      if (result.type === "suburb") {
        const nextParcels = await loadSuburbParcels(result.name);
        setParcels(nextParcels);
        if (!nextParcels.features.length) {
          setNotice(
            nextParcels.fallbackReason ??
              "No ACT block data is available for this location yet."
          );
        }
        return;
      }

      if (result.geometry) {
        const addressParcel: ParcelFeature = {
          type: "Feature",
          id: result.id,
          geometry: result.geometry,
          properties: {
            id: result.id,
            source: "ACTmapi",
            classification: result.selectable
              ? "selectable-residential"
              : "unknown",
            selectable: result.selectable === true,
            address: result.address,
            block: result.block ?? "Block",
            section: result.section,
            blockSection: result.blockSection,
            division: result.division ?? "ACT",
            district: result.district,
            areaSqm: result.areaSqm,
            zone: result.zone,
            lifecycle: result.lifecycle
          }
        };

        if (result.division) {
          const nextParcels = await loadSuburbParcels(result.division);
          setParcels(nextParcels);
        } else {
          setParcels({
            type: "FeatureCollection",
            features: [addressParcel],
            source: "ACTmapi",
            totalFeatures: 1,
            selectableCount: addressParcel.properties.selectable ? 1 : 0,
            contextCount: addressParcel.properties.selectable ? 0 : 1,
            nonSelectableCount: addressParcel.properties.selectable ? 0 : 1
          });
        }

        if (addressParcel.properties.selectable) {
          setSelectedParcel(addressParcel);
        } else {
          setNotice("This address is not on a standard selectable residential block.");
        }
        return;
      }

      const pointResponse = await fetch(
        `/api/parcels/by-point?lat=${result.lat}&lng=${result.lng}`
      );
      if (!pointResponse.ok) throw new Error("Point parcel query failed");
      const pointJson = (await pointResponse.json()) as {
        result: ParcelFeature | null;
        fallbackReason?: string;
      };
      const selected = pointJson.result;

      if (result.division) {
        const nextParcels = await loadSuburbParcels(result.division);
        setParcels(nextParcels);
      } else if (selected) {
        setParcels({
          type: "FeatureCollection",
          features: [selected],
          source: selected.properties.source,
          serviceStatus: {
            blockConfigured: selected.properties.source === "ACTmapi",
            blockLive: selected.properties.source === "ACTmapi"
          },
          ...(pointJson.fallbackReason
            ? { fallbackReason: pointJson.fallbackReason }
            : selected.properties.fallbackReason
              ? { fallbackReason: selected.properties.fallbackReason }
              : {})
        });
      }

      if (selected?.properties.selectable) {
        setSelectedParcel(selected);
      } else if (selected) {
        setNotice("This address is not on a standard selectable residential block.");
      } else {
        setNotice("No ACT block was found at that address yet.");
      }
    } catch (error) {
      console.error(error);
      setNotice("ACT block data is temporarily unavailable.");
    } finally {
      setLoadingParcels(false);
    }
  }

  function selectOfficialParcel(parcel: ParcelFeature) {
    setManualPlot(null);
    setManualDrawActive(false);
    removeFloorPlanOverlay();
    setSelectedParcel(parcel);
  }

  function handleFloorPlanUpload(payload: FloorPlanUploadPayload) {
    setFloorPlanOverlay((current) => {
      revokeFloorPlanImage(current);
      return {
        imageUrl: payload.imageUrl,
        fileName: payload.fileName,
        opacity: 0.72,
        scale: 1,
        rotation: 0,
        offsetX: 0,
        offsetY: 0,
        anchorLatLng: {
          lat: payload.anchorLatLng.lat,
          lng: payload.anchorLatLng.lng
        },
        locked: false,
        placementMode: "uploaded-image"
      };
    });
  }

  function handlePlaceDesign(match: DesignMatch) {
    if (!selectedParcel) return;

    const selectedPlot = createSelectedPlotFromParcel(selectedParcel);

    setFloorPlanOverlay({
      imageUrl: match.design.floorPlanImageUrl ?? DESIGN_PLACEHOLDER_SVG,
      fileName: match.design.name,
      opacity: 0.72,
      scale: 1,
      rotation: 0,
      offsetX: 0,
      offsetY: 0,
      anchorLatLng: {
        lat: selectedPlot.centroid.lat,
        lng: selectedPlot.centroid.lng
      },
      locked: false,
      designId: match.design.id,
      widthM: match.design.widthM ?? null,
      depthM: match.design.depthM ?? null,
      floorAreaSqm: match.design.floorAreaSqm ?? null,
      placementMode: "real_size_design",
      scaleAdjustment: 1
    });
  }

  function resetFloorPlanOverlay() {
    setFloorPlanOverlay((current) =>
      current
        ? {
            ...current,
            opacity: 0.72,
            scale: 1,
            rotation: 0,
            offsetX: 0,
            offsetY: 0,
            scaleAdjustment: 1
          }
        : null
    );
  }

  function removeFloorPlanOverlay() {
    setFloorPlanOverlay((current) => {
      revokeFloorPlanImage(current);
      return null;
    });
  }

  function fitFloorPlanToPlot() {
    if (!floorPlanOverlay || !selectedParcel) return;

    const centroid = featureCentroidSimple(selectedParcel);
    if (!centroid) return;

    setFloorPlanOverlay((current) => {
      if (!current) return null;
      return {
        ...current,
        anchorLatLng: { lat: centroid.lat, lng: centroid.lng },
        offsetX: 0,
        offsetY: 0,
        rotation: 0,
        scale: estimateFitScale(selectedParcel)
      };
    });
  }

  function selectBasemap(nextBasemap: BasemapId) {
    setActiveBasemap(nextBasemap);
    setManualBasemapOverride(true);
  }

  function toggleAutoSatellite() {
    setAutoSatellite((value) => !value);
    setManualBasemapOverride(false);
  }

  function startManualPlotDraw() {
    setNotice("");
    setManualDrawActive(true);
    setSelectedParcel(null);
    removeFloorPlanOverlay();
  }

  function confirmManualPlot(plot: ManualPlotFeature) {
    setManualPlot(plot);
    setSelectedParcel(plot);
    setManualDrawActive(false);
    removeFloorPlanOverlay();
  }

  function clearSelectedParcel() {
    if (selectedParcel?.properties.isManual) {
      setManualPlot(null);
    }
    setSelectedParcel(null);
    removeFloorPlanOverlay();
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <BuilderPlusSidebar
        activeLocation={activeLocation}
        activeLabel={activeLabel}
        selectedParcel={selectedParcel}
        loadingParcels={loadingParcels}
        manualDrawActive={manualDrawActive}
        floorPlanOverlay={floorPlanOverlay}
        activeBasemap={activeBasemap}
        autoSatellite={autoSatellite}
        manualBasemapOverride={manualBasemapOverride}
        onStartManualPlot={startManualPlotDraw}
        onSelectResult={handleSelectResult}
        onUploadFloorPlan={handleFloorPlanUpload}
        onChangeFloorPlanOverlay={setFloorPlanOverlay}
        onResetFloorPlanOverlay={resetFloorPlanOverlay}
        onRemoveFloorPlanOverlay={removeFloorPlanOverlay}
        onFitFloorPlanToPlot={fitFloorPlanToPlot}
        onBasemapChange={selectBasemap}
        onAutoSatelliteToggle={toggleAutoSatellite}
      />

      <BuilderPlusMap
        parcels={parcels}
        activeLocation={activeLocation}
        selectedParcel={selectedParcel}
        floorPlanOverlay={floorPlanOverlay}
        manualPlot={manualPlot}
        manualDrawActive={manualDrawActive}
        onSelectParcel={(parcel) => {
          if (parcel.properties.isManual) {
            setSelectedParcel(parcel);
            return;
          }
          selectOfficialParcel(parcel);
        }}
        onChangeFloorPlanOverlay={setFloorPlanOverlay}
        onConfirmManualPlot={confirmManualPlot}
        onCancelManualPlotDraw={() => setManualDrawActive(false)}
        activeBasemap={activeBasemap}
        autoSatellite={autoSatellite}
        manualBasemapOverride={manualBasemapOverride}
        onBasemapChange={selectBasemap}
        sidebarWidth={SIDEBAR_WIDTH}
      />

      <AnimatePresence>
        {selectedParcel && (
          <SelectedPlotPanel
            key={selectedParcel.properties.id}
            parcel={selectedParcel}
            onClear={clearSelectedParcel}
            onPlaceDesign={handlePlaceDesign}
            floorPlanOverlay={floorPlanOverlay}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {notice && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className="glass-panel absolute bottom-4 left-4 z-20 max-w-sm rounded-2xl p-4 text-sm text-gray-600"
            style={{ left: SIDEBAR_WIDTH + 16 }}
          >
            {notice}
          </motion.div>
        )}
      </AnimatePresence>

      {process.env.NODE_ENV !== "production" && showFallbackWarning && (
        <div className="absolute bottom-4 right-4 z-20 flex max-w-xs items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 backdrop-blur-xl">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          {fallbackReason ??
            "Development fallback data is active because live ACTmapi returned fallback parcel data."}
        </div>
      )}
    </main>
  );
}

export default function Home() {
  return (
    <AccessGate>
      <BuilderPlusApp />
    </AccessGate>
  );
}

function revokeFloorPlanImage(overlay: FloorPlanOverlayState | null) {
  if (overlay?.imageUrl.startsWith("blob:")) {
    URL.revokeObjectURL(overlay.imageUrl);
  }
}

function featureCentroidSimple(feature: ParcelFeature): { lat: number; lng: number } | null {
  if (feature.geometry.type === "Polygon") {
    const coords = feature.geometry.coordinates[0];
    if (coords && coords.length > 0) {
      const sumLng = coords.reduce((s, c) => s + c[0], 0);
      const sumLat = coords.reduce((s, c) => s + c[1], 0);
      return { lng: sumLng / coords.length, lat: sumLat / coords.length };
    }
  }
  if (feature.geometry.type === "MultiPolygon") {
    const coords = feature.geometry.coordinates[0]?.[0];
    if (coords && coords.length > 0) {
      const sumLng = coords.reduce((s, c) => s + c[0], 0);
      const sumLat = coords.reduce((s, c) => s + c[1], 0);
      return { lng: sumLng / coords.length, lat: sumLat / coords.length };
    }
  }
  return null;
}

function estimateFitScale(feature: ParcelFeature): number {
  if (feature.properties.areaSqm != null && feature.properties.areaSqm > 0) {
    const estimatedDim = Math.sqrt(feature.properties.areaSqm);
    if (estimatedDim > 0 && estimatedDim < 200) return 1.0;
    if (estimatedDim >= 200 && estimatedDim < 500) return 0.8;
    if (estimatedDim >= 500) return 0.6;
  }
  return 1.0;
}
