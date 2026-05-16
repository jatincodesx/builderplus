"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  LocateFixed,
  Loader2,
  MapPin,
  PencilRuler,
  Search,
  XCircle
} from "lucide-react";
import { ACTOnlyNotice } from "@/components/ACTOnlyNotice";
import { Stepper } from "@/components/Stepper";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { SearchResult } from "@/types/search";

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

export function SearchPanel({
  variant,
  activeLabel,
  selected,
  loadingParcels,
  manualDrawActive,
  onStartManualPlot,
  onSelectResult
}: {
  variant: "landing" | "map";
  activeLabel?: string;
  selected: boolean;
  loadingParcels: boolean;
  manualDrawActive: boolean;
  onStartManualPlot: () => void;
  onSelectResult: (result: SearchResult) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState("");

  const compact = variant === "map";
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
      compact
        ? {
            eyebrow: "BuilderPlus",
            title: "Find a block",
            sub: activeLabel ?? "Search suburbs or addresses across Australia."
          }
        : {
            eyebrow: "BuilderPlus",
            title: "Design smarter on your block.",
            sub: "Search suburbs and addresses, then select a parcel to start an early feasibility view."
          },
    [activeLabel, compact]
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

  return (
    <motion.section
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28 }}
      className={cn(
        "glass-panel z-20 rounded-2xl",
        compact
          ? "absolute left-4 top-4 w-[390px] max-w-[calc(100%-2rem)] p-5"
          : "absolute left-1/2 top-1/2 w-[560px] max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 p-7"
      )}
    >
      <div className={compact ? "space-y-4" : "space-y-6"}>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-600">
            {titleCopy.eyebrow}
          </p>
          <h1
            className={cn(
              "mt-3 font-bold leading-tight tracking-tight text-gray-900",
              compact ? "text-2xl" : "text-5xl"
            )}
          >
            {titleCopy.title}
          </h1>
          <p
            className={cn(
              "mt-3 leading-relaxed text-gray-500",
              compact ? "text-sm" : "text-base"
            )}
          >
            {titleCopy.sub}
          </p>
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search a suburb or address"
            className="h-14 w-full rounded-full border border-gray-200 bg-white pl-12 pr-12 text-base text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
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
          {(results.length > 0 ||
            emptyActOnly ||
            error ||
            error) && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="max-h-64 overflow-auto rounded-2xl border border-gray-200 bg-white p-2 shadow-card subtle-scrollbar"
            >
              {results.map((result) => (
                <button
                  key={`${result.type}-${result.id}`}
                  onClick={() => handleSelect(result)}
                  className="flex w-full items-start gap-3 rounded-xl p-3 text-left transition hover:bg-gray-50"
                >
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                    {result.type === "suburb" ? (
                      <LocateFixed className="h-4 w-4" />
                    ) : (
                      <MapPin className="h-4 w-4" />
                    )}
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-gray-900">
                      {result.type === "suburb" ? result.name : result.label}
                    </span>
                    <span className="mt-1 block text-xs text-gray-400">
                      {result.type === "suburb"
                        ? "Suburb / division"
                        : "Address / block"}
                    </span>
                  </span>
                </button>
              ))}
              {emptyActOnly && (
                  <p className="p-3 text-sm text-gray-500">
                  Live parcel data: ACT, NSW &amp; TAS. Other states: set endpoint or use manual draw.
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
              className="rounded-full border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-600 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
            >
              {suburb}
            </button>
          ))}
        </div>

        {compact && (
          <>
            <Stepper activeStep={selected ? 3 : activeLabel ? 2 : 1} selected={selected} />
            {loadingParcels && (
              <div className="grid gap-2 rounded-2xl border border-gray-200 bg-white p-3 shadow-card">
                <Skeleton className="h-3 w-40" />
                <Skeleton className="h-3 w-56" />
              </div>
            )}
            <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-card">
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
            </div>
          </>
        )}

        <div className="flex items-center justify-between gap-3">
          <ACTOnlyNotice compact={compact} />
          {!compact && (
            <div className="hidden shrink-0 gap-2 sm:flex">
              <Button variant="secondary" onClick={onStartManualPlot}>
                <PencilRuler className="h-4 w-4" />
                Draw plot manually
              </Button>
              <Button
                variant="secondary"
                onClick={() => selectQuickSuburb("Denman Prospect")}
              >
                Explore ACT
              </Button>
            </div>
          )}
        </div>
      </div>
    </motion.section>
  );
}
