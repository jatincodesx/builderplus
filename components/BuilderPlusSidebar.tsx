"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Layers,
  LocateFixed,
  Loader2,
  MapPin,
  PencilRuler,
  Search,
  XCircle
} from "lucide-react";
import { ACTOnlyNotice } from "@/components/ACTOnlyNotice";
import { BasemapToggle } from "@/components/BasemapToggle";
import { FloorPlanControls } from "@/components/FloorPlanControls";
import { FloorPlanUploadButton } from "@/components/FloorPlanUploadButton";
import { Stepper } from "@/components/Stepper";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ALL_JURISDICTIONS, JURISDICTION_LABELS } from "@/lib/parcels/types";
import type { Jurisdiction } from "@/lib/parcels/types";
import type { FloorPlanOverlayState, FloorPlanUploadPayload } from "@/types/floorPlan";
import type { ParcelFeature } from "@/types/parcel";
import type { SearchResult } from "@/types/search";
import type { BasemapId } from "@/lib/mapConfig";

const QUICK_SUBURBS_BY_JURISDICTION: Record<Jurisdiction, string[]> = {
  ACT: ["Denman Prospect", "Coombs", "Whitlam", "Taylor", "Wright", "Gungahlin", "Belconnen"],
  NSW: ["Sydney CBD", "Parramatta", "Newcastle", "Wollongong", "Byron Bay"],
  VIC: ["Melbourne CBD", "South Yarra", "Richmond", "Footscray"],
  QLD: ["Brisbane CBD", "South Bank", "Surfers Paradise", "Cairns"],
  SA: ["Adelaide CBD", "Glenelg", "Norwood"],
  WA: ["Perth CBD", "Fremantle", "Subiaco"],
  TAS: ["Hobart CBD", "Sandy Bay", "Launceston"],
  NT: ["Darwin CBD", "Palmerston"]
};

type SearchResponse<T> = {
  results: T[];
};

export const SIDEBAR_WIDTH = 400;

export function BuilderPlusSidebar({
  activeLocation,
  activeLabel,
  selectedParcel,
  loadingParcels,
  manualDrawActive,
  floorPlanOverlay,
  activeBasemap,
  autoSatellite,
  manualBasemapOverride,
  activeJurisdiction,
  onJurisdictionChange,
  onStartManualPlot,
  onSelectResult,
  onUploadFloorPlan,
  onChangeFloorPlanOverlay,
  onResetFloorPlanOverlay,
  onRemoveFloorPlanOverlay,
  onFitFloorPlanToPlot,
  onBasemapChange,
  onAutoSatelliteToggle
}: {
  activeLocation: SearchResult | null;
  activeLabel?: string;
  selectedParcel: ParcelFeature | null;
  loadingParcels: boolean;
  manualDrawActive: boolean;
  floorPlanOverlay: FloorPlanOverlayState | null;
  activeBasemap: BasemapId;
  autoSatellite: boolean;
  manualBasemapOverride: boolean;
  activeJurisdiction: Jurisdiction;
  onJurisdictionChange: (jurisdiction: Jurisdiction) => void;
  onStartManualPlot: () => void;
  onSelectResult: (result: SearchResult) => void;
  onUploadFloorPlan: (payload: FloorPlanUploadPayload) => void;
  onChangeFloorPlanOverlay: (overlay: FloorPlanOverlayState) => void;
  onResetFloorPlanOverlay: () => void;
  onRemoveFloorPlanOverlay: () => void;
  onFitFloorPlanToPlot: () => void;
  onBasemapChange: (basemap: BasemapId) => void;
  onAutoSatelliteToggle: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState("");

  const hasLocation = Boolean(activeLocation || manualDrawActive);
  const emptyResults =
    searched && query.trim().length > 2 && !loading && !results.length && !error;
  const quickSuburbs = QUICK_SUBURBS_BY_JURISDICTION[activeJurisdiction] ?? QUICK_SUBURBS_BY_JURISDICTION.ACT;

  useEffect(() => {
    const value = query.trim();
    setError("");

    if (value.length < 2) {
      setResults([]);
      setSearched(false);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const [suburbResponse, addressResponse] = await Promise.all([
          fetch(`/api/search-suburb?q=${encodeURIComponent(value)}&jurisdiction=${activeJurisdiction}`, {
            signal: controller.signal
          }),
          fetch(`/api/search-address?q=${encodeURIComponent(value)}&jurisdiction=${activeJurisdiction}`, {
            signal: controller.signal
          })
        ]);

        if (!suburbResponse.ok || !addressResponse.ok) {
          throw new Error("Search failed");
        }

        const suburbJson =
          (await suburbResponse.json()) as SearchResponse<SearchResult>;
        const addressJson =
          (await addressResponse.json()) as SearchResponse<SearchResult>;
        setResults([...suburbJson.results, ...addressJson.results].slice(0, 8));
        setSearched(true);
      } catch (searchError) {
        if (!controller.signal.aborted) {
          setError("Search is temporarily unavailable.");
          console.error(searchError);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }, 260);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query, activeJurisdiction]);

  const titleCopy = useMemo(
    () =>
      hasLocation
        ? {
            title: "Find a block",
            sub: activeLabel ?? `Search ${JURISDICTION_LABELS[activeJurisdiction]} suburbs or addresses.`
          }
        : {
            title: "Design smarter on your block.",
            sub: "Search suburbs and addresses, then select a parcel to start an early feasibility view."
          },
    [activeLabel, hasLocation, activeJurisdiction]
  );

  async function selectQuickSuburb(name: string) {
    setQuery(name);
    setLoading(true);
    setError("");
    try {
      const response = await fetch(
        `/api/search-suburb?q=${encodeURIComponent(name)}&jurisdiction=${activeJurisdiction}`
      );
      const json = (await response.json()) as SearchResponse<SearchResult>;
      const result = json.results.find(
        (item) =>
          item.type === "suburb" &&
          item.name.toLowerCase() === name.toLowerCase()
      );
      if (result) onSelectResult(result);
    } catch {
      setError("Search is temporarily unavailable.");
    } finally {
      setLoading(false);
      setSearched(true);
    }
  }

  function handleSelect(result: SearchResult) {
    setQuery(result.type === "suburb" ? result.name : result.label);
    setResults([]);
    onSelectResult(result);
  }

  const centroid = selectedParcel
    ? getCentroidFromParcel(selectedParcel)
    : null;

  return (
    <aside
      className="fixed left-0 top-0 z-30 flex h-screen flex-col border-r border-gray-200 bg-white shadow-sm"
      style={{ width: SIDEBAR_WIDTH }}
    >
      <div className="subtle-scrollbar flex-1 overflow-y-auto px-6 py-6">
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <Image
              src="/brand/lumox-icon-blue.png"
              alt="Lumox Technologies"
              width={36}
              height={36}
              className="shrink-0"
            />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-600">
                BuilderPlus
              </p>
              <p className="text-[11px] tracking-wide text-gray-400">
                by Lumox Technologies
              </p>
            </div>
          </div>

          <div>
            <h1 className="text-[28px] font-bold leading-tight tracking-tight text-gray-900">
              {titleCopy.title}
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-gray-500">
              {titleCopy.sub}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <label
              htmlFor="jurisdiction-select"
              className="text-xs font-medium uppercase tracking-[0.12em] text-gray-400"
            >
              State
            </label>
            <select
              id="jurisdiction-select"
              value={activeJurisdiction}
              onChange={(e) => onJurisdictionChange(e.target.value as Jurisdiction)}
              className="h-9 flex-1 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-50"
            >
              {ALL_JURISDICTIONS.map((j) => (
                <option key={j} value={j}>
                  {j} — {JURISDICTION_LABELS[j]}
                </option>
              ))}
            </select>
          </div>

          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search a suburb or address"
              className="h-12 w-full rounded-full border border-gray-200 bg-white pl-12 pr-12 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
            />
            {loading ? (
              <Loader2 className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 animate-spin text-blue-500" />
            ) : query ? (
              <button
                aria-label="Clear search"
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 transition hover:text-gray-700"
                onClick={() => {
                  setQuery("");
                  setResults([]);
                }}
              >
                <XCircle className="h-5 w-5" />
              </button>
            ) : null}
          </div>

          <AnimatePresence>
            {(results.length > 0 || emptyResults || error) && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="max-h-56 overflow-auto rounded-2xl border border-gray-200 bg-white p-2 shadow-card subtle-scrollbar"
              >
                {results.map((result) => (
                  <button
                    key={`${result.type}-${result.id}`}
                    onClick={() => handleSelect(result)}
                    className="flex w-full items-start gap-3 rounded-xl p-2.5 text-left transition hover:bg-gray-50"
                  >
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                      {result.type === "suburb" ? (
                        <LocateFixed className="h-3.5 w-3.5" />
                      ) : (
                        <MapPin className="h-3.5 w-3.5" />
                      )}
                    </span>
                    <span>
                      <span className="block text-sm font-semibold text-gray-900">
                        {result.type === "suburb" ? result.name : result.label}
                      </span>
                      <span className="mt-0.5 block text-xs text-gray-400">
                        {result.type === "suburb"
                          ? "Suburb / division"
                          : "Address / block"}
                      </span>
                    </span>
                  </button>
                ))}
                {emptyResults && (
                  <p className="p-3 text-sm text-gray-500">
                    No results found for {JURISDICTION_LABELS[activeJurisdiction]}. Try manual draw for other locations.
                  </p>
                )}
                {error && <p className="p-3 text-sm text-red-600">{error}</p>}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex flex-wrap gap-2">
            {quickSuburbs.map((suburb) => (
              <button
                key={suburb}
                onClick={() => selectQuickSuburb(suburb)}
                className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
              >
                {suburb}
              </button>
            ))}
          </div>

          <Stepper
            activeStep={selectedParcel ? 3 : hasLocation ? 2 : 1}
            selected={Boolean(selectedParcel)}
          />

          {loadingParcels && (
            <div className="grid gap-2 rounded-2xl border border-gray-200 bg-white p-4 shadow-card">
              <Skeleton className="h-3 w-40" />
              <Skeleton className="h-3 w-56" />
            </div>
          )}

          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-card">
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-gray-400">
              Missing block?
            </p>
            <Button
              type="button"
              variant={manualDrawActive ? "default" : "secondary"}
              className="mt-3 w-full"
              onClick={onStartManualPlot}
            >
              <PencilRuler className="h-4 w-4" />
              Draw plot manually
            </Button>
            <p className="mt-2 text-xs text-gray-400">
              Draw around one or more blocks to define your intended site.
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-card">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
              <Layers className="h-4 w-4 text-blue-500" />
              Floor plan / design
            </div>
            <p className="mt-1 text-xs text-gray-500">
              {selectedParcel
                ? "Upload a floor plan to overlay on the selected plot."
                : "Select a block first to enable floor plan overlay."}
            </p>
            <div className="mt-3">
              <FloorPlanUploadButton
                anchorLatLng={centroid}
                disabled={!selectedParcel}
                onUpload={onUploadFloorPlan}
              />
            </div>
            {floorPlanOverlay && (
              <div className="mt-4 border-t border-gray-100 pt-4">
                <FloorPlanControls
                  overlay={floorPlanOverlay}
                  selectedPlotAreaSqm={selectedParcel?.properties.areaSqm}
                  onChange={onChangeFloorPlanOverlay}
                  onReset={onResetFloorPlanOverlay}
                  onRemove={onRemoveFloorPlanOverlay}
                  onFitToPlot={onFitFloorPlanToPlot}
                />
              </div>
            )}
          </div>

          <BasemapToggle
            activeBasemap={activeBasemap}
            autoSatellite={autoSatellite}
            manualOverride={manualBasemapOverride}
            onChange={onBasemapChange}
            onToggleAutoSatellite={onAutoSatelliteToggle}
          />

          <ACTOnlyNotice compact />
        </div>
      </div>
    </aside>
  );
}

function getCentroidFromParcel(parcel: ParcelFeature): { lat: number; lng: number } | null {
  if (parcel.geometry.type === "Polygon") {
    const coords = parcel.geometry.coordinates[0];
    if (coords && coords.length > 0) {
      const sumLng = coords.reduce((s, c) => s + c[0], 0);
      const sumLat = coords.reduce((s, c) => s + c[1], 0);
      return { lng: sumLng / coords.length, lat: sumLat / coords.length };
    }
  }
  if (parcel.geometry.type === "MultiPolygon") {
    const coords = parcel.geometry.coordinates[0]?.[0];
    if (coords && coords.length > 0) {
      const sumLng = coords.reduce((s, c) => s + c[0], 0);
      const sumLat = coords.reduce((s, c) => s + c[1], 0);
      return { lng: sumLng / coords.length, lat: sumLat / coords.length };
    }
  }
  return null;
}
