import { MapPinned } from "lucide-react";

export function ACTOnlyNotice({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
      <MapPinned className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
      <p className={compact ? "text-xs leading-relaxed" : "leading-relaxed"}>
        Parcel data available for ACT, NSW &amp; TAS. Other states: use manual draw.
      </p>
    </div>
  );
}
