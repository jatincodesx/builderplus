import type { ParcelProvider, ProviderCapability, ProviderStatus } from "@/lib/parcels/types";
import type { Jurisdiction } from "@/lib/parcels/types";
import type { AddressSearchResult, SuburbSearchResult } from "@/types/search";
import type { BBox } from "@/types/geo";
import type { ParcelFeature, ParcelFeatureCollection } from "@/types/parcel";

const VIC_CADASTRE_URL = process.env.VIC_CADASTRE_URL ?? "";

const CAPABILITIES: ProviderCapability[] = ["parcel-by-point"];

const STUB_MESSAGE = "VIC parcel data requires authenticated access to Data.Vic / Vicmap Property. Set VIC_CADASTRE_URL to a validated endpoint.";

export class VicProvider implements ParcelProvider {
  readonly id: Jurisdiction = "VIC";
  readonly label = "Land Victoria (Data.Vic)";
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
      configured: Boolean(VIC_CADASTRE_URL),
      live: false
    };
  }
}

function stubCollection(): ParcelFeatureCollection {
  return {
    type: "FeatureCollection",
    features: [],
    source: "VIC_DataVic",
    fallbackReason: STUB_MESSAGE,
    totalFeatures: 0,
    selectableCount: 0
  };
}

export const vicProvider = new VicProvider();
