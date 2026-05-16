"use client";

import { Bed, Bath, Car, Maximize2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DesignFitBadge } from "./DesignFitBadge";
import type { DesignMatch } from "@/types/design";

export function DesignCard({
  match,
  onPlace
}: {
  match: DesignMatch;
  onPlace: (match: DesignMatch) => void;
}) {
  const { design, status, reasons } = match;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{design.name}</p>
          {design.builderName && (
            <p className="mt-0.5 text-xs text-gray-400">{design.builderName}</p>
          )}
        </div>
        <DesignFitBadge status={status} />
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
        <div className="rounded-lg border border-gray-100 bg-gray-50 px-2 py-1.5 text-center">
          <Maximize2 className="mx-auto h-3 w-3 text-gray-400" />
          <p className="mt-1 font-semibold text-gray-700">{design.floorAreaSqm} m²</p>
        </div>
        {(design.widthM != null || design.depthM != null) && (
          <div className="rounded-lg border border-gray-100 bg-gray-50 px-2 py-1.5 text-center">
            <p className="text-[10px] uppercase tracking-wider text-gray-400">W × D</p>
            <p className="mt-0.5 font-semibold text-gray-700">
              {design.widthM ?? "–"} × {design.depthM ?? "–"} m
            </p>
          </div>
        )}
        {design.bedrooms != null && (
          <div className="rounded-lg border border-gray-100 bg-gray-50 px-2 py-1.5 text-center">
            <Bed className="mx-auto h-3 w-3 text-gray-400" />
            <p className="mt-1 font-semibold text-gray-700">{design.bedrooms} bed</p>
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5 text-[11px] text-gray-500">
        {design.bathrooms != null && (
          <span className="flex items-center gap-1">
            <Bath className="h-3 w-3" /> {design.bathrooms} bath
          </span>
        )}
        {design.garageSpaces != null && (
          <span className="flex items-center gap-1">
            <Car className="h-3 w-3" /> {design.garageSpaces} car
          </span>
        )}
        {design.storeys != null && (
          <span>{design.storeys === 1 ? "Single" : "Double"} storey</span>
        )}
      </div>

      {reasons.length > 0 && (
        <ul className="mt-3 space-y-1">
          {reasons.slice(0, 3).map((reason, index) => (
            <li key={index} className="text-[11px] leading-relaxed text-gray-500">
              • {reason}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button size="sm" onClick={() => onPlace(match)}>
          Place on plot
        </Button>
        {design.detailsUrl && (
          <Button size="sm" variant="secondary" asChild>
            <a href={design.detailsUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3.5 w-3.5" />
              View details
            </a>
          </Button>
        )}
      </div>
    </div>
  );
}
