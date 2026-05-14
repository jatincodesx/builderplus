"use client";

import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { FloorPlanUploadPayload } from "@/types/floorPlan";
import type { LngLat } from "@/types/geo";

const acceptedMimeTypes = new Set(["image/jpeg", "image/png"]);

export function FloorPlanUploadButton({
  anchorLatLng,
  disabled = false,
  onUpload
}: {
  anchorLatLng: LngLat | null;
  disabled?: boolean;
  onUpload: (payload: FloorPlanUploadPayload) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState("");

  function handleFile(file: File | undefined) {
    setError("");
    if (!file || !anchorLatLng) return;

    const extensionOk = /\.(jpe?g|png)$/i.test(file.name);
    if (!acceptedMimeTypes.has(file.type) && !extensionOk) {
      setError("Use a JPG or PNG floor plan.");
      return;
    }

    onUpload({
      imageUrl: URL.createObjectURL(file),
      fileName: file.name,
      anchorLatLng
    });
  }

  return (
    <div className="grid gap-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,.jpg,.jpeg,.png"
        className="hidden"
        disabled={disabled}
        onChange={(event) => {
          handleFile(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
      <Button
        type="button"
        variant="secondary"
        disabled={disabled || !anchorLatLng}
        onClick={() => inputRef.current?.click()}
      >
        <Upload className="h-4 w-4" />
        Upload floor plan
      </Button>
      {disabled || !anchorLatLng ? (
        <p className="text-xs text-slate-400">Select a block first.</p>
      ) : error ? (
        <p className="text-xs text-red-100">{error}</p>
      ) : null}
    </div>
  );
}
