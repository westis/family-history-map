import { useMap } from "react-leaflet";
import { useEffect } from "react";

interface MapControllerProps {
  coordinates: [number, number] | null;
  zoom?: number;
}

export function MapController({ coordinates, zoom }: MapControllerProps) {
  const map = useMap();

  useEffect(() => {
    if (coordinates) {
      map.setView(coordinates, zoom || map.getZoom());
    }
  }, [coordinates, zoom, map]);

  return null;
}
