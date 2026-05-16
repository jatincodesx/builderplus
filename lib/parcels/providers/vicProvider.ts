import type { Feature } from "geojson";
import { featureBbox, featureCentroid } from "@/lib/geometry";
import {
  attrString,
  buildEqualsWhere,
  existingFields,
  fetchArcgisGeoJson,
  fetchMetadata,
  featuresFromResponse,
  findLikelyFields,
  hasConfiguredUrl,
  isPolygonFeature,
  queryArcgisByBbox,
  queryArcgisByPoint,
  searchArcgisTextFields,
  uniqueFields
} from "@/lib/parcels/arcgisShared";
import type { ParcelProvider, ProviderCapability, ProviderStatus } from "@/lib/parcels/types";
import type { Jurisdiction } from "@/lib/parcels/types";
import { classifyParcel, getAreaSqm, getZone } from "@/lib/parcelFilters";
import type { AddressSearchResult, SuburbSearchResult } from "@/types/search";
import type { BBox } from "@/types/geo";
import type { ParcelFeature, ParcelProperties, ParcelFeatureCollection } from "@/types/parcel";

const VIC_CADASTRE_URL =
  process.env.VIC_CADASTRE_URL ?? "";

const SUBURB_FIELD_HINTS = ["LOCALITY", "SUBURB", "DIVISION", "NAME", "LOCAL_GOVERNMENT"];
const ADDRESS_FIELD_HINTS = ["ADDRESS", "PROP_ADD", "FULL", "STREET", "LOCALITY", "PROPERTY_ADDRESS"];
const ID_FIELDS = ["OBJECTID", "FEATUREID", "ID", "GlobalID", "PID"];
const DIVISION_FIELDS = ["LOCALITY", "SUBURB", "DIVISION_NAME", "DIVISION"];

const CAPABILITIES: ProviderCapability[] = [
  "suburb-search",
  "parcel-by-point",
  "parcel-by-suburb",
  "parcel-by-bbox"
];

const STUB_MESSAGE = "VIC parcel data requires authenticated access to Data.Vic / Vicmap Property. Set VIC_CADASTRE_URL to a validated endpoint.";

function normaliseVicParcel(feature: Feature): ParcelFeature {
  const attrs = (feature.properties ?? {}) as Record<string, unknown>;
  const fallbackId =
    attrString(attrs, ID_FIELDS) || String(feature.id ?? crypto.randomUUID());

  const properties: ParcelProperties = {
    id: fallbackId,
    block: attrString(attrs, ["LOT", "LOTNUMBER", "Lot"], "Lot"),
    section: attrString(attrs, ["SECTION", "SECTIONNUMBER", "Section"]),
    division: attrString(attrs, DIVISION_FIELDS, "VIC"),
    areaSqm: getAreaSqm(feature),
    zone: getZone(feature),
    source: "VIC_DataVic",
    jurisdiction: "VIC",
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

export class VicProvider implements ParcelProvider {
  readonly id: Jurisdiction = "VIC";
  readonly label = "Land Victoria (Data.Vic)";
  readonly capabilities = CAPABILITIES;

  async searchAddress(_query: string): Promise<AddressSearchResult[]> {
    if (!hasConfiguredUrl(VIC_CADASTRE_URL)) return [];

    try {
      const { features, searchFields } = await searchArcgisTextFields(
        VIC_CADASTRE_URL,
        ADDRESS_FIELD_HINTS,
        _query,
        "VIC DataVic",
        10
      );
      return features
        .filter(isPolygonFeature)
        .map((feature) => {
          const attrs = (feature.properties ?? {}) as Record<string, unknown>;
          const centroid = featureCentroid(feature);
          const address = attrString(attrs, searchFields, "VIC address");
          return {
            id: attrString(attrs, ID_FIELDS, crypto.randomUUID()),
            label: address,
            address,
            type: "address" as const,
            lat: centroid.lat,
            lng: centroid.lng,
            division: attrString(attrs, DIVISION_FIELDS),
            source: "VIC_DataVic" as const,
            geometry: feature.geometry as ParcelFeature["geometry"],
            selectable: true
          };
        })
        .filter((r) => Number.isFinite(r.lat) && Number.isFinite(r.lng))
        .slice(0, 10);
    } catch (error) {
      console.warn("VIC address search failed.", error);
      return [];
    }
  }

  async searchSuburb(query: string): Promise<SuburbSearchResult[]> {
    if (!hasConfiguredUrl(VIC_CADASTRE_URL)) return [];

    try {
      const { features: rawFeatures, searchFields } = await searchArcgisTextFields(
        VIC_CADASTRE_URL,
        SUBURB_FIELD_HINTS,
        query,
        "VIC DataVic",
        2000
      );
      const divisions = new Map<string, BBox>();

      for (const feature of rawFeatures.filter(isPolygonFeature)) {
        const attrs = (feature.properties ?? {}) as Record<string, unknown>;
        const name = attrString(attrs, searchFields);
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
          id: `vic-division-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
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
      console.warn("VIC suburb search failed.", error);
      return [];
    }
  }

  async getParcelByPoint(lat: number, lng: number): Promise<ParcelFeature | null> {
    if (!hasConfiguredUrl(VIC_CADASTRE_URL)) return null;

    try {
      const live = await queryArcgisByPoint(VIC_CADASTRE_URL, lat, lng, "VIC DataVic");
      const feature = featuresFromResponse(live).filter(isPolygonFeature)[0];
      return feature ? normaliseVicParcel(feature) : null;
    } catch (error) {
      console.warn("VIC parcel point query failed.", error);
      return null;
    }
  }

  async getParcelsBySuburb(
    division: string,
    _options?: { selectableOnly?: boolean; includeContext?: boolean }
  ): Promise<ParcelFeatureCollection> {
    if (!hasConfiguredUrl(VIC_CADASTRE_URL)) {
      return emptyVicCollection("VIC Cadastre URL is not configured");
    }

    try {
      const metadata = await fetchMetadata(VIC_CADASTRE_URL, "VIC DataVic");
      const divisionFields = uniqueFields(
        findLikelyFields(metadata.fields, SUBURB_FIELD_HINTS),
        existingFields(metadata.fields, DIVISION_FIELDS)
      );
      const params = new URLSearchParams({
        where: buildEqualsWhere(divisionFields, division, "VIC DataVic"),
        outFields: "*",
        returnGeometry: "true",
        outSR: "4326",
        f: "geojson"
      });
      const live = await fetchArcgisGeoJson(VIC_CADASTRE_URL, params, "VIC DataVic");
      const features = featuresFromResponse(live)
        .filter(isPolygonFeature)
        .map(normaliseVicParcel);

      return {
        type: "FeatureCollection",
        features,
        source: "VIC_DataVic",
        totalFeatures: features.length,
        selectableCount: features.filter((f) => f.properties.selectable).length,
        serviceStatus: { blockConfigured: hasConfiguredUrl(VIC_CADASTRE_URL), blockLive: features.length > 0 }
      };
    } catch (error) {
      console.warn("VIC suburb query failed.", error);
      return emptyVicCollection("VIC DataVic request failed");
    }
  }

  async getParcelsByBbox(bbox: BBox): Promise<ParcelFeatureCollection> {
    if (!hasConfiguredUrl(VIC_CADASTRE_URL)) {
      return emptyVicCollection("VIC Cadastre URL is not configured");
    }

    try {
      const live = await queryArcgisByBbox(VIC_CADASTRE_URL, bbox, "VIC DataVic");
      const features = featuresFromResponse(live)
        .filter(isPolygonFeature)
        .map(normaliseVicParcel);

      return {
        type: "FeatureCollection",
        features,
        source: "VIC_DataVic",
        totalFeatures: features.length,
        selectableCount: features.filter((f) => f.properties.selectable).length,
        serviceStatus: { blockConfigured: hasConfiguredUrl(VIC_CADASTRE_URL), blockLive: features.length > 0 }
      };
    } catch (error) {
      console.warn("VIC bbox query failed.", error);
      return emptyVicCollection("VIC DataVic request failed");
    }
  }

  async getStatus(): Promise<ProviderStatus> {
    const configured = hasConfiguredUrl(VIC_CADASTRE_URL);
    let live = false;
    if (configured) {
      try {
        const metadata = await fetchMetadata(VIC_CADASTRE_URL, "VIC DataVic");
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
      supportsAddressSearch: configured,
      supportsSuburbSearch: configured,
      supportsParcelByPoint: configured,
      supportsBbox: configured,
      sourceUrl: VIC_CADASTRE_URL || "https://discover.data.vic.gov.au/",
      notes: configured
        ? live ? "Endpoint reachable — functionality depends on layer fields" : "Configured but endpoint unreachable"
        : STUB_MESSAGE
    };
  }
}

function emptyVicCollection(fallbackReason: string): ParcelFeatureCollection {
  return {
    type: "FeatureCollection",
    features: [],
    source: "VIC_DataVic",
    fallbackReason,
    totalFeatures: 0,
    selectableCount: 0
  };
}

export const vicProvider = new VicProvider();
