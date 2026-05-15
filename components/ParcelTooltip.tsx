import type { ParcelFeature } from "@/types/parcel";

export function ParcelTooltip({
  parcel,
  x,
  y
}: {
  parcel: ParcelFeature;
  x: number;
  y: number;
}) {
  const viewportWidth = typeof window === "undefined" ? 1200 : window.innerWidth;
  const address =
    parcel.properties.address ||
    (typeof parcel.properties.rawProperties?.ADDRESSES === "string"
      ? parcel.properties.rawProperties.ADDRESSES
      : "");
  const block = formatBlock(parcel.properties.block);

  return (
    <div
      className="pointer-events-none absolute z-30 w-56 rounded-xl border border-gray-200 bg-white/95 p-3 text-xs text-gray-900 shadow-card backdrop-blur-sm"
      style={{
        left: Math.min(x + 16, viewportWidth - 250),
        top: Math.max(y - 20, 12)
      }}
    >
      {address && <div className="font-semibold">{address}</div>}
      <div className="font-semibold">
        {block}
        {parcel.properties.section ? ` / Section ${parcel.properties.section}` : ""}
      </div>
      <div className="mt-1 text-gray-500">
        {parcel.properties.division}
        {parcel.properties.areaSqm
          ? ` \u00b7 ${parcel.properties.areaSqm.toLocaleString()} m\u00b2`
          : ""}
      </div>
      {parcel.properties.zone && (
        <div className="mt-1 text-gray-400">{parcel.properties.zone}</div>
      )}
      <div className="mt-2 text-blue-600">Click to select</div>
    </div>
  );
}

function formatBlock(value: string) {
  if (!value || value === "Block") return "Block";
  return value.toUpperCase().startsWith("BLOCK ") ? value : `Block ${value}`;
}
