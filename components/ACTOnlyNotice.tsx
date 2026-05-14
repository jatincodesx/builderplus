import { MapPinned } from "lucide-react";

export function ACTOnlyNotice({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-sky-300/20 bg-sky-400/10 p-4 text-sm text-sky-50">
      <MapPinned className="mt-0.5 h-4 w-4 shrink-0 text-sky-300" />
      <p className={compact ? "text-xs leading-relaxed" : "leading-relaxed"}>
        Currently available for ACT blocks only.
      </p>
    </div>
  );
}
