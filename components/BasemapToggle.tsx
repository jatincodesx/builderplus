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
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-card">
      <p className="mb-2 text-xs font-medium uppercase tracking-[0.12em] text-gray-400">
        Basemap
      </p>
      <div className="grid grid-cols-2 gap-1.5">
        {BASEMAPS.map((basemap) => (
          <button
            key={basemap.id}
            type="button"
            onClick={() => onChange(basemap.id)}
            className={cn(
              "rounded-lg px-3 py-2 text-xs font-semibold transition",
              activeBasemap === basemap.id
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-gray-50 text-gray-600 hover:bg-gray-100"
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
          "mt-2 flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-xs transition",
          autoSatellite && !manualOverride
            ? "border-blue-200 bg-blue-50 text-blue-700"
            : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
        )}
      >
        <span>Auto satellite at close zoom</span>
        <span className="font-semibold">{autoSatellite ? "On" : "Off"}</span>
      </button>
    </div>
  );
}
