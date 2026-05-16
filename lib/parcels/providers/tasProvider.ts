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
  uniqueFields
} from "@/lib/parcels/arcgisShared";
import type { ParcelProvider, ProviderCapability, ProviderStatus } from "@/lib/parcels/types";
import type { Jurisdiction } from "@/lib/parcels/types";
import { classifyParcel, getAreaSqm, getZone } from "@/lib/parcelFilters";
import type { AddressSearchResult, SuburbSearchResult } from "@/types/search";
import type { BBox } from "@/types/geo";
import type { ParcelFeature, ParcelProperties, ParcelFeatureCollection } from "@/types/parcel";

const TAS_CADASTRE_URL =
  process.env.TAS_CADASTRE_URL ??
  "https://services.thelist.tas.gov.au/arcgis/rest/services/Public/CadastreParcels/MapServer/0";

const SUBURB_FIELD_HINTS = ["LOCALITY", "SUBURB", "DIVISION", "NAME"];
const ADDRESS_FIELD_HINTS = ["PROP_ADD", "ADDRESS", "FULL", "STREET", "LOCALITY"];
const ID_FIELDS = ["OBJECTID", "PID", "FEATUREID", "ID", "GlobalID"];
const DIVISION_FIELDS = ["LOCALITY", "SUBURB", "DIVISION_NAME", "DIVISION"];

const CAPABILITIES: ProviderCapability[] = [
  "address-search",
  "suburb-search",
  "parcel-by-point",
  "parcel-by-suburb",
  "parcel-by-bbox"
];

function normaliseTasParcel(feature: Feature): ParcelFeature {
  const attrs = (feature.properties ?? {}) as Record<string, unknown>;
  const fallbackId =
    attrString(attrs, ID_FIELDS) || String(feature.id ?? crypto.randomUUID());

  const properties: ParcelProperties = {
    id: fallbackId,
    block: attrString(attrs, ["VOLUME", "FOLIO", "LOTNUMBER"], "Lot"),
    section: attrString(attrs, ["SECTIONNUMBER", "SECTION"]),
    division: attrString(attrs, DIVISION_FIELDS, "TAS"),
    areaSqm: getAreaSqm(feature) ||
      (attrs.COMP_AREA ? Number(attrs.COMP_AREA) : undefined) ||
      (attrs.MEAS_AREA ? Number(attrs.MEAS_AREA) : undefined),
    zone: getZone(feature),
    source: "TAS_LIST",
    jurisdiction: "TAS",
    classification: classifyParcel(feature),
    selectable: true,
    address: attrString(attrs, ADDRESS_FIELD_HINTS),
    rawProperties: attrs
  };

  if (!Number.isFinite(properties.areaSqm as number)) {
    properties.areaSqm = getAreaSqm(feature);
  }

  return {
    type: "Feature",
    id: properties.id,
    properties,
    geometry: feature.geometry as ParcelFeature["geometry"]
  };
}

function tasSearchParams(where: string, extra?: Record<string, string>) {
  return new URLSearchParams({
    where,
    outFields: "*",
    returnGeometry: "true",
    outSR: "4326",
    f: "geojson",
    ...extra
  });
}

export class TasProvider implements ParcelProvider {
  readonly id: Jurisdiction = "TAS";
  readonly label = "theLIST (Tasmania)";
  readonly capabilities = CAPABILITIES;

  async searchAddress(query: string): Promise<AddressSearchResult[]> {
    if (!hasConfiguredUrl(TAS_CADASTRE_URL)) return [];

    try {
      const metadata = await fetchMetadata(TAS_CADASTRE_URL, "TAS LIST");
      const addressFields = uniqueFields(
        findLikelyFields(metadata.fields, ADDRESS_FIELD_HINTS),
        existingFields(metadata.fields, ["PROP_ADD", "ADDRESS", "FULL_ADDRESS"])
      );
      if (!addressFields.length) return [];

      const params = tasSearchParams(
        buildLikeWhere(addressFields, query, "TAS LIST"),
        { resultRecordCount: "10" }
      );
      const live = await fetchArcgisGeoJson(TAS_CADASTRE_URL, params, "TAS LIST");

      return featuresFromResponse(live)
        .filter(isPolygonFeature)
        .map((feature) => {
          const attrs = (feature.properties ?? {}) as Record<string, unknown>;
          const centroid = featureCentroid(feature);
          const address = attrString(attrs, addressFields, "TAS address");
          return {
            id: attrString(attrs, ID_FIELDS, crypto.randomUUID()),
            label: address,
            address,
            type: "address" as const,
            lat: centroid.lat,
            lng: centroid.lng,
            division: attrString(attrs, DIVISION_FIELDS),
            source: "TAS_LIST" as const,
            geometry: feature.geometry as ParcelFeature["geometry"],
            selectable: true
          };
        })
        .filter((r) => Number.isFinite(r.lat) && Number.isFinite(r.lng))
        .slice(0, 10);
    } catch (error) {
      console.warn("TAS LIST address search failed.", error);
      return [];
    }
  }

  async searchSuburb(query: string): Promise<SuburbSearchResult[]> {
    if (!hasConfiguredUrl(TAS_CADASTRE_URL)) return [];

    try {
      const metadata = await fetchMetadata(TAS_CADASTRE_URL, "TAS LIST");
      const nameFields = uniqueFields(
        findLikelyFields(metadata.fields, SUBURB_FIELD_HINTS),
        existingFields(metadata.fields, DIVISION_FIELDS)
      );
      if (!nameFields.length) return [];

      const params = tasSearchParams(
        buildLikeWhere(nameFields, query, "TAS LIST"),
        { resultRecordCount: "2000" }
      );
      const live = await fetchArcgisGeoJson(TAS_CADASTRE_URL, params, "TAS LIST");
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
          id: `tas-division-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
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
      console.warn("TAS LIST suburb search failed.", error);
      return [];
    }
  }

  async getParcelByPoint(lat: number, lng: number): Promise<ParcelFeature | null> {
    if (!hasConfiguredUrl(TAS_CADASTRE_URL)) return null;

    try {
      const params = tasSearchParams("1=1", {
        geometry: `${lng},${lat}`,
        geometryType: "esriGeometryPoint",
        inSR: "4326",
        spatialRel: "esriSpatialRelIntersects",
        resultRecordCount: "1"
      });
      const live = await fetchArcgisGeoJson(TAS_CADASTRE_URL, params, "TAS LIST");
      const feature = featuresFromResponse(live).filter(isPolygonFeature)[0];
      return feature ? normaliseTasParcel(feature) : null;
    } catch (error) {
      console.warn("TAS LIST parcel point query failed.", error);
      return null;
    }
  }

  async getParcelsBySuburb(
    division: string,
    _options?: { selectableOnly?: boolean; includeContext?: boolean }
  ): Promise<ParcelFeatureCollection> {
    if (!hasConfiguredUrl(TAS_CADASTRE_URL)) {
      return emptyTasCollection("TAS LIST URL is not configured");
    }

    try {
      const metadata = await fetchMetadata(TAS_CADASTRE_URL, "TAS LIST");
      const divisionFields = uniqueFields(
        findLikelyFields(metadata.fields, SUBURB_FIELD_HINTS),
        existingFields(metadata.fields, DIVISION_FIELDS)
      );
      const params = tasSearchParams(
        buildEqualsWhere(divisionFields, division, "TAS LIST")
      );
      const live = await fetchArcgisGeoJson(TAS_CADASTRE_URL, params, "TAS LIST");
      const features = featuresFromResponse(live)
        .filter(isPolygonFeature)
        .map(normaliseTasParcel);

      return {
        type: "FeatureCollection",
        features,
        source: "TAS_LIST",
        totalFeatures: features.length,
        selectableCount: features.filter((f) => f.properties.selectable).length,
        serviceStatus: { blockConfigured: hasConfiguredUrl(TAS_CADASTRE_URL), blockLive: features.length > 0 }
      };
    } catch (error) {
      console.warn("TAS LIST suburb query failed.", error);
      return emptyTasCollection("TAS LIST request failed");
    }
  }

  async getParcelsByBbox(bbox: BBox): Promise<ParcelFeatureCollection> {
    if (!hasConfiguredUrl(TAS_CADASTRE_URL)) {
      return emptyTasCollection("TAS LIST URL is not configured");
    }

    try {
      const params = tasSearchParams("1=1", {
        geometry: bbox.join(","),
        geometryType: "esriGeometryEnvelope",
        inSR: "4326",
        spatialRel: "esriSpatialRelIntersects"
      });
      const live = await fetchArcgisGeoJson(TAS_CADASTRE_URL, params, "TAS LIST");
      const features = featuresFromResponse(live)
        .filter(isPolygonFeature)
        .map(normaliseTasParcel);

      return {
        type: "FeatureCollection",
        features,
        source: "TAS_LIST",
        totalFeatures: features.length,
        selectableCount: features.filter((f) => f.properties.selectable).length,
        serviceStatus: { blockConfigured: hasConfiguredUrl(TAS_CADASTRE_URL), blockLive: features.length > 0 }
      };
    } catch (error) {
      console.warn("TAS LIST bbox query failed.", error);
      return emptyTasCollection("TAS LIST request failed");
    }
  }

  async getStatus(): Promise<ProviderStatus> {
    const configured = hasConfiguredUrl(TAS_CADASTRE_URL);
    let live = false;
    if (configured) {
      try {
        const metadata = await fetchMetadata(TAS_CADASTRE_URL, "TAS LIST");
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
      live
    };
  }
}

function emptyTasCollection(fallbackReason: string): ParcelFeatureCollection {
  return {
    type: "FeatureCollection",
    features: [],
    source: "TAS_LIST",
    fallbackReason,
    totalFeatures: 0,
    selectableCount: 0,
    serviceStatus: { blockConfigured: hasConfiguredUrl(TAS_CADASTRE_URL), blockLive: false }
  };
}

export const tasProvider = new TasProvider();
