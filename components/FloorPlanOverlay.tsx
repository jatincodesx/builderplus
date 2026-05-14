"use client";

import { useEffect, useRef, useState } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import type { FloorPlanOverlayState } from "@/types/floorPlan";

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

  useEffect(() => {
    const updateAnchorPoint = () => {
      setAnchorPoint(
        map.latLngToContainerPoint([
          overlay.anchorLatLng.lat,
          overlay.anchorLatLng.lng
        ])
      );
    };

    updateAnchorPoint();
    map.on("move zoom resize", updateAnchorPoint);
    return () => {
      map.off("move zoom resize", updateAnchorPoint);
    };
  }, [map, overlay.anchorLatLng.lat, overlay.anchorLatLng.lng]);

  if (!anchorPoint) return null;

  return (
    <div
      className="absolute z-[650]"
      style={{
        left: anchorPoint.x,
        top: anchorPoint.y,
        transform: `translate(-50%, -50%) translate(${overlay.offsetX}px, ${overlay.offsetY}px) rotate(${overlay.rotation}deg) scale(${overlay.scale})`,
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
          width: 280,
          opacity: overlay.opacity,
          cursor: overlay.locked ? "default" : "grab",
          pointerEvents: overlay.locked ? "none" : "auto"
        }}
      />
    </div>
  );
}
