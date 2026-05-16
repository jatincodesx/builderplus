import type { Feature, FeatureCollection, Geometry } from "geojson";

export type ArcgisField = {
  name: string;
  alias?: string;
  type?: string;
};

export type ArcgisMetadata = {
  name?: string;
  type?: string;
  geometryType?: string;
  fields?: ArcgisField[];
  error?: ArcgisError;
  maxRecordCount?: number;
};

type ArcgisError = {
  code?: number;
  message?: string;
  details?: string[];
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

const metadataCache = new Map<string, Promise<ArcgisMetadata>>();

const PROVIDER_TIMEOUT_MS = 15_000;
const PROVIDER_RETRY_COUNT = 1;

function hasConfiguredUrl(url: string) {
  return Boolean(url && /^https?:\/\//i.test(url));
}

export function cleanServiceUrl(url: string) {
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

export function normaliseKey(key: string) {
  return key.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function attrValue(
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

export function attrString(
  attrs: Record<string, unknown> | undefined,
  keys: string[],
  fallback = ""
) {
  const value = attrValue(attrs, keys);
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number") return String(value);
  return fallback;
}

export function isPolygonFeature(
  feature: Feature
): feature is Feature<Geometry, Record<string, unknown>> {
  return Boolean(feature.geometry && feature.geometry.type.match(/Polygon/));
}

function arcgisErrorMessage(error?: ArcgisError) {
  return [error?.message, ...(error?.details ?? [])].filter(Boolean).join(" ");
}

export function isTextField(field: ArcgisField) {
  return !field.type || field.type === "esriFieldTypeString";
}

export function findLikelyFields(
  fields: ArcgisField[] | undefined,
  hints: string[]
) {
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

export function existingFields(
  fields: ArcgisField[] | undefined,
  candidates: string[]
) {
  const byNormalisedName = new Map(
    (fields ?? []).map((field) => [normaliseKey(field.name), field.name])
  );
  return candidates
    .map((candidate) => byNormalisedName.get(normaliseKey(candidate)))
    .filter((field): field is string => Boolean(field));
}

export function uniqueFields(...fieldGroups: string[][]) {
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

export async function fetchArcgisJson<T>(
  serviceUrl: string,
  path: "metadata" | "query",
  params: URLSearchParams,
  revalidate = 3600,
  providerLabel = "ArcGIS"
): Promise<T> {
  if (!hasConfiguredUrl(serviceUrl)) {
    throw new Error(`${providerLabel} URL is not configured`);
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= PROVIDER_RETRY_COUNT; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS);

      const response = await fetch(arcgisUrl(serviceUrl, path, params), {
        headers: { "content-type": "application/json" },
        signal: controller.signal,
        ...(revalidate > 0 ? { next: { revalidate } } : { cache: "no-store" })
      });

      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`${providerLabel} request failed with ${response.status}`);
      }

      const body = (await response.json()) as T & { error?: ArcgisError };
      if (body.error) {
        throw new Error(
          arcgisErrorMessage(body.error) || `${providerLabel} returned an error`
        );
      }

      return body;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < PROVIDER_RETRY_COUNT) {
        await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
      }
    }
  }

  throw lastError;
}

export function fetchMetadata(serviceUrl: string, providerLabel = "ArcGIS") {
  const cacheKey = cleanServiceUrl(serviceUrl);
  const cached = metadataCache.get(cacheKey);
  if (cached) return cached;

  const promise = fetchArcgisJson<ArcgisMetadata>(
    serviceUrl,
    "metadata",
    new URLSearchParams({ f: "pjson" }),
    86400,
    providerLabel
  );
  metadataCache.set(cacheKey, promise);
  return promise;
}

export async function fetchArcgisGeoJson(
  serviceUrl: string,
  params: URLSearchParams,
  providerLabel = "ArcGIS"
) {
  return fetchArcgisJson<ArcgisGeoJsonResponse>(
    serviceUrl,
    "query",
    params,
    0,
    providerLabel
  );
}

export function featuresFromResponse(response: ArcgisGeoJsonResponse | null) {
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

export function buildLikeWhere(fields: string[], query: string, providerLabel = "ArcGIS") {
  const escaped = escapeWhereText(query);
  if (!fields.length) {
    throw new Error(`No suitable ${providerLabel} text field was found`);
  }
  return fields
    .map((field) => `UPPER(${field}) LIKE UPPER('%${escaped}%')`)
    .join(" OR ");
}

export function buildEqualsWhere(fields: string[], value: string, providerLabel = "ArcGIS") {
  const escaped = escapeWhereText(value);
  if (!fields.length) {
    throw new Error(`No suitable ${providerLabel} field was found`);
  }
  return fields
    .map((field) => `UPPER(${field}) = UPPER('${escaped}')`)
    .join(" OR ");
}

function escapeWhereText(value: string) {
  return value.replaceAll("'", "''");
}

export function configuredUrlStatus(url: string, live: boolean) {
  return {
    configured: hasConfiguredUrl(url),
    live
  };
}

export { hasConfiguredUrl };
