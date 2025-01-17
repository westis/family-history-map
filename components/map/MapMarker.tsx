import { useState, useEffect } from "react";
import { Marker } from "react-leaflet";
import L from "leaflet";

interface MapMarkerProps {
  position: [number, number];
  isSelected?: boolean;
  onClick?: () => void;
}

export function MapMarker({ position, isSelected, onClick }: MapMarkerProps) {
  const [marker, setMarker] = useState<L.Marker | null>(null);

  useEffect(() => {
    if (marker) {
      const element = marker.getElement();
      if (isSelected) {
        element?.classList.add("marker-selected");
      } else {
        element?.classList.remove("marker-selected");
      }
    }
  }, [isSelected, marker]);

  const icon = L.divIcon({
    className: `custom-marker`,
    html: `<div class="marker-inner ${isSelected ? "selected" : ""}"></div>`,
    iconSize: [30, 30],
  });

  return (
    <Marker
      position={position}
      icon={icon}
      ref={setMarker}
      eventHandlers={{
        click: onClick,
      }}
    />
  );
}
