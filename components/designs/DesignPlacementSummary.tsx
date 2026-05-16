"use client";

import type { DesignMatch } from "@/types/design";
import type { FloorPlanOverlayState } from "@/types/floorPlan";

export function DesignPlacementSummary({
  match,
  placement
}: {
  match: DesignMatch;
  placement?: FloorPlanOverlayState | null;
}) {
  const { design } = match;
  const scalePercent = placement
    ? Math.round((placement.scaleAdjustment ?? 1) * 100)
    : 100;
  const scaleWarning = scalePercent < 90 || scalePercent > 110;

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 space-y-2">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-400">
        Placement details
      </p>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <p className="text-gray-400">Design width</p>
          <p className="font-semibold text-gray-700">{design.widthM ?? "–"} m</p>
        </div>
        <div>
          <p className="text-gray-400">Design depth</p>
          <p className="font-semibold text-gray-700">{design.depthM ?? "–"} m</p>
        </div>
      </div>
      {placement && (
        <>
          <div className="text-xs">
            <p className="text-gray-400">
              Concept scale: <span className="font-semibold text-gray-700">{scalePercent}%</span>
            </p>
            {scaleWarning && (
              <p className="mt-1 text-amber-700">
                Large scale changes may require redesign.
              </p>
            )}
          </div>
        </>
      )}
      <p className="text-[11px] leading-relaxed text-amber-700">
        Visual placement only. Final fit depends on setbacks, buildable envelope and approvals.
      </p>
    </div>
  );
}
