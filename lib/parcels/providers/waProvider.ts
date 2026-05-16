import type { ParcelProvider, ProviderCapability, ProviderStatus } from "@/lib/parcels/types";
import type { Jurisdiction } from "@/lib/parcels/types";
import type { AddressSearchResult, SuburbSearchResult } from "@/types/search";
import type { BBox } from "@/types/geo";
import type { ParcelFeature, ParcelFeatureCollection } from "@/types/parcel";

const WA_CADASTRE_URL = process.env.WA_CADASTRE_URL ?? "";

const CAPABILITIES: ProviderCapability[] = ["parcel-by-point"];

const STUB_MESSAGE = "WA parcel data requires SLIP account (free tier available). Set WA_CADASTRE_URL to a validated endpoint from https://services.slip.wa.gov.au/public/services.";

export class WaProvider implements ParcelProvider {
  readonly id: Jurisdiction = "WA";
  readonly label = "SLIP (Western Australia)";
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
      configured: Boolean(WA_CADASTRE_URL),
      live: false
    };
  }
}

function stubCollection(): ParcelFeatureCollection {
  return {
    type: "FeatureCollection",
    features: [],
    source: "WA_SLIP",
    fallbackReason: STUB_MESSAGE,
    totalFeatures: 0,
    selectableCount: 0
  };
}

export const waProvider = new WaProvider();
