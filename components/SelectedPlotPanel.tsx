"use client";

import { Bookmark, Compass, ExternalLink, RotateCcw } from "lucide-react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DesignResultsPanel } from "@/components/designs/DesignResultsPanel";
import { DesignPlacementSummary } from "@/components/designs/DesignPlacementSummary";
import { createSelectedPlotFromParcel } from "@/lib/plot/plotAnalysis";
import { featureCentroid, formatCoordinate } from "@/lib/geometry";
import type { ParcelFeature } from "@/types/parcel";
import type { DesignMatch } from "@/types/design";
import type { FloorPlanOverlayState } from "@/types/floorPlan";

export function SelectedPlotPanel({
  parcel,
  onClear,
  onPlaceDesign,
  floorPlanOverlay
}: {
  parcel: ParcelFeature;
  onClear: () => void;
  onPlaceDesign?: (match: DesignMatch) => void;
  floorPlanOverlay?: FloorPlanOverlayState | null;
}) {
  const centroid = featureCentroid(parcel);
  const selectedPlot = createSelectedPlotFromParcel(parcel);
  const sourceLabel =
    parcel.properties.source === "ACTmapi"
      ? "ACTmapi live data"
      : parcel.properties.source === "User drawn"
        ? "User drawn"
        : "Development fallback data";
  const address =
    parcel.properties.address ||
    rawString(parcel.properties.rawProperties?.ADDRESSES) ||
    "Address not listed for this block";
  const block = formatBlock(parcel.properties.block);
  const section = parcel.properties.section
    ? `Section ${parcel.properties.section}`
    : "N/A";

  const activeDesignMatch = floorPlanOverlay?.designId
    ? (undefined as DesignMatch | undefined)
    : undefined;

  return (
    <motion.aside
      initial={{ opacity: 0, x: 28 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 28 }}
      transition={{ duration: 0.22 }}
      className="glass-panel subtle-scrollbar absolute right-4 top-4 z-20 flex max-h-[calc(100vh-2rem)] w-[360px] flex-col overflow-y-auto rounded-2xl p-6 max-lg:bottom-4 max-lg:top-auto max-lg:w-[calc(100%-2rem)]"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">
            {parcel.properties.isManual ? "User-drawn plot" : "Selected block"}
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-gray-900">
            {address}
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            {[block, section, parcel.properties.division].filter(Boolean).join(" \u00b7 ")}
          </p>
        </div>
        <Badge>{sourceLabel}</Badge>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <Detail label="Address" value={address} wide />
        <Detail label="Block" value={block} />
        <Detail label="Section" value={section} />
        <Detail label="Division" value={parcel.properties.division} />
        <Detail
          label="Land area"
          value={`${parcel.properties.areaSqm?.toLocaleString() ?? "N/A"} m\u00b2`}
        />
        <Detail label="Zone" value={parcel.properties.zone || "N/A"} />
        <Detail label="Lifecycle" value={parcel.properties.lifecycle || "N/A"} />
        <Detail label="Source" value={sourceLabel} />
        <Detail
          label="Centroid"
          value={`${formatCoordinate(centroid.lat)}, ${formatCoordinate(centroid.lng)}`}
        />
        {selectedPlot.approxWidthM != null && (
          <Detail label="Approx width" value={`${selectedPlot.approxWidthM} m`} />
        )}
        {selectedPlot.approxDepthM != null && (
          <Detail label="Approx depth" value={`${selectedPlot.approxDepthM} m`} />
        )}
      </div>

      {parcel.properties.isManual && (
        <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-900">
            Approximate user-drawn plot
          </p>
          <p className="mt-2 text-sm leading-relaxed text-amber-700">
            This is an approximate user-drawn plot and is not an official ACT
            cadastral boundary.
          </p>
          {parcel.properties.areaSqm != null && (
            <p className="mt-2 text-sm font-semibold text-amber-900">
              Approx area: {parcel.properties.areaSqm.toLocaleString()} m\u00b2
            </p>
          )}
        </div>
      )}

      <div className="mt-5 rounded-xl border border-gray-200 bg-gray-50 p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
          <Compass className="h-4 w-4 text-blue-500" />
          Early feasibility view
        </div>
        <p className="mt-2 text-sm leading-relaxed text-gray-500">
          This is an early feasibility view. Final buildability depends on
          zoning, setbacks, easements, slope, estate rules and approvals.
        </p>
      </div>

      {onPlaceDesign && (
        <div className="mt-5">
          <DesignResultsPanel
            selectedPlot={selectedPlot}
            onPlaceDesign={onPlaceDesign}
          />
        </div>
      )}

      {floorPlanOverlay && floorPlanOverlay.designId && activeDesignMatch && (
        <div className="mt-4">
          <DesignPlacementSummary
            match={activeDesignMatch}
            placement={floorPlanOverlay}
          />
        </div>
      )}

      <div className="mt-5 grid gap-3">
        <Button>
          <ExternalLink className="h-4 w-4" />
          View suitable designs
        </Button>
        <Button variant="secondary">
          <Bookmark className="h-4 w-4" />
          Save block
        </Button>
        <Button variant="ghost" onClick={onClear}>
          <RotateCcw className="h-4 w-4" />
          Clear selection
        </Button>
      </div>
    </motion.aside>
  );
}

function Detail({
  label,
  value,
  wide = false
}: {
  label: string;
  value: string;
  wide?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border border-gray-200 bg-gray-50 p-3${wide ? " col-span-2" : ""}`}
    >
      <div className="text-xs font-medium uppercase tracking-[0.12em] text-gray-400">
        {label}
      </div>
      <div className="mt-1.5 text-sm font-semibold text-gray-900">{value}</div>
    </div>
  );
}

function rawString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function formatBlock(value: string) {
  if (!value || value === "Block") return "N/A";
  return value.toUpperCase().startsWith("BLOCK ") ? value : `Block ${value}`;
}
