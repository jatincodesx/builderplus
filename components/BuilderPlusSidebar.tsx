"use client";

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
import type { FloorPlanOverlayState, FloorPlanUploadPayload } from "@/types/floorPlan";
import type { ParcelFeature } from "@/types/parcel";
import type { SearchResult } from "@/types/search";
import type { BasemapId } from "@/lib/mapConfig";

const quickSuburbs = [
  "Denman Prospect",
  "Coombs",
  "Whitlam",
  "Taylor",
  "Wright",
  "Gungahlin",
  "Belconnen"
];

type SearchResponse<T> = {
  results: T[];
};

export const SIDEBAR_WIDTH = 380;

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
  const emptyActOnly =
    searched && query.trim().length > 2 && !loading && !results.length && !error;

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
          fetch(`/api/search-suburb?q=${encodeURIComponent(value)}`, {
            signal: controller.signal
          }),
          fetch(`/api/search-address?q=${encodeURIComponent(value)}`, {
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
  }, [query]);

  const titleCopy = useMemo(
    () =>
      hasLocation
        ? {
            eyebrow: "BuilderPlus",
            title: "Find an ACT block",
            sub: activeLabel ?? "Search Canberra suburbs or addresses."
          }
        : {
            eyebrow: "BuilderPlus",
            title: "Design smarter on your ACT block.",
            sub: "Search Canberra suburbs and addresses, then select a parcel to start an early feasibility view."
          },
    [activeLabel, hasLocation]
  );

  async function selectQuickSuburb(name: string) {
    setQuery(name);
    setLoading(true);
    setError("");
    try {
      const response = await fetch(
        `/api/search-suburb?q=${encodeURIComponent(name)}`
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
      className="fixed left-0 top-0 z-30 flex h-screen flex-col border-r border-white/10 bg-[#0a1628]/95 backdrop-blur-xl"
      style={{ width: SIDEBAR_WIDTH }}
    >
      <div className="subtle-scrollbar flex-1 overflow-y-auto p-5">
        <div className="space-y-5">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-200">
              {titleCopy.eyebrow}
            </p>
            <h1 className="mt-3 text-3xl font-semibold leading-tight text-white">
              {titleCopy.title}
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-slate-300">
              {titleCopy.sub}
            </p>
          </div>

          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search an ACT suburb or address"
              className="h-12 w-full rounded-xl border border-white/12 bg-white/[0.08] pl-12 pr-12 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-sky-300/60 focus:bg-white/[0.11] focus:ring-4 focus:ring-sky-400/10"
            />
            {loading ? (
              <Loader2 className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 animate-spin text-sky-300" />
            ) : query ? (
              <button
                aria-label="Clear search"
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-white"
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
            {(results.length > 0 || emptyActOnly || error) && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="max-h-56 overflow-auto rounded-xl border border-white/10 bg-slate-950/45 p-2 subtle-scrollbar"
              >
                {results.map((result) => (
                  <button
                    key={`${result.type}-${result.id}`}
                    onClick={() => handleSelect(result)}
                    className="flex w-full items-start gap-3 rounded-lg p-2.5 text-left transition hover:bg-white/10"
                  >
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sky-400/15 text-sky-200">
                      {result.type === "suburb" ? (
                        <LocateFixed className="h-3.5 w-3.5" />
                      ) : (
                        <MapPin className="h-3.5 w-3.5" />
                      )}
                    </span>
                    <span>
                      <span className="block text-sm font-semibold text-white">
                        {result.type === "suburb" ? result.name : result.label}
                      </span>
                      <span className="mt-0.5 block text-xs text-slate-400">
                        {result.type === "suburb"
                          ? "Suburb / division"
                          : "Address / block"}
                      </span>
                    </span>
                  </button>
                ))}
                {emptyActOnly && (
                  <p className="p-3 text-sm text-slate-300">
                    BuilderPlus currently supports ACT blocks only.
                  </p>
                )}
                {error && <p className="p-3 text-sm text-red-100">{error}</p>}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex flex-wrap gap-1.5">
            {quickSuburbs.map((suburb) => (
              <button
                key={suburb}
                onClick={() => selectQuickSuburb(suburb)}
                className="rounded-full border border-white/12 bg-white/[0.07] px-2.5 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-sky-300/50 hover:bg-sky-400/15 hover:text-white"
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
            <div className="grid gap-2 rounded-xl border border-white/10 bg-white/[0.04] p-3">
              <Skeleton className="h-3 w-40" />
              <Skeleton className="h-3 w-56" />
            </div>
          )}

          <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-400">
              Missing block?
            </p>
            <Button
              type="button"
              variant={manualDrawActive ? "default" : "secondary"}
              className="mt-2 w-full"
              onClick={onStartManualPlot}
            >
              <PencilRuler className="h-4 w-4" />
              Draw plot manually
            </Button>
            <p className="mt-2 text-xs text-slate-400">
              Draw around one or more blocks to define your intended site.
            </p>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <Layers className="h-4 w-4 text-sky-300" />
              Floor plan / design
            </div>
            <p className="mt-1 text-xs text-slate-400">
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
              <div className="mt-4 border-t border-white/10 pt-4">
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
