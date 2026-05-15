"use client";

import dynamic from "next/dynamic";
import type { BuilderPlusMapProps } from "@/components/BuilderPlusMap";

export const BuilderPlusMapDynamic = dynamic<BuilderPlusMapProps>(
  () =>
    import("@/components/BuilderPlusMap").then((module) => module.BuilderPlusMap),
  {
    ssr: false,
    loading: () => <div className="absolute inset-0 bg-gray-200" />
  }
);
