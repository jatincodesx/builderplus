import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-xl bg-gray-100 ring-1 ring-gray-200/60",
        className
      )}
    />
  );
}
