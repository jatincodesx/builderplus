import type { Feature } from "geojson";
import { featureBbox, featureCentroid } from "@/lib/geometry";
import {
  attrString,
  buildEqualsWhere,
  buildLikeWhere,
  existingFields,
  fetchArcgisGeoJson,
  fetchMetadata,
  featuresFromResponse,
  findLikelyFields,
  hasConfiguredUrl,
  isPolygonFeature,
  queryArcgisByBbox,
  queryArcgisByPoint,
  uniqueFields
} from "@/lib/parcels/arcgisShared";
import type { ParcelProvider, ProviderCapability, ProviderStatus } from "@/lib/parcels/types";
import type { Jurisdiction } from "@/lib/parcels/types";
import {
  classifyParcel,
  getAreaSqm,
  getZone
} from "@/lib/parcelFilters";
import type { AddressSearchResult, SuburbSearchResult } from "@/types/search";
import type { BBox } from "@/types/geo";
import type { ParcelFeature, ParcelProperties, ParcelFeatureCollection } from "@/types/parcel";

const NSW_CADASTRE_URL =
  process.env.NSW_CADASTRE_URL ??
  "https://maps.six.nsw.gov.au/arcgis/rest/services/public/NSW_Cadastre/MapServer/9";

const NSW_SUBURB_URL =
  process.env.NSW_SUBURB_URL ??
  "https://maps.six.nsw.gov.au/arcgis/rest/services/public/NSW_Administrative_Boundaries/MapServer/0";

const SUBURB_FIELD_HINTS = ["LOCALITY", "SUBURB", "DIVISION", "NAME"];
const ADDRESS_FIELD_HINTS = ["ADDRESS", "PROP_ADD", "FULL", "STREET", "LOCALITY"];
const ID_FIELDS = ["OBJECTID", "FEATUREID", "ID", "GlobalID", "RID"];
const DIVISION_FIELDS = ["LOCALITY", "SUBURB", "DIVISION_NAME", "DIVISION", "SUBURBNAME"];
const NSW_SUBURB_NAME_FIELDS = ["SUBURBNAME", "SUBURB_NAME", "NAME"];

const CAPABILITIES: ProviderCapability[] = [
  "suburb-search",
  "parcel-by-point",
  "parcel-by-suburb",
  "parcel-by-bbox"
];

function normaliseNswParcel(feature: Feature): ParcelFeature {
  const attrs = (feature.properties ?? {}) as Record<string, unknown>;
  const fallbackId =
    attrString(attrs, ID_FIELDS) || String(feature.id ?? crypto.randomUUID());

  const properties: ParcelProperties = {
    id: fallbackId,
    block: attrString(attrs, ["lotnumber", "LOTNUMBER", "Lot"], "Lot"),
    section: attrString(attrs, ["sectionnumber", "SECTIONNUMBER", "Section"]),
    division: attrString(attrs, DIVISION_FIELDS, "NSW"),
    areaSqm: getAreaSqm(feature),
    zone: getZone(feature),
    source: "NSW_Cadastre",
    jurisdiction: "NSW",
    classification: classifyParcel(feature),
    selectable: true,
    address: attrString(attrs, ADDRESS_FIELD_HINTS),
    rawProperties: attrs
  };

  return {
    type: "Feature",
    id: properties.id,
    properties,
    geometry: feature.geometry as ParcelFeature["geometry"]
  };
}

function nswSearchParams(where: string, extra?: Record<string, string>) {
  return new URLSearchParams({
    where,
    outFields: "*",
    returnGeometry: "true",
    outSR: "4326",
    f: "geojson",
    ...extra
  });
}

export class NswProvider implements ParcelProvider {
  readonly id: Jurisdiction = "NSW";
  readonly label = "NSW Cadastre (SIX Maps)";
  readonly capabilities = CAPABILITIES;

  async searchAddress(_query: string): Promise<AddressSearchResult[]> {
    return [];
  }

  async searchSuburb(query: string): Promise<SuburbSearchResult[]> {
    if (hasConfiguredUrl(NSW_SUBURB_URL)) {
      try {
        const metadata = await fetchMetadata(NSW_SUBURB_URL, "NSW Suburbs");
        const nameFields = uniqueFields(
          findLikelyFields(metadata.fields, NSW_SUBURB_NAME_FIELDS),
          existingFields(metadata.fields, NSW_SUBURB_NAME_FIELDS)
        );
        if (nameFields.length) {
          const params = nswSearchParams(
            buildLikeWhere(nameFields, query, "NSW Suburbs"),
            { resultRecordCount: "8" }
          );
          const live = await fetchArcgisGeoJson(NSW_SUBURB_URL, params, "NSW Suburbs");
          const results = featuresFromResponse(live)
            .filter(isPolygonFeature)
            .map((feature) => {
              const attrs = (feature.properties ?? {}) as Record<string, unknown>;
              const name = attrString(attrs, nameFields);
              if (!name) return null;
              const centroid = featureCentroid(feature);
              const bbox = featureBbox(feature);
              return {
                id: `nsw-suburb-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
                name,
                type: "suburb" as const,
                bbox,
                centroid,
                geometry: feature.geometry as SuburbSearchResult["geometry"]
              };
            })
            .filter((r): r is SuburbSearchResult => r !== null)
            .slice(0, 8);
          if (results.length) return results;
        }
      } catch (error) {
        console.warn("NSW suburb boundary search failed.", error);
      }
    }

    if (!hasConfiguredUrl(NSW_CADASTRE_URL)) return [];

    try {
      const metadata = await fetchMetadata(NSW_CADASTRE_URL, "NSW Cadastre");
      const nameFields = uniqueFields(
        findLikelyFields(metadata.fields, SUBURB_FIELD_HINTS),
        existingFields(metadata.fields, DIVISION_FIELDS)
      );
      if (!nameFields.length) return [];

      const params = nswSearchParams(
        buildLikeWhere(nameFields, query, "NSW Cadastre"),
        { resultRecordCount: "8" }
      );
      const live = await fetchArcgisGeoJson(NSW_CADASTRE_URL, params, "NSW Cadastre");
      const divisions = new Map<string, BBox>();

      for (const feature of featuresFromResponse(live).filter(isPolygonFeature)) {
        const name = attrString(feature.properties as Record<string, unknown>, nameFields);
        if (!name) continue;
        const box = featureBbox(feature);
        const current = divisions.get(name);
        divisions.set(
          name,
          current
            ? [
                Math.min(current[0], box[0]),
                Math.min(current[1], box[1]),
                Math.max(current[2], box[2]),
                Math.max(current[3], box[3])
              ] as BBox
            : box
        );
      }

      return [...divisions.entries()]
        .map(([name, bbox]) => ({
          id: `nsw-division-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
          name,
          type: "suburb" as const,
          bbox,
          centroid: {
            lng: (bbox[0] + bbox[2]) / 2,
            lat: (bbox[1] + bbox[3]) / 2
          },
          geometry: {
            type: "Polygon" as const,
            coordinates: [
              [
                [bbox[0], bbox[1]],
                [bbox[2], bbox[1]],
                [bbox[2], bbox[3]],
                [bbox[0], bbox[3]],
                [bbox[0], bbox[1]]
              ]
            ]
          }
        }))
        .slice(0, 8);
    } catch (error) {
      console.warn("NSW Cadastre suburb search failed.", error);
      return [];
    }
  }

  async getParcelByPoint(lat: number, lng: number): Promise<ParcelFeature | null> {
    if (!hasConfiguredUrl(NSW_CADASTRE_URL)) return null;

    try {
      const live = await queryArcgisByPoint(NSW_CADASTRE_URL, lat, lng, "NSW Cadastre");
      const feature = featuresFromResponse(live).filter(isPolygonFeature)[0];
      return feature ? normaliseNswParcel(feature) : null;
    } catch (error) {
      console.warn("NSW Cadastre parcel point query failed.", error);
      return null;
    }
  }

  async getParcelsBySuburb(
    division: string,
    _options?: { selectableOnly?: boolean; includeContext?: boolean }
  ): Promise<ParcelFeatureCollection> {
    if (!hasConfiguredUrl(NSW_CADASTRE_URL)) {
      return emptyNswCollection("NSW Cadastre URL is not configured");
    }

    try {
      const metadata = await fetchMetadata(NSW_CADASTRE_URL, "NSW Cadastre");
      const divisionFields = uniqueFields(
        findLikelyFields(metadata.fields, SUBURB_FIELD_HINTS),
        existingFields(metadata.fields, DIVISION_FIELDS)
      );
      const params = nswSearchParams(
        buildEqualsWhere(divisionFields, division, "NSW Cadastre")
      );
      const live = await fetchArcgisGeoJson(NSW_CADASTRE_URL, params, "NSW Cadastre");
      const features = featuresFromResponse(live)
        .filter(isPolygonFeature)
        .map(normaliseNswParcel);

      return {
        type: "FeatureCollection",
        features,
        source: "NSW_Cadastre",
        totalFeatures: features.length,
        selectableCount: features.filter((f) => f.properties.selectable).length,
        serviceStatus: { blockConfigured: hasConfiguredUrl(NSW_CADASTRE_URL), blockLive: features.length > 0 }
      };
    } catch (error) {
      console.warn("NSW Cadastre suburb query failed.", error);
      return emptyNswCollection("NSW Cadastre request failed");
    }
  }

  async getParcelsByBbox(bbox: BBox): Promise<ParcelFeatureCollection> {
    if (!hasConfiguredUrl(NSW_CADASTRE_URL)) {
      return emptyNswCollection("NSW Cadastre URL is not configured");
    }

    try {
      const live = await queryArcgisByBbox(NSW_CADASTRE_URL, bbox, "NSW Cadastre");
      const features = featuresFromResponse(live)
        .filter(isPolygonFeature)
        .map(normaliseNswParcel);

      return {
        type: "FeatureCollection",
        features,
        source: "NSW_Cadastre",
        totalFeatures: features.length,
        selectableCount: features.filter((f) => f.properties.selectable).length,
        serviceStatus: { blockConfigured: hasConfiguredUrl(NSW_CADASTRE_URL), blockLive: features.length > 0 }
      };
    } catch (error) {
      console.warn("NSW Cadastre bbox query failed.", error);
      return emptyNswCollection("NSW Cadastre request failed");
    }
  }

  async getStatus(): Promise<ProviderStatus> {
    const configured = hasConfiguredUrl(NSW_CADASTRE_URL);
    let live = false;
    if (configured) {
      try {
        const metadata = await fetchMetadata(NSW_CADASTRE_URL, "NSW Cadastre");
        live = Boolean(metadata.fields?.length);
      } catch {
        live = false;
      }
    }
    return {
      id: this.id,
      label: this.label,
      capabilities: CAPABILITIES,
      configured,
      live,
      status: live ? "working" : configured ? "partial" : "stub",
      supportsAddressSearch: false,
      supportsSuburbSearch: true,
      supportsParcelByPoint: true,
      supportsBbox: true,
      sourceUrl: NSW_CADASTRE_URL,
      notes: live ? "Parcel and suburb search confirmed; no public address API" : "NSW Cadastre endpoint unreachable or not configured"
    };
  }
}

function emptyNswCollection(fallbackReason: string): ParcelFeatureCollection {
  return {
    type: "FeatureCollection",
    features: [],
    source: "NSW_Cadastre",
    fallbackReason,
    totalFeatures: 0,
    selectableCount: 0,
    serviceStatus: { blockConfigured: hasConfiguredUrl(NSW_CADASTRE_URL), blockLive: false }
  };
}

export const nswProvider = new NswProvider();
