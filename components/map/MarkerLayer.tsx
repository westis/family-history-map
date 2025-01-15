import { useMap } from "react-leaflet";
import { Person, Event } from "@/types/family-map";
import L from "leaflet";
import { useRef, useEffect } from "react";
import "leaflet.markercluster";
import "../types/leaflet-extensions";

interface MarkerLayerProps {
  events: { person: Person; event: Event }[];
  onSelect: (person: Person, event: Event) => void;
  activeCoordinates: [number, number] | null;
}

export function MarkerLayer({
  events,
  onSelect,
  activeCoordinates,
}: MarkerLayerProps) {
  const map = useMap();
  const markersRef = useRef<Map<string, L.Marker>>(new Map());

  useEffect(() => {
    const getMarkerOptions = (event: Event, isActive: boolean | null) => {
      const active = isActive ?? false;
      const color =
        event.type === "BIRT"
          ? "#22c55e" // green-500
          : event.type === "DEAT"
          ? "#ef4444" // red-500
          : "#3b82f6"; // blue-500

      return {
        radius: active ? 5 : 3,
        fillColor: color,
        color: "white",
        weight: 1,
        opacity: 1,
        fillOpacity: 1,
      };
    };

    const markers = new L.MarkerClusterGroup({
      spiderfyOnMaxZoom: true,
      zoomToBoundsOnClick: true,
      disableClusteringAtZoom: 10,
      maxClusterRadius: 30,
      iconCreateFunction: function (cluster: L.MarkerCluster) {
        const markers = cluster.getAllChildMarkers();
        const uniqueLocations = new Set(
          markers.map((marker: L.Marker) => {
            const coords = marker.getLatLng();
            return `${coords.lat},${coords.lng}`;
          })
        );

        const count = uniqueLocations.size;
        let size = "small";
        if (count > 100) size = "large";
        else if (count > 10) size = "medium";

        return L.divIcon({
          html: `<div><span>${count}</span></div>`,
          className: `marker-cluster marker-cluster-${size}`,
          iconSize: L.point(40, 40),
        });
      },
    });

    const currentMarkersRef = markersRef.current;

    events.forEach(({ person, event }) => {
      const isActive =
        activeCoordinates &&
        activeCoordinates[0] === event.coordinates[0] &&
        activeCoordinates[1] === event.coordinates[1];

      const marker = L.circleMarker(
        [event.coordinates[0], event.coordinates[1]],
        getMarkerOptions(event, isActive)
      ).on("click", (e) => {
        L.DomEvent.stopPropagation(e);
        onSelect(person, event);
      });

      const coordKey = `${event.coordinates[0]},${event.coordinates[1]}`;
      markersRef.current.set(coordKey, marker);
      markers.addLayer(marker);
    });

    map.addLayer(markers);

    if (activeCoordinates) {
      const coordKey = `${activeCoordinates[0]},${activeCoordinates[1]}`;
      const marker = markersRef.current.get(coordKey);
      if (marker) {
        marker.setZIndexOffset(1000);
        map.setView(activeCoordinates, 14);

        const icon = marker.getElement();
        if (icon) {
          icon.classList.add("marker-bounce");
          setTimeout(() => {
            icon.classList.remove("marker-bounce");
          }, 2000);
        }
      }
    }

    return () => {
      map.removeLayer(markers);
      currentMarkersRef.clear();
    };
  }, [map, events, onSelect, activeCoordinates]);

  return null;
}
