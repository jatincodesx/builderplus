"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import { BuilderPlusMapDynamic as BuilderPlusMap } from "@/components/BuilderPlusMapDynamic";
import { SearchPanel } from "@/components/SearchPanel";
import { SelectedPlotPanel } from "@/components/SelectedPlotPanel";
import type { ParcelFeature, ParcelFeatureCollection } from "@/types/parcel";
import type { SearchResult } from "@/types/search";

const emptyParcels: ParcelFeatureCollection = {
  type: "FeatureCollection",
  features: []
};

export default function Home() {
  const [activeLocation, setActiveLocation] = useState<SearchResult | null>(null);
  const [parcels, setParcels] = useState<ParcelFeatureCollection>(emptyParcels);
  const [selectedParcel, setSelectedParcel] = useState<ParcelFeature | null>(null);
  const [loadingParcels, setLoadingParcels] = useState(false);
  const [notice, setNotice] = useState("");

  const activeLabel = useMemo(() => {
    if (!activeLocation) return undefined;
    return activeLocation.type === "suburb"
      ? activeLocation.name
      : activeLocation.label;
  }, [activeLocation]);

  const parcelSource =
    parcels.source ??
    (parcels.features.some((feature) => feature.properties.source === "mock")
      ? "mock"
      : parcels.features.some((feature) => feature.properties.source === "ACTmapi")
        ? "ACTmapi"
        : undefined);
  const fallbackReason =
    parcelSource === "ACTmapi"
      ? undefined
      : parcels.fallbackReason ??
        parcels.features.find((feature) => feature.properties.fallbackReason)
          ?.properties.fallbackReason;
  const showFallbackWarning =
    parcelSource !== "ACTmapi" && (parcelSource === "mock" || Boolean(fallbackReason));

  async function loadSuburbParcels(division: string) {
    const response = await fetch(
      `/api/parcels/by-suburb?division=${encodeURIComponent(division)}`
    );
    if (!response.ok) throw new Error("Parcel query failed");
    return (await response.json()) as ParcelFeatureCollection;
  }

  async function handleSelectResult(result: SearchResult) {
    setNotice("");
    setActiveLocation(result);
    setLoadingParcels(true);
    setSelectedParcel(null);

    try {
      if (result.type === "suburb") {
        const nextParcels = await loadSuburbParcels(result.name);
        setParcels(nextParcels);
        if (!nextParcels.features.length) {
          setNotice(
            nextParcels.fallbackReason ??
              "No ACT block data is available for this location yet."
          );
        }
        return;
      }

      if (result.geometry) {
        const addressParcel: ParcelFeature = {
          type: "Feature",
          id: result.id,
          geometry: result.geometry,
          properties: {
            id: result.id,
            source: "ACTmapi",
            classification: result.selectable
              ? "selectable-residential"
              : "unknown",
            selectable: result.selectable === true,
            address: result.address,
            block: result.block ?? "Block",
            section: result.section,
            blockSection: result.blockSection,
            division: result.division ?? "ACT",
            district: result.district,
            areaSqm: result.areaSqm,
            zone: result.zone,
            lifecycle: result.lifecycle
          }
        };

        if (result.division) {
          const nextParcels = await loadSuburbParcels(result.division);
          setParcels(nextParcels);
        } else {
          setParcels({
            type: "FeatureCollection",
            features: [addressParcel],
            source: "ACTmapi",
            totalFeatures: 1,
            selectableCount: addressParcel.properties.selectable ? 1 : 0,
            contextCount: addressParcel.properties.selectable ? 0 : 1,
            nonSelectableCount: addressParcel.properties.selectable ? 0 : 1
          });
        }

        if (addressParcel.properties.selectable) {
          setSelectedParcel(addressParcel);
        } else {
          setNotice("This address is not on a standard selectable residential block.");
        }
        return;
      }

      const pointResponse = await fetch(
        `/api/parcels/by-point?lat=${result.lat}&lng=${result.lng}`
      );
      if (!pointResponse.ok) throw new Error("Point parcel query failed");
      const pointJson = (await pointResponse.json()) as {
        result: ParcelFeature | null;
        fallbackReason?: string;
      };
      const selected = pointJson.result;

      if (result.division) {
        const nextParcels = await loadSuburbParcels(result.division);
        setParcels(nextParcels);
      } else if (selected) {
        setParcels({
          type: "FeatureCollection",
          features: [selected],
          source: selected.properties.source,
          serviceStatus: {
            blockConfigured: selected.properties.source === "ACTmapi",
            blockLive: selected.properties.source === "ACTmapi"
          },
          ...(pointJson.fallbackReason
            ? { fallbackReason: pointJson.fallbackReason }
            : selected.properties.fallbackReason
              ? { fallbackReason: selected.properties.fallbackReason }
              : {})
        });
      }

      if (selected?.properties.selectable) {
        setSelectedParcel(selected);
      } else if (selected) {
        setNotice("This address is not on a standard selectable residential block.");
      } else {
        setNotice("No ACT block was found at that address yet.");
      }
    } catch (error) {
      console.error(error);
      setNotice("ACT block data is temporarily unavailable.");
    } finally {
      setLoadingParcels(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <BuilderPlusMap
        parcels={parcels}
        activeLocation={activeLocation}
        selectedParcel={selectedParcel}
        onSelectParcel={setSelectedParcel}
      />

      <SearchPanel
        variant={activeLocation ? "map" : "landing"}
        activeLabel={activeLabel}
        selected={Boolean(selectedParcel)}
        loadingParcels={loadingParcels}
        onSelectResult={handleSelectResult}
      />

      <AnimatePresence>
        {selectedParcel && (
          <SelectedPlotPanel
            key={selectedParcel.properties.id}
            parcel={selectedParcel}
            onClear={() => setSelectedParcel(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {notice && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className="glass-panel absolute bottom-4 left-4 z-20 max-w-sm rounded-2xl p-4 text-sm text-slate-200"
          >
            {notice}
          </motion.div>
        )}
      </AnimatePresence>

      {process.env.NODE_ENV !== "production" && showFallbackWarning && (
        <div className="absolute bottom-4 right-4 z-20 flex max-w-xs items-start gap-2 rounded-2xl border border-amber-300/20 bg-amber-400/10 p-3 text-xs text-amber-50 backdrop-blur-xl">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-200" />
          {fallbackReason ??
            "Development fallback data is active because live ACTmapi returned fallback parcel data."}
        </div>
      )}
    </main>
  );
}
