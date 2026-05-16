"use client";

import { Badge } from "@/components/ui/badge";
import type { FitStatus } from "@/types/design";

const statusConfig: Record<FitStatus, { label: string; className: string }> = {
  best_fit: {
    label: "Best fit",
    className: "border-green-200 bg-green-50 text-green-700"
  },
  may_fit: {
    label: "May fit",
    className: "border-amber-200 bg-amber-50 text-amber-700"
  },
  too_large: {
    label: "Too large",
    className: "border-red-200 bg-red-50 text-red-700"
  },
  insufficient_data: {
    label: "More data needed",
    className: "border-gray-200 bg-gray-50 text-gray-600"
  }
};

export function DesignFitBadge({ status }: { status: FitStatus }) {
  const config = statusConfig[status];
  return <Badge className={config.className}>{config.label}</Badge>;
}
