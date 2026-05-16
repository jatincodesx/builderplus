import type { ParcelProvider, ProviderCapability, ProviderStatus } from "@/lib/parcels/types";
import type { Jurisdiction } from "@/lib/parcels/types";
import type { AddressSearchResult, SuburbSearchResult } from "@/types/search";
import type { BBox } from "@/types/geo";
import type { ParcelFeature, ParcelFeatureCollection } from "@/types/parcel";

const SA_CADASTRE_URL = process.env.SA_CADASTRE_URL ?? "";

const CAPABILITIES: ProviderCapability[] = ["parcel-by-point"];

const STUB_MESSAGE = "SA parcel data requires authenticated access to Location SA. Set SA_CADASTRE_URL to a validated endpoint.";

export class SaProvider implements ParcelProvider {
  readonly id: Jurisdiction = "SA";
  readonly label = "Location SA (South Australia)";
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
      configured: Boolean(SA_CADASTRE_URL),
      live: false
    };
  }
}

function stubCollection(): ParcelFeatureCollection {
  return {
    type: "FeatureCollection",
    features: [],
    source: "SA_Location",
    fallbackReason: STUB_MESSAGE,
    totalFeatures: 0,
    selectableCount: 0
  };
}

export const saProvider = new SaProvider();
