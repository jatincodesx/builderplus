import { MapPinned } from "lucide-react";

export function ACTOnlyNotice({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
      <MapPinned className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
      <p className={compact ? "text-xs leading-relaxed" : "leading-relaxed"}>
        Live parcel data: ACT, NSW &amp; TAS. VIC/QLD/SA/WA/NT: set endpoint or use manual draw.
      </p>
    </div>
  );
}
