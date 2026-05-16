"use client";

import {
  Lock,
  Maximize2,
  RotateCcw,
  RotateCw,
  Trash2,
  Unlock,
  ZoomIn,
  ZoomOut
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { FloorPlanOverlayState } from "@/types/floorPlan";
import type { DesignFitStatus } from "@/types/design";

const MIN_SCALE = 0.35;
const MAX_SCALE = 3;

export function FloorPlanControls({
  overlay,
  selectedPlotAreaSqm,
  onChange,
  onReset,
  onRemove,
  onFitToPlot
}: {
  overlay: FloorPlanOverlayState;
  selectedPlotAreaSqm?: number;
  onChange: (overlay: FloorPlanOverlayState) => void;
  onReset: () => void;
  onRemove: () => void;
  onFitToPlot: () => void;
}) {
  const update = (patch: Partial<FloorPlanOverlayState>) =>
    onChange({ ...overlay, ...patch });

  const scaleBy = (delta: number) =>
    update({
      scale: Math.min(MAX_SCALE, Math.max(MIN_SCALE, overlay.scale + delta))
    });

  const scalePercent = Math.round(overlay.scale * 100);

  const isRealSize = overlay.placementMode === "real_size_design";
  const scaleAdjustment = overlay.scaleAdjustment ?? 1;
  const conceptScalePercent = Math.round(scaleAdjustment * 100);

  const fitStatus = getDesignFitStatus(overlay, selectedPlotAreaSqm);
  const fitLabel = fitStatusLabel(fitStatus);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">
            Floor plan overlay
          </p>
          <p className="mt-1 max-w-[210px] truncate text-sm font-semibold text-gray-900">
            {overlay.fileName ?? "Design overlay"}
          </p>
          <p className="mt-1 text-xs text-gray-400">
            {isRealSize ? `Concept scale: ${conceptScalePercent}%` : `Scale: ${scalePercent}%`}
          </p>
        </div>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          title={overlay.locked ? "Unlock placement" : "Lock placement"}
          onClick={() => update({ locked: !overlay.locked })}
        >
          {overlay.locked ? (
            <Lock className="h-4 w-4" />
          ) : (
            <Unlock className="h-4 w-4" />
          )}
        </Button>
      </div>

      <label className="grid gap-2 text-xs font-medium uppercase tracking-[0.12em] text-gray-400">
        Opacity
        <input
          type="range"
          min={20}
          max={100}
          value={Math.round(overlay.opacity * 100)}
          onChange={(event) =>
            update({ opacity: Number(event.target.value) / 100 })
          }
          className="accent-blue-500"
        />
      </label>

      {isRealSize ? (
        <div className="space-y-2">
          <label className="grid gap-2 text-xs font-medium uppercase tracking-[0.12em] text-gray-400">
            Concept scale adjustment
            <input
              type="range"
              min={50}
              max={150}
              value={Math.round(scaleAdjustment * 100)}
              onChange={(event) =>
                update({ scaleAdjustment: Number(event.target.value) / 100 })
              }
              className="accent-blue-500"
            />
          </label>
          <p className="text-[11px] text-gray-400">
            Scaled preview: {conceptScalePercent}%
          </p>
          {(conceptScalePercent < 90 || conceptScalePercent > 110) && (
            <p className="text-[11px] text-amber-700">
              Large scale changes may require redesign.
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-2">
          <Button
            type="button"
            size="icon"
            variant="secondary"
            title="Scale smaller"
            onClick={() => scaleBy(-0.08)}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="secondary"
            title="Scale larger"
            onClick={() => scaleBy(0.08)}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="secondary"
            title="Rotate left"
            onClick={() => update({ rotation: (overlay.rotation ?? 0) - 5 })}
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="secondary"
            title="Rotate right"
            onClick={() => update({ rotation: (overlay.rotation ?? 0) + 5 })}
          >
            <RotateCw className="h-4 w-4" />
          </Button>
        </div>
      )}

      {!isRealSize && (
        <div className="grid grid-cols-2 gap-2">
          <Button type="button" variant="ghost" onClick={onReset}>
            <RotateCcw className="h-4 w-4" />
            Reset 100%
          </Button>
          <Button type="button" variant="secondary" onClick={onFitToPlot}>
            <Maximize2 className="h-4 w-4" />
            Fit to plot
          </Button>
        </div>
      )}

      {isRealSize && (
        <div className="grid grid-cols-4 gap-2">
          <Button
            type="button"
            size="icon"
            variant="secondary"
            title="Rotate left"
            onClick={() => update({ rotation: (overlay.rotation ?? 0) - 5 })}
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="secondary"
            title="Rotate right"
            onClick={() => update({ rotation: (overlay.rotation ?? 0) + 5 })}
          >
            <RotateCw className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            title="Reset placement"
            onClick={onReset}
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="danger"
            title="Remove"
            onClick={onRemove}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-400">
          Design fit
        </p>
        <p className="mt-2 text-sm font-semibold text-gray-900">{fitLabel}</p>
        {overlay.floorAreaSqm != null && (
          <p className="mt-1 text-xs text-gray-500">
            Design area: {overlay.floorAreaSqm.toLocaleString()} m²
          </p>
        )}
        {overlay.widthM != null && overlay.depthM != null && (
          <p className="mt-1 text-xs text-gray-500">
            Dimensions: {overlay.widthM}m x {overlay.depthM}m
          </p>
        )}
        {selectedPlotAreaSqm != null && (
          <p className="mt-1 text-xs text-gray-500">
            Plot area: {selectedPlotAreaSqm.toLocaleString()} m²
          </p>
        )}
        <p className="mt-2 text-xs leading-relaxed text-amber-700">
          Area fit is an early guide only. Width, depth, setbacks and buildable envelope still need checking.
        </p>
      </div>

      {!isRealSize && (
        <div className="grid grid-cols-2 gap-2">
          <Button type="button" variant="ghost" onClick={onReset}>
            <RotateCcw className="h-4 w-4" />
            Reset
          </Button>
          <Button type="button" variant="danger" onClick={onRemove}>
            <Trash2 className="h-4 w-4" />
            Remove
          </Button>
        </div>
      )}

      <p className="text-xs leading-relaxed text-gray-400">
        Approximate visual overlay only. Not a surveyed or approval-ready
        placement.
      </p>
    </div>
  );
}

function getDesignFitStatus(
  overlay: FloorPlanOverlayState,
  plotAreaSqm?: number
): DesignFitStatus {
  if (overlay.floorAreaSqm == null || plotAreaSqm == null) {
    return "visual-placement-only";
  }
  if (overlay.floorAreaSqm <= plotAreaSqm) {
    return "likely-fits-by-area";
  }
  return "too-large-by-area";
}

function fitStatusLabel(status: DesignFitStatus): string {
  switch (status) {
    case "visual-placement-only":
      return "Visual placement only";
    case "likely-fits-by-area":
      return "Likely fits by area";
    case "too-large-by-area":
      return "Too large by area";
  }
}
