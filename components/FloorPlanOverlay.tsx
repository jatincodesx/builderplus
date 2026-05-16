"use client";

import { useEffect, useRef, useState } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import { computePxPerMetre } from "@/lib/plot/plotAnalysis";
import type { FloorPlanOverlayState } from "@/types/floorPlan";

const UPLOADED_IMAGE_SIZE = 280;

export function FloorPlanOverlay({
  overlay,
  onChange
}: {
  overlay: FloorPlanOverlayState;
  onChange: (overlay: FloorPlanOverlayState) => void;
}) {
  const map = useMap();
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    offsetX: number;
    offsetY: number;
  } | null>(null);
  const [anchorPoint, setAnchorPoint] = useState<L.Point | null>(null);
  const [pxPerM, setPxPerM] = useState<number>(1);

  useEffect(() => {
    const anchor = overlay.anchorLatLng;
    const updateView = () => {
      setAnchorPoint(
        map.latLngToContainerPoint([
          anchor.lat,
          anchor.lng
        ])
      );
      if (overlay.placementMode === "real_size_design") {
        setPxPerM(computePxPerMetre(map, anchor));
      }
    };

    updateView();
    map.on("move zoom resize", updateView);
    return () => {
      map.off("move zoom resize", updateView);
    };
  }, [map, overlay.anchorLatLng, overlay.placementMode]);

  if (!anchorPoint) return null;

  const isRealSize = overlay.placementMode === "real_size_design";
  const scaleAdjustment = overlay.scaleAdjustment ?? 1;

  let imageWidth: number;
  let imageHeight: number;
  let transformScale: number;

  if (isRealSize && overlay.widthM && overlay.depthM) {
    imageWidth = Math.round(overlay.widthM * pxPerM * scaleAdjustment);
    imageHeight = Math.round(overlay.depthM * pxPerM * scaleAdjustment);
    transformScale = overlay.scale;
  } else {
    imageWidth = UPLOADED_IMAGE_SIZE;
    imageHeight = 0;
    transformScale = overlay.scale;
  }

  const effectiveRotation = overlay.rotation ?? 0;

  return (
    <div
      className="absolute z-[650]"
      style={{
        left: anchorPoint.x,
        top: anchorPoint.y,
        transform: `translate(-50%, -50%) translate(${overlay.offsetX}px, ${overlay.offsetY}px) rotate(${effectiveRotation}deg) scale(${transformScale})`,
        transformOrigin: "center"
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={overlay.imageUrl}
        alt=""
        draggable={false}
        onPointerDown={(event) => {
          if (overlay.locked) return;
          event.preventDefault();
          event.stopPropagation();
          dragRef.current = {
            pointerId: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            offsetX: overlay.offsetX,
            offsetY: overlay.offsetY
          };
          event.currentTarget.setPointerCapture(event.pointerId);
          map.dragging.disable();
        }}
        onPointerMove={(event) => {
          const drag = dragRef.current;
          if (!drag || drag.pointerId !== event.pointerId) return;
          event.preventDefault();
          event.stopPropagation();
          onChange({
            ...overlay,
            offsetX: drag.offsetX + event.clientX - drag.startX,
            offsetY: drag.offsetY + event.clientY - drag.startY
          });
        }}
        onPointerUp={(event) => {
          const drag = dragRef.current;
          if (drag?.pointerId === event.pointerId) {
            dragRef.current = null;
            event.currentTarget.releasePointerCapture(event.pointerId);
            map.dragging.enable();
          }
        }}
        onPointerCancel={() => {
          dragRef.current = null;
          map.dragging.enable();
        }}
        className="max-w-none select-none rounded-md border border-sky-200/35 bg-white shadow-[0_20px_55px_rgba(0,0,0,0.45)]"
        style={{
          width: isRealSize && imageWidth > 0 ? imageWidth : UPLOADED_IMAGE_SIZE,
          ...(isRealSize && imageHeight > 0 ? { height: imageHeight } : {}),
          opacity: overlay.opacity,
          cursor: overlay.locked ? "default" : "grab",
          pointerEvents: overlay.locked ? "none" : "auto"
        }}
      />
    </div>
  );
}
