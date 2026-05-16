import type { ParcelProvider, ProviderCapability, ProviderStatus } from "@/lib/parcels/types";
import type { Jurisdiction } from "@/lib/parcels/types";
import type { AddressSearchResult, SuburbSearchResult } from "@/types/search";
import type { BBox } from "@/types/geo";
import type { ParcelFeature, ParcelFeatureCollection } from "@/types/parcel";

const NT_CADASTRE_URL = process.env.NT_CADASTRE_URL ?? "";

const CAPABILITIES: ProviderCapability[] = ["parcel-by-point"];

const STUB_MESSAGE = "NT Geoserver is intermittently available. No public address API. Manual draw is the recommended option for NT parcels. Set NT_CADASTRE_URL if an endpoint becomes available.";

export class NtProvider implements ParcelProvider {
  readonly id: Jurisdiction = "NT";
  readonly label = "NT Geoserver (Northern Territory)";
  readonly capabilities = CAPABILITIES;

  async searchAddress(_query: string): Promise<AddressSearchResult[]> {
    return [];
  }

  async searchSuburb(_query: string): Promise<SuburbSearchResult[]> {
    return [];
  }

  async getParcelByPoint(_lat: number, _lng: number): Promise<ParcelFeature | null> {
    console.info(STUB_MESSAGE);
    return null;
  }

  async getParcelsBySuburb(
    _division: string,
    _options?: { selectableOnly?: boolean; includeContext?: boolean }
  ): Promise<ParcelFeatureCollection> {
    return stubCollection();
  }

  async getParcelsByBbox(_bbox: BBox): Promise<ParcelFeatureCollection> {
    return stubCollection();
  }

  async getStatus(): Promise<ProviderStatus> {
    return {
      id: this.id,
      label: this.label,
      capabilities: CAPABILITIES,
      configured: Boolean(NT_CADASTRE_URL),
      live: false
    };
  }
}

function stubCollection(): ParcelFeatureCollection {
  return {
    type: "FeatureCollection",
    features: [],
    source: "NT_Geoserver",
    fallbackReason: STUB_MESSAGE,
    totalFeatures: 0,
    selectableCount: 0
  };
}

export const ntProvider = new NtProvider();
