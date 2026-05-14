"use client";

import { Bookmark, Compass, ExternalLink, RotateCcw } from "lucide-react";
import { motion } from "framer-motion";
import { FloorPlanUploadButton } from "@/components/FloorPlanUploadButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { featureCentroid, formatCoordinate } from "@/lib/geometry";
import { cn } from "@/lib/utils";
import type { FloorPlanUploadPayload } from "@/types/floorPlan";
import type { ParcelFeature } from "@/types/parcel";

export function SelectedPlotPanel({
  parcel,
  onUploadFloorPlan,
  onClear
}: {
  parcel: ParcelFeature;
  onUploadFloorPlan: (payload: FloorPlanUploadPayload) => void;
  onClear: () => void;
}) {
  const centroid = featureCentroid(parcel);
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

  return (
    <motion.aside
      initial={{ opacity: 0, x: 28 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 28 }}
      transition={{ duration: 0.22 }}
      className="glass-panel subtle-scrollbar absolute right-4 top-4 z-20 flex max-h-[calc(100vh-2rem)] w-[390px] flex-col overflow-y-auto rounded-2xl p-5 max-lg:bottom-4 max-lg:top-auto max-lg:w-[calc(100%-2rem)]"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-200">
            Selected block
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-white">
            {address}
          </h2>
          <p className="mt-1 text-sm text-slate-300">
            {[block, section, parcel.properties.division].filter(Boolean).join(" · ")}
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
          value={`${parcel.properties.areaSqm?.toLocaleString() ?? "N/A"} m²`}
        />
        <Detail label="Zone" value={parcel.properties.zone || "N/A"} />
        <Detail label="Lifecycle" value={parcel.properties.lifecycle || "N/A"} />
        <Detail label="Source" value={sourceLabel} />
        <Detail
          label="Centroid"
          value={`${formatCoordinate(centroid.lat)}, ${formatCoordinate(centroid.lng)}`}
        />
      </div>

      {parcel.properties.isManual && (
        <div className="mt-5 rounded-2xl border border-amber-300/20 bg-amber-300/10 p-4">
          <p className="text-sm font-semibold text-amber-50">
            Approximate user-drawn plot
          </p>
          <p className="mt-2 text-sm leading-relaxed text-amber-50/80">
            This is an approximate user-drawn plot and is not an official ACT
            cadastral boundary.
          </p>
        </div>
      )}

      <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.05] p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-white">
          <Compass className="h-4 w-4 text-sky-300" />
          Early feasibility view
        </div>
        <p className="mt-2 text-sm leading-relaxed text-slate-300">
          This is an early feasibility view. Final buildability depends on
          zoning, setbacks, easements, slope, estate rules and approvals.
        </p>
      </div>

      <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.05] p-4">
        <p className="text-sm font-semibold text-white">Floor plan overlay</p>
        <p className="mt-1 text-xs leading-relaxed text-slate-400">
          JPG/PNG only. Approximate visual placement only.
        </p>
        <div className="mt-3">
          <FloorPlanUploadButton
            anchorLatLng={centroid}
            onUpload={onUploadFloorPlan}
          />
        </div>
      </div>

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
      className={cn(
        "rounded-2xl border border-white/10 bg-white/[0.05] p-4",
        wide && "col-span-2"
      )}
    >
      <div className="text-xs font-medium uppercase tracking-[0.12em] text-slate-400">
        {label}
      </div>
      <div className="mt-2 text-sm font-semibold text-white">{value}</div>
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
