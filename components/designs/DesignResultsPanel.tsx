"use client";

import { useEffect, useMemo, useState } from "react";
import { Home, Loader2, ChevronDown, ChevronUp, AlertTriangle } from "lucide-react";
import { DesignCard } from "./DesignCard";
import { getActiveAdapter } from "@/lib/designs/catalogueAdapter";
import { matchDesignsToPlot } from "@/lib/designs/matchingEngine";
import type { SelectedPlot } from "@/types/plot";
import type { HouseDesign, DesignMatch } from "@/types/design";
import type { CatalogueSource } from "@/lib/designs/s3Catalogue";

export function DesignResultsPanel({
  selectedPlot,
  onPlaceDesign
}: {
  selectedPlot: SelectedPlot;
  onPlaceDesign: (match: DesignMatch) => void;
}) {
  const [designs, setDesigns] = useState<HouseDesign[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [source, setSource] = useState<CatalogueSource | null>(null);
  const [showTooLarge, setShowTooLarge] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");

    if (process.env.NODE_ENV !== "production") {
      console.time("[BuilderPlus] design-catalogue-load");
    }

    const adapter = getActiveAdapter();
    const loadPromise = adapter.loadDesignsWithSource
      ? adapter.loadDesignsWithSource()
      : adapter.loadDesigns().then((designs) => ({ designs, source: "local-default" as CatalogueSource }));

    loadPromise
      .then((result) => {
        if (!cancelled) {
          setDesigns(result.designs);
          setSource(result.source);
        }
      })
      .catch(() => {
        if (!cancelled) setError("Could not load design catalogue.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
        if (process.env.NODE_ENV !== "production") {
          console.timeEnd("[BuilderPlus] design-catalogue-load");
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const matches = useMemo(
    () => matchDesignsToPlot(selectedPlot, designs),
    [selectedPlot, designs]
  );

  const bestFit = matches.filter((m) => m.status === "best_fit");
  const mayFit = matches.filter((m) => m.status === "may_fit");
  const tooLarge = matches.filter((m) => m.status === "too_large");
  const insufficientData = matches.filter((m) => m.status === "insufficient_data");

  if (loading) {
    return (
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">
          Suitable designs
        </p>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading design catalogue…
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">
          Suitable designs
        </p>
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Home className="h-4 w-4 text-blue-500" />
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">
          Suitable designs
        </p>
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 font-medium text-gray-600">
          {matches.length} designs
        </span>
        {bestFit.length > 0 && (
          <span className="rounded-full border border-green-200 bg-green-50 px-2.5 py-1 font-medium text-green-700">
            {bestFit.length} best fit
          </span>
        )}
        {mayFit.length > 0 && (
          <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 font-medium text-amber-700">
            {mayFit.length} may fit
          </span>
        )}
        {tooLarge.length > 0 && (
          <span className="rounded-full border border-red-200 bg-red-50 px-2.5 py-1 font-medium text-red-700">
            {tooLarge.length} too large
          </span>
        )}
        {source && source !== "local-default" && (
          <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-gray-400">
            Source: {source}
          </span>
        )}
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
        <div className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
          <p className="text-[11px] leading-relaxed text-amber-700">
            Plot width/depth are approximate early fit estimates derived from the bounding box. They do not account for frontage, setbacks, buildable envelope, slope, easements or approvals.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {bestFit.map((match) => (
          <DesignCard key={match.design.id} match={match} onPlace={onPlaceDesign} />
        ))}
        {mayFit.map((match) => (
          <DesignCard key={match.design.id} match={match} onPlace={onPlaceDesign} />
        ))}
        {insufficientData.map((match) => (
          <DesignCard key={match.design.id} match={match} onPlace={onPlaceDesign} />
        ))}
      </div>

      {tooLarge.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setShowTooLarge((v) => !v)}
            className="flex w-full items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-medium text-gray-600 transition hover:bg-gray-100"
          >
            {showTooLarge ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
            {tooLarge.length} too large {showTooLarge ? "(hide)" : "(show)"}
          </button>
          {showTooLarge && (
            <div className="mt-2 space-y-3">
              {tooLarge.map((match) => (
                <DesignCard key={match.design.id} match={match} onPlace={onPlaceDesign} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
