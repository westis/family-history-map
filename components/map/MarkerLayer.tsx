"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import { useMap } from "react-leaflet";
import {
  FilteredEvent,
  AncestorFilter,
  RelationshipInfo,
} from "@/app/utils/types";
import { useTrees } from "@/contexts/TreeContext";

// Add interface for extended marker options
interface ExtendedMarkerOptions extends L.MarkerOptions {
  treeColor?: string;
}

interface MarkerLayerProps {
  events: FilteredEvent[];
  onSelectAction: (
    person: FilteredEvent["person"],
    event: FilteredEvent["event"]
  ) => void;
  activeCoordinates: [number, number] | null;
  rootPerson: string | null;
  relationships: Map<string, RelationshipInfo>;
  temporaryHighlight: {
    personId: string;
    type: "ancestors" | "descendants" | "both" | null;
  } | null;
  setTemporaryHighlightAction: (
    highlight: {
      personId: string;
      type: "ancestors" | "descendants" | "both" | null;
    } | null
  ) => void;
  ahnentafelNumbers: Map<string, number[]>;
  ancestorFilter: AncestorFilter;
}

// Add these constants at the top
const EVENT_COLORS = {
  BIRT: "#16a34a", // green
  DEAT: "#dc2626", // red
  RESI: "#2563eb", // blue
};

export function MarkerLayer({
  events,
  onSelectAction,
  activeCoordinates,
  rootPerson,
  relationships,
  temporaryHighlight,
  setTemporaryHighlightAction,
  ahnentafelNumbers,
  ancestorFilter,
}: MarkerLayerProps) {
  const map = useMap();
  const markersRef = useRef<L.MarkerClusterGroup | null>(null);
  const { trees } = useTrees();

  // Add console logs to track events changes
  useEffect(() => {
    console.log("MarkerLayer: events changed", events.length);

    if (!map) return;

    // Remove existing markers
    if (markersRef.current) {
      console.log("Removing existing markers");
      map.removeLayer(markersRef.current);
      markersRef.current = null;
    }

    // Create marker cluster group
    const markers = new L.MarkerClusterGroup({
      maxClusterRadius: 30,
      spiderfyOnMaxZoom: true,
      disableClusteringAtZoom: 10,
      iconCreateFunction: (cluster: L.MarkerCluster) => {
        const markers = cluster.getAllChildMarkers();

        // Create a Set of unique location strings to count unique places
        const uniqueLocations = new Set(
          markers.map((m: L.Marker) => {
            const latlng = m.getLatLng();
            return `${latlng.lat},${latlng.lng}`;
          })
        );

        // Get tree colors for styling
        const treeColors = new Set(
          markers.map(
            (m: L.Marker) => (m.options as ExtendedMarkerOptions).treeColor
          )
        );

        let backgroundColor;
        if (treeColors.size === 1) {
          backgroundColor = Array.from(treeColors)[0];
        } else {
          backgroundColor = "#666"; // Mixed trees
        }

        return L.divIcon({
          html: `<div class="cluster-marker" style="background-color: ${backgroundColor}">${uniqueLocations.size}</div>`,
          className: "custom-cluster-icon",
          iconSize: L.point(40, 40),
        });
      },
    });

    console.log("Creating new markers:", events.length);

    // Add markers for each event
    events.forEach(({ person, event }) => {
      const relationshipInfo = relationships.get(person.id);

      // Just keep the marker color logic
      const markerColor =
        trees.length > 1
          ? event.treeColor // Use tree color when we have multiple trees
          : EVENT_COLORS[event.type as keyof typeof EVENT_COLORS] || "#666"; // Use event type color for single tree

      const markerOptions: ExtendedMarkerOptions = {
        icon: L.divIcon({
          html: `
            <svg width="24" height="24" viewBox="0 0 24 24">
              <circle 
                cx="12" 
                cy="12" 
                r="8" 
                fill="${markerColor}"
                stroke-width="2"
                stroke="white"
              />
            </svg>
          `,
          className: "marker-icon",
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        }),
        treeColor: event.treeColor,
      };

      const marker = L.marker(
        event.coordinates as [number, number],
        markerOptions
      ).bindTooltip(event.place, {
        direction: "top",
        offset: L.point(0, -8),
        opacity: 0.9,
      });

      marker.on("click", () => {
        onSelectAction(person, event);
      });

      markers.addLayer(marker);

      // Add ancestor number if enabled
      if (
        ancestorFilter.showAncestorNumbers &&
        relationshipInfo?.type === "ancestor"
      ) {
        const numbers = ahnentafelNumbers.get(person.id);
        if (numbers && numbers.length > 0) {
          const numberMarker = L.marker(event.coordinates as [number, number], {
            icon: L.divIcon({
              html: `<div class="ancestor-number">${numbers[0]}</div>`,
              className: "ancestor-number-icon",
              iconSize: [20, 20],
              iconAnchor: [-10, 0],
            }),
          });
          if (ancestorFilter.showAncestorNumbers) {
            numberMarker.addTo(map);
          }
        }
      }
    });

    markersRef.current = markers;
    map.addLayer(markers);

    // Highlight active coordinates if any
    if (activeCoordinates) {
      const bounds = markers.getBounds();
      if (bounds.isValid()) {
        map.setView(activeCoordinates, map.getZoom());
      }
    }
  }, [
    events,
    relationships,
    onSelectAction,
    map,
    rootPerson,
    ahnentafelNumbers,
    ancestorFilter,
    activeCoordinates,
    temporaryHighlight,
    setTemporaryHighlightAction,
    trees,
  ]);

  return null;
}
