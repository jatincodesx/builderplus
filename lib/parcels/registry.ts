import type { ParcelProvider, Jurisdiction, ProviderStatus } from "@/lib/parcels/types";
import { ALL_JURISDICTIONS } from "@/lib/parcels/types";
import { actProvider } from "@/lib/parcels/providers/actProvider";
import { nswProvider } from "@/lib/parcels/providers/nswProvider";
import { vicProvider } from "@/lib/parcels/providers/vicProvider";
import { qldProvider } from "@/lib/parcels/providers/qldProvider";
import { saProvider } from "@/lib/parcels/providers/saProvider";
import { waProvider } from "@/lib/parcels/providers/waProvider";
import { tasProvider } from "@/lib/parcels/providers/tasProvider";
import { ntProvider } from "@/lib/parcels/providers/ntProvider";

const DEFAULT_JURISDICTION: Jurisdiction =
  (process.env.DEFAULT_JURISDICTION as Jurisdiction) || "ACT";

const providers = new Map<Jurisdiction, ParcelProvider>([
  ["ACT", actProvider],
  ["NSW", nswProvider],
  ["VIC", vicProvider],
  ["QLD", qldProvider],
  ["SA", saProvider],
  ["WA", waProvider],
  ["TAS", tasProvider],
  ["NT", ntProvider]
]);

export function getProvider(jurisdiction: Jurisdiction | string): ParcelProvider {
  const valid = ALL_JURISDICTIONS.includes(jurisdiction as Jurisdiction)
    ? (jurisdiction as Jurisdiction)
    : DEFAULT_JURISDICTION;
  const provider = providers.get(valid);
  if (!provider) {
    throw new Error(`No parcel provider registered for jurisdiction: ${valid}`);
  }
  return provider;
}

export function getDefaultProvider(): ParcelProvider {
  return getProvider(DEFAULT_JURISDICTION);
}

export function getDefaultJurisdiction(): Jurisdiction {
  return DEFAULT_JURISDICTION;
}

export function getAllProviders(): ParcelProvider[] {
  return [...providers.values()];
}

export async function getAllProviderStatuses(): Promise<ProviderStatus[]> {
  const allProviders = getAllProviders();
  const results = await Promise.allSettled(
    allProviders.map((provider) => provider.getStatus())
  );
  return results.map((result, index) => {
    const provider = allProviders[index];
    if (result.status === "fulfilled") return result.value;
    return {
      id: provider.id,
      label: provider.label,
      capabilities: provider.capabilities,
      configured: false,
      live: false,
      status: "error" as const,
      supportsAddressSearch: provider.capabilities.includes("address-search"),
      supportsSuburbSearch: provider.capabilities.includes("suburb-search"),
      supportsParcelByPoint: provider.capabilities.includes("parcel-by-point"),
      supportsBbox: provider.capabilities.includes("parcel-by-bbox"),
      sourceUrl: "",
      notes: "Provider getStatus() failed"
    };
  });
}
