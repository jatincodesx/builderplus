"use client";

import { BASEMAPS, type BasemapId } from "@/lib/mapConfig";
import { cn } from "@/lib/utils";

export function BasemapToggle({
  activeBasemap,
  autoSatellite,
  manualOverride,
  onChange,
  onToggleAutoSatellite
}: {
  activeBasemap: BasemapId;
  autoSatellite: boolean;
  manualOverride: boolean;
  onChange: (basemap: BasemapId) => void;
  onToggleAutoSatellite: () => void;
}) {
  return (
    <div className="glass-panel absolute bottom-24 left-4 z-30 rounded-2xl p-2 text-xs text-slate-200">
      <div className="grid grid-cols-2 gap-1">
        {BASEMAPS.map((basemap) => (
          <button
            key={basemap.id}
            type="button"
            onClick={() => onChange(basemap.id)}
            className={cn(
              "rounded-xl px-3 py-2 font-semibold transition",
              activeBasemap === basemap.id
                ? "bg-sky-400 text-slate-950 shadow-glow"
                : "bg-white/[0.06] text-slate-200 hover:bg-white/12 hover:text-white"
            )}
          >
            {basemap.label}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={onToggleAutoSatellite}
        className={cn(
          "mt-2 flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left transition",
          autoSatellite && !manualOverride
            ? "border-sky-300/30 bg-sky-400/12 text-sky-50"
            : "border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/10"
        )}
      >
        <span>Auto close zoom</span>
        <span className="font-semibold">{autoSatellite ? "On" : "Off"}</span>
      </button>
    </div>
  );
}
