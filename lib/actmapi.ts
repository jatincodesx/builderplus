import type { Feature, FeatureCollection, Geometry } from "geojson";
import { ACTMAPI_CONFIG } from "@/lib/mapConfig";
import {
  featureBbox,
  featureCentroid,
  pointInParcel
} from "@/lib/geometry";
import { mockAddresses, mockParcels, mockSuburbs } from "@/lib/mockData";
import {
  getAddress,
  normaliseParcelProperties
} from "@/lib/parcelFilters";
import type { BBox, PolygonGeometry } from "@/types/geo";
import type { ParcelFeature, ParcelFeatureCollection } from "@/types/parcel";
import type { AddressSearchResult, SuburbSearchResult } from "@/types/search";

type ArcgisField = {
  name: string;
  alias?: string;
  type?: string;
};

type ArcgisMetadata = {
  name?: string;
  type?: string;
  geometryType?: string;
  fields?: ArcgisField[];
  error?: ArcgisError;
};

type ArcgisError = {
  code?: number;
  message?: string;
  details?: string[];
};

type ArcgisJsonFeature = {
  attributes?: Record<string, unknown>;
  geometry?: unknown;
};

type ArcgisJsonResponse = {
  features?: ArcgisJsonFeature[];
  fields?: ArcgisField[];
  error?: ArcgisError;
};

type ArcgisFeature = {
  attributes?: Record<string, unknown>;
  geometry?: Geometry;
};

type ArcgisGeoJsonResponse =
  | FeatureCollection
  | {
      features?: ArcgisFeature[];
      error?: ArcgisError;
    };

export const ACTMAPI_FALLBACK_MESSAGES = {
  missingUrl:
    "Live ACTmapi block URL missing. Using development parcel fallback data.",
  requestFailed:
    "Live ACTmapi block request failed. Using development parcel fallback data.",
  zeroResults: "No live ACT blocks found for this search."
} as const;

const jsonHeaders = {
  "content-type": "application/json"
};

const PARCEL_ID_FIELDS = ["OBJECTID", "FEATUREID", "ID", "BLOCK_KEY"];
const PARCEL_BLOCK_FIELDS = ["BLOCK", "BLOCKNUM", "BLOCK_NUMBER"];
const PARCEL_DIVISION_FIELDS = ["DIVISION", "DIVISION_NAME"];
const SUBURB_FIELD_HINTS = ["DIVISION", "SUBURB", "LOCALITY", "NAME"];
const ADDRESS_FIELD_HINTS = ["ADDRESS", "FULL", "ROAD", "STREET", "LOCALITY"];

const metadataCache = new Map<string, Promise<ArcgisMetadata>>();

function hasConfiguredUrl(url: string) {
  return Boolean(url && /^https?:\/\//i.test(url));
}

function cleanServiceUrl(url: string) {
  return url.trim().replace(/\/query\/?$/i, "").replace(/\/+$/, "");
}

function arcgisUrl(
  serviceUrl: string,
  path: "metadata" | "query",
  params: URLSearchParams
) {
  const baseUrl = cleanServiceUrl(serviceUrl);
  const endpoint = path === "query" ? `${baseUrl}/query` : baseUrl;
  return `${endpoint}?${params.toString()}`;
}

function containsQuery(source: string, query: string) {
  return source.toLowerCase().includes(query.trim().toLowerCase());
}

function normaliseSearchText(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, " ");
}

function escapeWhereText(value: string) {
  return value.replaceAll("'", "''");
}

function normaliseKey(key: string) {
  return key.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function attrValue(
  attrs: Record<string, unknown> | undefined,
  keys: string[]
) {
  if (!attrs) return undefined;

  const exact = new Map(Object.entries(attrs));
  const normalised = new Map(
    Object.keys(attrs).map((key) => [normaliseKey(key), key])
  );

  for (const key of keys) {
    const exactValue = exact.get(key);
    if (exactValue !== undefined && exactValue !== null && exactValue !== "") {
      return exactValue;
    }

    const matchedKey = normalised.get(normaliseKey(key));
    const matchedValue = matchedKey ? attrs[matchedKey] : undefined;
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

function attrString(
  attrs: Record<string, unknown> | undefined,
  keys: string[],
  fallback = ""
) {
  const value = attrValue(attrs, keys);
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number") return String(value);
  return fallback;
}

function arcgisErrorMessage(error?: ArcgisError) {
  return [error?.message, ...(error?.details ?? [])].filter(Boolean).join(" ");
}

async function fetchArcgisJson<T>(
  serviceUrl: string,
  path: "metadata" | "query",
  params: URLSearchParams,
  revalidate = 3600
): Promise<T> {
  if (!hasConfiguredUrl(serviceUrl)) {
    throw new Error("ACTmapi URL is not configured");
  }

  const response = await fetch(arcgisUrl(serviceUrl, path, params), {
    headers: jsonHeaders,
    ...(revalidate > 0 ? { next: { revalidate } } : { cache: "no-store" })
  });

  if (!response.ok) {
    throw new Error(`ACTmapi request failed with ${response.status}`);
  }

  const body = (await response.json()) as T & { error?: ArcgisError };
  if (body.error) {
    throw new Error(arcgisErrorMessage(body.error) || "ACTmapi returned an error");
  }

  return body;
}

function fetchMetadata(serviceUrl: string) {
  const cacheKey = cleanServiceUrl(serviceUrl);
  const cached = metadataCache.get(cacheKey);
  if (cached) return cached;

  const promise = fetchArcgisJson<ArcgisMetadata>(
    serviceUrl,
    "metadata",
    new URLSearchParams({ f: "pjson" }),
    86400
  );
  metadataCache.set(cacheKey, promise);
  return promise;
}

async function fetchArcgisGeoJson(
  serviceUrl: string,
  params: URLSearchParams
) {
  return fetchArcgisJson<ArcgisGeoJsonResponse>(serviceUrl, "query", params, 0);
}

function featuresFromResponse(response: ArcgisGeoJsonResponse | null) {
  if (!response) return [];
  if ("type" in response && response.type === "FeatureCollection") {
    return response.features;
  }

  return (response.features ?? [])
    .filter((item): item is Required<ArcgisFeature> => Boolean(item.geometry))
    .map(
      (item) =>
        ({
          type: "Feature",
          properties: item.attributes ?? {},
          geometry: item.geometry
        }) satisfies Feature
    );
}

function isPolygonFeature(
  feature: Feature
): feature is Feature<PolygonGeometry, Record<string, unknown>> {
  return Boolean(feature.geometry && feature.geometry.type.match(/Polygon/));
}

function isTextField(field: ArcgisField) {
  return !field.type || field.type === "esriFieldTypeString";
}

function findLikelyFields(fields: ArcgisField[] | undefined, hints: string[]) {
  const hintKeys = hints.map(normaliseKey);
  return (fields ?? [])
    .filter((field) => field.name && isTextField(field))
    .filter((field) => {
      const name = normaliseKey(field.name);
      const alias = normaliseKey(field.alias ?? "");
      return hintKeys.some((hint) => name.includes(hint) || alias.includes(hint));
    })
    .map((field) => field.name);
}

function existingFields(fields: ArcgisField[] | undefined, candidates: string[]) {
  const byNormalisedName = new Map(
    (fields ?? []).map((field) => [normaliseKey(field.name), field.name])
  );
  return candidates
    .map((candidate) => byNormalisedName.get(normaliseKey(candidate)))
    .filter((field): field is string => Boolean(field));
}

function uniqueFields(...fieldGroups: string[][]) {
  const seen = new Set<string>();
  return fieldGroups
    .flat()
    .filter((field) => {
      const key = normaliseKey(field);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function configuredBlockStatus(blockLive: boolean) {
  return {
    blockConfigured: hasConfiguredUrl(ACTMAPI_CONFIG.blockUrl),
    blockLive
  };
}

function bboxPolygon([west, south, east, north]: BBox): PolygonGeometry {
  return {
    type: "Polygon",
    coordinates: [
      [
        [west, south],
        [east, south],
        [east, north],
        [west, north],
        [west, south]
      ]
    ]
  };
}

function expandBbox(base: BBox, next: BBox): BBox {
  return [
    Math.min(base[0], next[0]),
    Math.min(base[1], next[1]),
    Math.max(base[2], next[2]),
    Math.max(base[3], next[3])
  ];
}

function buildLikeWhere(fields: string[], query: string) {
  const escaped = escapeWhereText(query);
  if (!fields.length) {
    throw new Error("No suitable ACTmapi text field was found");
  }
  return fields
    .map((field) => `UPPER(${field}) LIKE UPPER('%${escaped}%')`)
    .join(" OR ");
}

function buildEqualsWhere(fields: string[], value: string) {
  const escaped = escapeWhereText(value);
  if (!fields.length) {
    throw new Error("No suitable ACTmapi division field was found");
  }
  return fields
    .map((field) => `UPPER(${field}) = UPPER('${escaped}')`)
    .join(" OR ");
}

function normaliseParcel(
  feature: Feature<PolygonGeometry, Record<string, unknown>>
): ParcelFeature {
  const attrs = feature.properties ?? {};
  const fallbackId =
    attrString(attrs, [...PARCEL_ID_FIELDS, ...PARCEL_BLOCK_FIELDS]) ||
    String(feature.id ?? crypto.randomUUID());
  const properties = normaliseParcelProperties(feature, "ACTmapi", fallbackId);

  return {
    type: "Feature",
    id: properties.id,
    properties: { ...properties, jurisdiction: "ACT" as const },
    geometry: feature.geometry
  };
}

function ensureParcelQuality(feature: ParcelFeature): ParcelFeature {
  if (feature.properties.classification && feature.properties.selectable !== undefined) {
    return feature;
  }

  return {
    ...feature,
    properties: {
      ...feature.properties,
      classification: "selectable-residential",
      selectable: true,
      rawProperties: feature.properties.rawProperties ?? feature.properties
    }
  };
}

function withFallbackReason(feature: ParcelFeature, fallbackReason: string) {
  return {
    ...feature,
    properties: {
      ...feature.properties,
      fallbackReason
    }
  };
}

function parcelCollection(
  features: ParcelFeature[],
  fallbackReason?: string
): ParcelFeatureCollection {
  const normalisedFeatures = features.map(ensureParcelQuality);
  const source = fallbackReason || features.some((feature) => feature.properties.source === "mock")
    ? "mock"
    : "ACTmapi";
  const selectableCount = normalisedFeatures.filter(
    (feature) => feature.properties.selectable
  ).length;
  const contextCount = normalisedFeatures.filter(
    (feature) => feature.properties.classification === "context-residential-large"
  ).length;

  return {
    type: "FeatureCollection",
    features: fallbackReason
      ? normalisedFeatures.map((feature) => withFallbackReason(feature, fallbackReason))
      : normalisedFeatures,
    source,
    totalFeatures: normalisedFeatures.length,
    selectableCount,
    contextCount,
    nonSelectableCount: normalisedFeatures.length - selectableCount,
    serviceStatus: configuredBlockStatus(source === "ACTmapi" && features.length > 0),
    ...(fallbackReason ? { fallbackReason } : {})
  };
}

function mockCollection(features: ParcelFeature[], fallbackReason: string) {
  return parcelCollection(features, fallbackReason);
}

function mockParcelByPoint(lat: number, lng: number, fallbackReason: string) {
  const feature =
    mockParcels.features.find((item) => pointInParcel(item, lat, lng)) ?? null;
  return feature ? withFallbackReason(feature, fallbackReason) : null;
}

export async function searchSuburbs(q: string): Promise<SuburbSearchResult[]> {
  const query = q.trim();
  if (!query) return [];

  if (!hasConfiguredUrl(ACTMAPI_CONFIG.divisionUrl)) {
    const blockResults = await searchSuburbsFromBlockDivisions(query);
    if (blockResults.length) return blockResults;
    return mockSuburbs.filter((suburb) => containsQuery(suburb.name, query));
  }

  try {
    const metadata = await fetchMetadata(ACTMAPI_CONFIG.divisionUrl);
    const nameFields = uniqueFields(
      findLikelyFields(metadata.fields, SUBURB_FIELD_HINTS),
      existingFields(metadata.fields, [
        "DIVISION_NAME",
        "DIVISION",
        "SUBURB",
        "LOCALITY",
        "NAME"
      ])
    );
    const params = new URLSearchParams({
      where: buildLikeWhere(nameFields, query),
      outFields: "*",
      returnGeometry: "true",
      resultRecordCount: "8",
      f: "geojson"
    });
    const live = await fetchArcgisGeoJson(ACTMAPI_CONFIG.divisionUrl, params);
    const liveResults = featuresFromResponse(live)
      .filter(isPolygonFeature)
      .map((feature) => {
        const name = attrString(feature.properties, nameFields);
        return {
          id: attrString(feature.properties, ["OBJECTID", "FEATUREID", "id"], name),
          name,
          type: "suburb" as const,
          bbox: featureBbox(feature),
          centroid: featureCentroid(feature),
          geometry: feature.geometry
        };
      })
      .filter((result) => result.name);

    if (liveResults.length) return liveResults;
  } catch (error) {
    console.warn("ACTmapi suburb boundary search failed.", error);
  }

  const blockResults = await searchSuburbsFromBlockDivisions(query);
  if (blockResults.length) return blockResults;

  return mockSuburbs.filter((suburb) => containsQuery(suburb.name, query));
}

async function searchSuburbsFromBlockDivisions(
  query: string
): Promise<SuburbSearchResult[]> {
  if (!hasConfiguredUrl(ACTMAPI_CONFIG.blockUrl)) return [];

  try {
    const metadata = await fetchMetadata(ACTMAPI_CONFIG.blockUrl);
    const divisionFields = uniqueFields(
      findLikelyFields(metadata.fields, SUBURB_FIELD_HINTS),
      existingFields(metadata.fields, PARCEL_DIVISION_FIELDS)
    );
    const params = new URLSearchParams({
      where: buildLikeWhere(divisionFields, query),
      outFields: divisionFields.join(","),
      returnGeometry: "true",
      resultRecordCount: "2000",
      f: "geojson"
    });
    const live = await fetchArcgisGeoJson(ACTMAPI_CONFIG.blockUrl, params);
    const divisions = new Map<string, BBox>();

    for (const feature of featuresFromResponse(live).filter(isPolygonFeature)) {
      const name = attrString(feature.properties, divisionFields);
      if (!name) continue;
      const box = featureBbox(feature);
      const current = divisions.get(name);
      divisions.set(name, current ? expandBbox(current, box) : box);
    }

    return [...divisions.entries()]
      .map(([name, bbox]) => ({
        id: `block-division-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
        name,
        type: "suburb" as const,
        bbox,
        centroid: {
          lng: (bbox[0] + bbox[2]) / 2,
          lat: (bbox[1] + bbox[3]) / 2
        },
        geometry: bboxPolygon(bbox)
      }))
      .slice(0, 8);
  } catch (error) {
    console.warn("ACTmapi block division search failed.", error);
    return [];
  }
}

export async function searchAddresses(q: string): Promise<AddressSearchResult[]> {
  const query = normaliseSearchText(q);
  if (!query) return [];

  if (hasConfiguredUrl(ACTMAPI_CONFIG.addressesUrl)) {
    try {
      const addressResults = await searchConfiguredAddressLayer(query);
      if (addressResults.length) return addressResults;
    } catch (error) {
      console.warn("ACTmapi address search failed; falling back to block addresses.", error);
    }
  }

  const blockResults = await searchBlockAddresses(query);
  if (blockResults.length) return blockResults;

  return mockAddresses.filter((address) => containsQuery(address.label, query));
}

async function searchConfiguredAddressLayer(
  query: string
): Promise<AddressSearchResult[]> {
  const metadata = await fetchMetadata(ACTMAPI_CONFIG.addressesUrl);
  const addressFields = uniqueFields(
    findLikelyFields(metadata.fields, ADDRESS_FIELD_HINTS),
    existingFields(metadata.fields, [
      "FULL_ADDRESS",
      "ADDRESS",
      "ROAD_NAME",
      "STREET",
      "LOCALITY"
    ])
  );
  const divisionFields = uniqueFields(
    findLikelyFields(metadata.fields, SUBURB_FIELD_HINTS),
    existingFields(metadata.fields, [
      "DIVISION_NAME",
      "DIVISION",
      "SUBURB",
      "LOCALITY"
    ])
  );
  const params = new URLSearchParams({
    where: buildLikeWhere(addressFields, query),
    outFields: "*",
    returnGeometry: "true",
    resultRecordCount: "10",
    f: "geojson"
  });
  const live = await fetchArcgisGeoJson(ACTMAPI_CONFIG.addressesUrl, params);

  return featuresFromResponse(live)
    .filter((feature) => feature.geometry?.type === "Point")
    .map((feature) => {
      const properties = (feature.properties ?? {}) as Record<string, unknown>;
      const coordinates =
        feature.geometry?.type === "Point" ? feature.geometry.coordinates : [0, 0];
      return {
        id: attrString(properties, ["OBJECTID", "FEATUREID", "id"], crypto.randomUUID()),
        label: attrString(properties, addressFields, "ACT address"),
        address: attrString(properties, addressFields),
        type: "address" as const,
        lng: Number(coordinates[0]),
        lat: Number(coordinates[1]),
        division: attrString(properties, divisionFields)
      };
    })
    .filter((result) => Number.isFinite(result.lat) && Number.isFinite(result.lng));
}

async function searchBlockAddresses(
  query: string
): Promise<AddressSearchResult[]> {
  if (!hasConfiguredUrl(ACTMAPI_CONFIG.blockUrl)) return [];

  const attempts = [
    `UPPER(ADDRESSES) LIKE '%${escapeWhereText(query)}%'`,
    `ADDRESSES LIKE '%${escapeWhereText(query)}%'`,
    ...buildBroadAddressAttempts(query)
  ];

  for (const where of attempts) {
    try {
      const params = new URLSearchParams({
        where,
        outFields: "*",
        returnGeometry: "true",
        resultRecordCount: where === "ADDRESSES IS NOT NULL" ? "500" : "20",
        f: "geojson"
      });
      const live = await fetchArcgisGeoJson(ACTMAPI_CONFIG.blockUrl, params);
      const results = featuresFromResponse(live)
        .filter(isPolygonFeature)
        .filter((feature) => addressContainsQuery(feature, query))
        .map(blockFeatureToAddressResult)
        .slice(0, 10);

      if (results.length) return results;
    } catch (error) {
      console.warn("ACTmapi block address query attempt failed.", { where, error });
    }
  }

  return [];
}

function buildBroadAddressAttempts(query: string) {
  const tokens = query.split(" ").filter((token) => token.length >= 3);
  const longestToken = [...tokens].sort((a, b) => b.length - a.length)[0];
  return [
    ...(longestToken
      ? [`ADDRESSES LIKE '%${escapeWhereText(longestToken)}%'`]
      : []),
    "ADDRESSES IS NOT NULL"
  ];
}

function addressContainsQuery(feature: Feature, query: string) {
  return normaliseSearchText(getAddress(feature)).includes(query);
}

function blockFeatureToAddressResult(
  feature: Feature<PolygonGeometry, Record<string, unknown>>
): AddressSearchResult {
  const parcel = normaliseParcel(feature);
  const centroid = featureCentroid(feature);
  const address = parcel.properties.address || "ACT address";

  return {
    id: parcel.properties.id,
    type: "address",
    label: `${address}, ${parcel.properties.division} — ${[
      parcel.properties.block && parcel.properties.block !== "Block"
        ? `Block ${parcel.properties.block}`
        : "",
      parcel.properties.section ? `Section ${parcel.properties.section}` : ""
    ]
      .filter(Boolean)
      .join(" ")}`.trim(),
    address,
    division: parcel.properties.division,
    district: parcel.properties.district,
    block: parcel.properties.block,
    section: parcel.properties.section,
    blockSection: parcel.properties.blockSection,
    areaSqm: parcel.properties.areaSqm,
    zone: parcel.properties.zone,
    lifecycle: parcel.properties.lifecycle,
    centroid,
    lat: centroid.lat,
    lng: centroid.lng,
    geometry: parcel.geometry,
    source: "ACTmapi-block-address",
    selectable: parcel.properties.selectable
  };
}

export async function parcelsBySuburb(
  division: string,
  options: { selectableOnly?: boolean; includeContext?: boolean } = {}
): Promise<ParcelFeatureCollection> {
  const fallbackFeatures = mockParcels.features.filter(
    (feature) => feature.properties.division.toLowerCase() === division.toLowerCase()
  );

  if (!hasConfiguredUrl(ACTMAPI_CONFIG.blockUrl)) {
    return mockCollection(fallbackFeatures, ACTMAPI_FALLBACK_MESSAGES.missingUrl);
  }

  try {
    const metadata = await fetchMetadata(ACTMAPI_CONFIG.blockUrl);
    const divisionFields = uniqueFields(
      findLikelyFields(metadata.fields, SUBURB_FIELD_HINTS),
      existingFields(metadata.fields, PARCEL_DIVISION_FIELDS)
    );
    const params = new URLSearchParams({
      where: buildEqualsWhere(divisionFields, division),
      outFields: "*",
      returnGeometry: "true",
      f: "geojson"
    });
    const live = await fetchArcgisGeoJson(ACTMAPI_CONFIG.blockUrl, params);
    const allFeatures = featuresFromResponse(live)
      .filter(isPolygonFeature)
      .map(normaliseParcel);
    const features = filterParcelResponse(allFeatures, options);

    if (allFeatures.length) {
      return parcelCollection(features);
    }

    return mockCollection(fallbackFeatures, ACTMAPI_FALLBACK_MESSAGES.zeroResults);
  } catch (error) {
    console.warn("ACTmapi parcel suburb query failed; falling back to mock data.", error);
    return mockCollection(fallbackFeatures, ACTMAPI_FALLBACK_MESSAGES.requestFailed);
  }
}

function filterParcelResponse(
  features: ParcelFeature[],
  options: { selectableOnly?: boolean; includeContext?: boolean }
) {
  if (options.selectableOnly) {
    return features.filter((feature) => feature.properties.selectable);
  }

  if (options.includeContext === false) {
    return features.filter(
      (feature) =>
        feature.properties.selectable ||
        feature.properties.classification !== "context-residential-large"
    );
  }

  return features;
}

export async function parcelByPoint(lat: number, lng: number) {
  if (!hasConfiguredUrl(ACTMAPI_CONFIG.blockUrl)) {
    return mockParcelByPoint(lat, lng, ACTMAPI_FALLBACK_MESSAGES.missingUrl);
  }

  try {
    const params = new URLSearchParams({
      geometry: `${lng},${lat}`,
      geometryType: "esriGeometryPoint",
      inSR: "4326",
      spatialRel: "esriSpatialRelIntersects",
      outFields: "*",
      returnGeometry: "true",
      outSR: "4326",
      f: "geojson"
    });
    const live = await fetchArcgisGeoJson(ACTMAPI_CONFIG.blockUrl, params);
    const feature = featuresFromResponse(live)
      .filter(isPolygonFeature)
      .map(normaliseParcel)[0];

    if (feature) return feature;
    return mockParcelByPoint(lat, lng, ACTMAPI_FALLBACK_MESSAGES.zeroResults);
  } catch (error) {
    console.warn("ACTmapi parcel point query failed; falling back to mock data.", error);
    return mockParcelByPoint(lat, lng, ACTMAPI_FALLBACK_MESSAGES.requestFailed);
  }
}

export async function parcelsByBbox(
  bbox: BBox
): Promise<ParcelFeatureCollection> {
  const fallbackFeatures = mockParcels.features.filter((feature) => {
    const [west, south, east, north] = bbox;
    const featureBox = featureBbox(feature);
    return !(
      featureBox[2] < west ||
      featureBox[0] > east ||
      featureBox[3] < south ||
      featureBox[1] > north
    );
  });

  if (!hasConfiguredUrl(ACTMAPI_CONFIG.blockUrl)) {
    return mockCollection(fallbackFeatures, ACTMAPI_FALLBACK_MESSAGES.missingUrl);
  }

  try {
    const params = new URLSearchParams({
      geometry: bbox.join(","),
      geometryType: "esriGeometryEnvelope",
      inSR: "4326",
      spatialRel: "esriSpatialRelIntersects",
      outFields: "*",
      returnGeometry: "true",
      outSR: "4326",
      f: "geojson"
    });
    const live = await fetchArcgisGeoJson(ACTMAPI_CONFIG.blockUrl, params);
    const features = featuresFromResponse(live)
      .filter(isPolygonFeature)
      .map(normaliseParcel);

    if (features.length) {
      return parcelCollection(features);
    }

    return mockCollection(fallbackFeatures, ACTMAPI_FALLBACK_MESSAGES.zeroResults);
  } catch (error) {
    console.warn("ACTmapi parcel bbox query failed; falling back to mock data.", error);
    return mockCollection(fallbackFeatures, ACTMAPI_FALLBACK_MESSAGES.requestFailed);
  }
}

export async function getActmapiDebug() {
  const blockUrl = ACTMAPI_CONFIG.blockUrl;
  const configured = hasConfiguredUrl(blockUrl);

  if (!configured) {
    return {
      block: {
        configured,
        metadataOk: false,
        queryOk: false,
        message: ACTMAPI_FALLBACK_MESSAGES.missingUrl
      }
    };
  }

  let metadata: ArcgisMetadata | null = null;
  let metadataError = "";
  let query: ArcgisJsonResponse | null = null;
  let queryError = "";

  try {
    metadata = await fetchArcgisJson<ArcgisMetadata>(
      blockUrl,
      "metadata",
      new URLSearchParams({ f: "pjson" }),
      0
    );
  } catch (error) {
    metadataError = error instanceof Error ? error.message : String(error);
  }

  try {
    query = await fetchArcgisJson<ArcgisJsonResponse>(
      blockUrl,
      "query",
      new URLSearchParams({
        where: "1=1",
        outFields: "*",
        returnGeometry: "false",
        resultRecordCount: "3",
        f: "json"
      }),
      0
    );
  } catch (error) {
    queryError = error instanceof Error ? error.message : String(error);
  }

  return {
    block: {
      configured,
      service: safeServiceLabel(blockUrl),
      metadataOk: Boolean(metadata),
      metadataError,
      queryOk: Boolean(query),
      queryError,
      serviceName: metadata?.name,
      serviceType: metadata?.type,
      geometryType: metadata?.geometryType,
      fieldNames: (metadata?.fields ?? query?.fields ?? []).map((field) => field.name),
      sampleAttributes: (query?.features ?? [])
        .map((feature) => feature.attributes ?? {})
        .slice(0, 3)
    }
  };
}

function safeServiceLabel(serviceUrl: string) {
  try {
    const url = new URL(serviceUrl);
    return `${url.origin}${url.pathname}`;
  } catch {
    return "Configured ACTmapi service URL";
  }
}
