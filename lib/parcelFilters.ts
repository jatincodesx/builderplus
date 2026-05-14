import { area as turfArea } from "@turf/turf";
import type { Feature } from "geojson";
import type {
  ParcelClassification,
  ParcelProperties,
  ParcelSource
} from "@/types/parcel";

const ID_FIELDS = ["OBJECTID", "FEATUREID", "ID", "BLOCK_KEY", "GlobalID"];
const AREA_FIELDS = ["Shape__Area", "BLOCK_DERIVED_AREA", "BLOCK_LEASED_AREA"];
const BLOCK_FIELDS = ["BLOCK_NUMBER", "BLOCK", "BLOCKNUM"];
const SECTION_FIELDS = ["SECTION_NUMBER", "SECTION", "SECTIONNUM"];
const BLOCK_SECTION_FIELDS = ["BLOCK_SECTION"];
const ADDRESS_FIELDS = ["ADDRESSES", "ADDRESS", "FULL_ADDRESS"];
const DIVISION_FIELDS = ["DIVISION_NAME", "DIVISION", "SUBURB", "LOCALITY"];
const DISTRICT_FIELDS = ["DISTRICT_NAME", "DISTRICT"];
const ZONE_FIELDS = ["LAND_USE_POLICY_ZONES", "NEW_TERRITORY_PLAN"];
const LIFECYCLE_FIELDS = ["CURRENT_LIFECYCLE_STAGE"];

const RESIDENTIAL_ZONE_MARKERS = [
  "RZ1",
  "RZ2",
  "RZ3",
  "RZ4",
  "RZ5",
  "RESIDENTIAL",
  "SUBURBAN"
];

const NON_RESIDENTIAL_MARKERS = [
  "PRZ",
  "TSZ",
  "CZ",
  "IZ",
  "NUZ",
  "CFZ",
  "COMMUNITY FACILITY",
  "COMMERCIAL",
  "INDUSTRIAL",
  "TRANSPORT",
  "ROAD",
  "PARK",
  "RESERVE",
  "OPEN SPACE",
  "WATER"
];

const ROAD_OR_UTILITY_MARKERS = ["ROAD", "TRANSPORT", "WATER", "UTILITY"];

function normaliseKey(key: string) {
  return key.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function featureProperties(feature: Feature) {
  return (feature.properties ?? {}) as Record<string, unknown>;
}

function propertyValue(feature: Feature, keys: string[]) {
  const props = featureProperties(feature);
  const normalised = new Map(
    Object.keys(props).map((key) => [normaliseKey(key), key])
  );

  for (const key of keys) {
    const exactValue = props[key];
    if (exactValue !== undefined && exactValue !== null && exactValue !== "") {
      return exactValue;
    }

    const matchedKey = normalised.get(normaliseKey(key));
    const matchedValue = matchedKey ? props[matchedKey] : undefined;
    if (
      matchedValue !== undefined &&
      matchedValue !== null &&
      matchedValue !== ""
    ) {
      return matchedValue;
    }
  }

  return undefined;
}

function propertyString(feature: Feature, keys: string[], fallback = "") {
  const value = propertyValue(feature, keys);
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return fallback;
}

function propertyNumber(feature: Feature, keys: string[]) {
  const value = propertyValue(feature, keys);
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replaceAll(",", "").trim());
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function containsAny(value: string, markers: string[]) {
  const source = value.toUpperCase();
  return markers.some((marker) => source.includes(marker));
}

function hasBlockIdentity(feature: Feature) {
  return Boolean(
    (getBlockNumber(feature) && getSectionNumber(feature)) ||
      getBlockSection(feature)
  );
}

export function getAreaSqm(feature: Feature) {
  const explicitArea = propertyNumber(feature, AREA_FIELDS);
  if (explicitArea !== undefined) return Math.round(explicitArea);

  try {
    const calculated = turfArea(feature);
    return Number.isFinite(calculated) ? Math.round(calculated) : undefined;
  } catch {
    return undefined;
  }
}

export function getZone(feature: Feature) {
  return ZONE_FIELDS.map((field) => propertyString(feature, [field]))
    .filter(Boolean)
    .join(" / ");
}

export function getLifecycleStage(feature: Feature) {
  return propertyString(feature, LIFECYCLE_FIELDS);
}

export function getDivisionName(feature: Feature) {
  return propertyString(feature, DIVISION_FIELDS, "ACT");
}

export function getBlockNumber(feature: Feature) {
  return propertyString(feature, BLOCK_FIELDS);
}

export function getSectionNumber(feature: Feature) {
  return propertyString(feature, SECTION_FIELDS);
}

export function getBlockSection(feature: Feature) {
  return propertyString(feature, BLOCK_SECTION_FIELDS);
}

export function getAddress(feature: Feature) {
  return propertyString(feature, ADDRESS_FIELDS);
}

export function isResidentialZone(feature: Feature) {
  return containsAny(getZone(feature), RESIDENTIAL_ZONE_MARKERS);
}

export function isDefinitelyNonResidential(feature: Feature) {
  const zone = getZone(feature);
  const type = propertyString(feature, ["TYPE", "BLOCK_TYPE_ID"]);
  return containsAny(`${zone} ${type}`, NON_RESIDENTIAL_MARKERS);
}

export function isReasonableResidentialLotSize(feature: Feature) {
  const areaSqm = getAreaSqm(feature);
  return areaSqm !== undefined && areaSqm >= 120 && areaSqm <= 5000;
}

export function classifyParcel(feature: Feature): ParcelClassification {
  const areaSqm = getAreaSqm(feature);
  const residential = isResidentialZone(feature);
  const nonResidential = isDefinitelyNonResidential(feature);
  const zoneAndType = `${getZone(feature)} ${propertyString(feature, [
    "TYPE",
    "WATER_FLAG"
  ])}`;
  const lifecycle = getLifecycleStage(feature).toUpperCase();
  const hasIdentity = hasBlockIdentity(feature);
  const reasonableSize = isReasonableResidentialLotSize(feature);

  if (containsAny(zoneAndType, ROAD_OR_UTILITY_MARKERS) && !residential) {
    return "road-or-utility";
  }

  if (areaSqm !== undefined && areaSqm > 10000) {
    return residential ? "context-residential-large" : "nonresidential";
  }

  if (areaSqm !== undefined && areaSqm > 5000) {
    return residential ? "context-residential-large" : "nonresidential";
  }

  if (areaSqm !== undefined && areaSqm < 80) {
    return nonResidential ? "nonresidential" : "unknown";
  }

  if (nonResidential && (!residential || !reasonableSize)) {
    return "nonresidential";
  }

  if (
    residential &&
    reasonableSize &&
    hasIdentity &&
    (!lifecycle || lifecycle === "REGISTERED")
  ) {
    return "selectable-residential";
  }

  if (residential && areaSqm !== undefined && areaSqm > 5000) {
    return "context-residential-large";
  }

  if (nonResidential) {
    return containsAny(zoneAndType, ROAD_OR_UTILITY_MARKERS)
      ? "road-or-utility"
      : "nonresidential";
  }

  return "unknown";
}

export function normaliseParcelProperties(
  feature: Feature,
  source: ParcelSource = "ACTmapi",
  fallbackId?: string
): ParcelProperties {
  const id =
    propertyString(feature, ID_FIELDS) ||
    fallbackId ||
    (feature.id !== undefined ? String(feature.id) : crypto.randomUUID());
  const classification = classifyParcel(feature);

  return {
    id,
    source,
    classification,
    selectable: classification === "selectable-residential",
    areaSqm: getAreaSqm(feature),
    zone: getZone(feature),
    lifecycle: getLifecycleStage(feature),
    address: getAddress(feature),
    block: getBlockNumber(feature) || "Block",
    section: getSectionNumber(feature),
    blockSection: getBlockSection(feature),
    division: getDivisionName(feature),
    district: propertyString(feature, DISTRICT_FIELDS),
    rawProperties: featureProperties(feature)
  };
}
