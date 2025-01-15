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
    const getMarkerIcon = (event: Event, isActive: boolean | null) => {
      const active = isActive ?? false;
      const color =
        event.type === "BIRT"
          ? "#4ade80" // green-400
          : event.type === "DEAT"
          ? "#f87171" // red-400
          : "#60a5fa"; // blue-400

      return L.divIcon({
        className: "custom-div-icon",
        html: `
          <div class="marker-pin ${
            active ? "active" : ""
          }" style="background-color: ${color}">
            ${active ? '<div class="marker-pulse"></div>' : ""}
          </div>
        `,
        iconSize: active ? [24, 24] : [16, 16],
        iconAnchor: active ? [12, 12] : [8, 8],
      });
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

      const marker = L.marker([event.coordinates[0], event.coordinates[1]], {
        icon: getMarkerIcon(event, isActive),
        zIndexOffset: isActive ? 1000 : 0,
      }).on("click", (e) => {
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
