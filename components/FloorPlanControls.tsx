"use client";

import {
  Lock,
  RotateCcw,
  RotateCw,
  Trash2,
  Unlock,
  ZoomIn,
  ZoomOut
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { FloorPlanOverlayState } from "@/types/floorPlan";

const MIN_SCALE = 0.35;
const MAX_SCALE = 3;

export function FloorPlanControls({
  overlay,
  onChange,
  onReset,
  onRemove
}: {
  overlay: FloorPlanOverlayState;
  onChange: (overlay: FloorPlanOverlayState) => void;
  onReset: () => void;
  onRemove: () => void;
}) {
  const update = (patch: Partial<FloorPlanOverlayState>) =>
    onChange({ ...overlay, ...patch });

  const scaleBy = (delta: number) =>
    update({
      scale: Math.min(MAX_SCALE, Math.max(MIN_SCALE, overlay.scale + delta))
    });

  return (
    <div className="glass-panel absolute bottom-20 right-4 z-30 w-[320px] rounded-2xl p-4 text-slate-200 max-lg:bottom-24 max-lg:w-[calc(100%-2rem)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-200">
            Floor plan overlay
          </p>
          <p className="mt-1 max-w-[210px] truncate text-sm font-semibold text-white">
            {overlay.fileName}
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

      <label className="mt-4 grid gap-2 text-xs font-medium uppercase tracking-[0.12em] text-slate-400">
        Opacity
        <input
          type="range"
          min={20}
          max={100}
          value={Math.round(overlay.opacity * 100)}
          onChange={(event) =>
            update({ opacity: Number(event.target.value) / 100 })
          }
          className="accent-sky-300"
        />
      </label>

      <div className="mt-4 grid grid-cols-4 gap-2">
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
          onClick={() => update({ rotation: overlay.rotation - 5 })}
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="secondary"
          title="Rotate right"
          onClick={() => update({ rotation: overlay.rotation + 5 })}
        >
          <RotateCw className="h-4 w-4" />
        </Button>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button type="button" variant="ghost" onClick={onReset}>
          <RotateCcw className="h-4 w-4" />
          Reset
        </Button>
        <Button type="button" variant="danger" onClick={onRemove}>
          <Trash2 className="h-4 w-4" />
          Remove
        </Button>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-slate-400">
        Approximate visual overlay only. Not a surveyed or approval-ready
        placement.
      </p>
    </div>
  );
}
