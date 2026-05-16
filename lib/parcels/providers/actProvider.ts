import {
  searchAddresses,
  searchSuburbs,
  parcelsBySuburb,
  parcelByPoint,
  parcelsByBbox,
  getActmapiDebug
} from "@/lib/actmapi";
import { isActmapiConfigured } from "@/lib/mapConfig";
import type { ParcelProvider, ProviderCapability, ProviderStatus } from "@/lib/parcels/types";
import type { Jurisdiction } from "@/lib/parcels/types";
import type { AddressSearchResult, SuburbSearchResult } from "@/types/search";
import type { BBox } from "@/types/geo";
import type { ParcelFeature, ParcelFeatureCollection } from "@/types/parcel";

const CAPABILITIES: ProviderCapability[] = [
  "address-search",
  "suburb-search",
  "parcel-by-point",
  "parcel-by-suburb",
  "parcel-by-bbox"
];

export class ActProvider implements ParcelProvider {
  readonly id: Jurisdiction = "ACT";
  readonly label = "ACTmapi";
  readonly capabilities = CAPABILITIES;

  async searchAddress(query: string): Promise<AddressSearchResult[]> {
    return searchAddresses(query);
  }

  async searchSuburb(query: string): Promise<SuburbSearchResult[]> {
    return searchSuburbs(query);
  }

  async getParcelByPoint(lat: number, lng: number): Promise<ParcelFeature | null> {
    return parcelByPoint(lat, lng);
  }

  async getParcelsBySuburb(
    division: string,
    options?: { selectableOnly?: boolean; includeContext?: boolean }
  ): Promise<ParcelFeatureCollection> {
    return parcelsBySuburb(division, options);
  }

  async getParcelsByBbox(bbox: BBox): Promise<ParcelFeatureCollection> {
    return parcelsByBbox(bbox);
  }

  async getStatus(): Promise<ProviderStatus> {
    const configured = isActmapiConfigured();
    let live = false;
    if (configured) {
      try {
        const debug = await getActmapiDebug();
        live = Boolean(debug.block?.queryOk);
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

export const actProvider = new ActProvider();
