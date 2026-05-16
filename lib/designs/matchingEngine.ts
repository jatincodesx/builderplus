import type { SelectedPlot } from "@/types/plot";
import type { HouseDesign, DesignMatch, FitStatus } from "@/types/design";

const STANDARD_WARNING =
  "Early fit estimate only. Setbacks, site coverage, slope, easements and approvals are not included yet.";

const AREA_TIGHT_RATIO = 0.9;
const DIMENSION_TIGHT_RATIO = 0.92;

export function matchDesignsToPlot(
  plot: SelectedPlot,
  designs: HouseDesign[]
): DesignMatch[] {
  const matches = designs.map((design) => evaluateFit(plot, design));
  return sortMatches(matches);
}

function evaluateFit(plot: SelectedPlot, design: HouseDesign): DesignMatch {
  const reasons: string[] = [];
  const warnings: string[] = [STANDARD_WARNING];

  const areaFits = evaluateAreaFit(plot, design, reasons);
  const widthFits = evaluateDimensionFit(
    design.widthM,
    plot.approxWidthM,
    "width",
    "Width/depth check is approximate and does not include setbacks.",
    reasons,
    warnings
  );
  const depthFits = evaluateDimensionFit(
    design.depthM,
    plot.approxDepthM,
    "depth",
    "Width/depth check is approximate and does not include setbacks.",
    reasons,
    warnings
  );

  const status = determineStatus(areaFits, widthFits, depthFits, design);
  const score = calculateScore(areaFits, widthFits, depthFits, plot, design);

  return {
    design,
    status,
    score,
    reasons,
    warnings,
    checks: { areaFits, widthFits, depthFits }
  };
}

function evaluateAreaFit(
  plot: SelectedPlot,
  design: HouseDesign,
  reasons: string[]
): boolean | null {
  if (design.floorAreaSqm == null || plot.areaSqm == null) return null;

  if (design.floorAreaSqm <= plot.areaSqm) {
    const ratio = design.floorAreaSqm / plot.areaSqm;
    if (ratio < AREA_TIGHT_RATIO) {
      reasons.push("Design floor area is within selected plot area.");
    } else {
      reasons.push("Design floor area is close to plot area — verify site coverage.");
    }
    return true;
  }

  reasons.push("Design floor area exceeds selected plot area.");
  return false;
}

function evaluateDimensionFit(
  designDim: number | null | undefined,
  plotDim: number | null | undefined,
  label: "width" | "depth",
  approxWarning: string,
  reasons: string[],
  warnings: string[]
): boolean | null {
  if (designDim == null || plotDim == null) {
    if (designDim != null) {
      warnings.push(`Design ${label} is available but plot ${label} is approximate.`);
    }
    return null;
  }

  if (designDim <= plotDim) {
    const ratio = designDim / plotDim;
    if (ratio >= DIMENSION_TIGHT_RATIO) {
      reasons.push(`Design ${label} is close to approximate plot ${label} — verify setbacks.`);
    } else {
      reasons.push(`Design ${label} is within approximate plot ${label}.`);
    }
    warnings.push(approxWarning);
    return true;
  }

  reasons.push(`Design ${label} exceeds approximate plot ${label}.`);
  warnings.push(approxWarning);
  return false;
}

function determineStatus(
  areaFits: boolean | null,
  widthFits: boolean | null,
  depthFits: boolean | null,
  design: HouseDesign
): FitStatus {
  if (areaFits === false || widthFits === false || depthFits === false) {
    return "too_large";
  }

  const missingCount = [areaFits, widthFits, depthFits].filter((v) => v === null).length;
  if (missingCount >= 2) {
    if (areaFits === null && design.widthM == null && design.depthM == null) {
      return "insufficient_data";
    }
    if (areaFits === true) return "may_fit";
    return "insufficient_data";
  }

  if (areaFits === true) {
    const hasNull = widthFits === null || depthFits === null;
    if (hasNull) return "may_fit";
    return "best_fit";
  }

  return "insufficient_data";
}

function calculateScore(
  areaFits: boolean | null,
  widthFits: boolean | null,
  depthFits: boolean | null,
  plot: SelectedPlot,
  design: HouseDesign
): number {
  let score = 0;

  if (areaFits === true) score += 40;
  else if (areaFits === false) score -= 30;

  if (widthFits === true) score += 25;
  else if (widthFits === false) score -= 25;
  else if (widthFits === null) score -= 5;

  if (depthFits === true) score += 25;
  else if (depthFits === false) score -= 25;
  else if (depthFits === null) score -= 5;

  if (areaFits === true && plot.areaSqm > 0 && design.floorAreaSqm > 0) {
    const ratio = design.floorAreaSqm / plot.areaSqm;
    if (ratio > 0.9) score -= 5;
    if (ratio < 0.3) score -= 3;
  }

  if (widthFits === true && plot.approxWidthM && design.widthM) {
    const ratio = design.widthM / plot.approxWidthM;
    if (ratio > 0.92) score -= 3;
  }

  if (depthFits === true && plot.approxDepthM && design.depthM) {
    const ratio = design.depthM / plot.approxDepthM;
    if (ratio > 0.92) score -= 3;
  }

  return score;
}

const STATUS_ORDER: Record<FitStatus, number> = {
  best_fit: 0,
  may_fit: 1,
  insufficient_data: 2,
  too_large: 3
};

function sortMatches(matches: DesignMatch[]): DesignMatch[] {
  return [...matches].sort((a, b) => {
    const statusDiff = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
    if (statusDiff !== 0) return statusDiff;
    return b.score - a.score;
  });
}
