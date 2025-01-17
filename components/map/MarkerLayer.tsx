"use client";

import React, { useRef, useEffect } from "react";
import L from "leaflet";
import { useMap } from "react-leaflet";
import { cn } from "@/lib/utils";

// Types and interfaces
interface Event {
  type: "BIRT" | "DEAT" | "RESI";
  date: {
    from?: string;
    to?: string;
    year: number | null;
  };
  place: string;
  coordinates: [number, number];
}

interface Person {
  id: string;
  name: string;
  sex: "M" | "F" | null;
  events: Event[];
  parents: string[];
  children: string[];
  spouses: string[];
  relationship?: string;
}

interface RelationshipInfo {
  relationship: string;
  type: "ancestor" | "descendant" | "root" | "none";
}

interface AncestorFilter {
  showAncestorNumbers: boolean;
  selectedAncestors: Set<number>;
}

// Helper function
function getRelationshipType(
  personId: string,
  rootPerson: string | null,
  relationships: Map<string, RelationshipInfo>,
  temporaryHighlight: {
    personId: string;
    type: "ancestors" | "descendants" | "both" | null;
  } | null
): "ancestor" | "descendant" | "none" | null {
  if (!rootPerson) return null;

  if (temporaryHighlight && temporaryHighlight.personId) {
    const relationship = relationships.get(personId);
    if (!relationship) return "none";

    if (temporaryHighlight.type === "both") {
      if (
        relationship.type === "ancestor" ||
        relationship.type === "descendant"
      )
        return relationship.type;
    } else if (temporaryHighlight.type === "ancestors") {
      return relationship.type === "ancestor" ? "ancestor" : "none";
    } else if (temporaryHighlight.type === "descendants") {
      return relationship.type === "descendant" ? "descendant" : "none";
    }
  }

  return null;
}

interface MarkerLayerProps {
  events: { person: Person; event: Event }[];
  onSelectAction: (person: Person, event: Event) => void;
  activeCoordinates: [number, number] | null;
  rootPerson: string | null;
  relationships: Map<string, RelationshipInfo>;
  temporaryHighlight: {
    personId: string;
    type: "ancestors" | "descendants" | "both" | null;
  } | null;
  setTemporaryHighlightAction: (
    value: {
      personId: string;
      type: "ancestors" | "descendants" | "both" | null;
    } | null
  ) => void;
  ahnentafelNumbers: Map<string, number[]>;
  ancestorFilter: AncestorFilter;
}

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
  const markersRef = useRef<Map<string, L.CircleMarker | L.Marker>>(new Map());
  const numberMarkersRef = useRef<Map<string, L.Marker>>(new Map());

  const getAllGGNumbers = React.useCallback((n: number): number[] => {
    const result = new Set<number>();

    let current = n;
    while (current > 0) {
      if (current >= 16 && current <= 31) {
        result.add(current - 15);
      }
      current = Math.floor(current / 2);
    }

    if (n > 0 && n < 16) {
      const child1 = n * 2;
      const child2 = n * 2 + 1;

      if (child1 >= 16 && child1 <= 31) result.add(child1 - 15);
      if (child2 >= 16 && child2 <= 31) result.add(child2 - 15);

      if (child1 < 16) {
        const stack = [child1];
        while (stack.length > 0) {
          const next = stack.pop()!;
          const nextChild1 = next * 2;
          const nextChild2 = next * 2 + 1;

          if (nextChild1 >= 16 && nextChild1 <= 31) result.add(nextChild1 - 15);
          if (nextChild2 >= 16 && nextChild2 <= 31) result.add(nextChild2 - 15);

          if (nextChild1 < 16) stack.push(nextChild1);
          if (nextChild2 < 16) stack.push(nextChild2);
        }
      }
      if (child2 < 16) {
        const stack = [child2];
        while (stack.length > 0) {
          const next = stack.pop()!;
          const nextChild1 = next * 2;
          const nextChild2 = next * 2 + 1;

          if (nextChild1 >= 16 && nextChild1 <= 31) result.add(nextChild1 - 15);
          if (nextChild2 >= 16 && nextChild2 <= 31) result.add(nextChild2 - 15);

          if (nextChild1 < 16) stack.push(nextChild1);
          if (nextChild2 < 16) stack.push(nextChild2);
        }
      }
    }

    return Array.from(result).sort((a, b) => a - b);
  }, []);

  useEffect(() => {
    const getMarkerOptions = (
      event: Event,
      person: Person,
      isActive: boolean | null,
      relationshipType: "ancestor" | "descendant" | "none" | null,
      numbers: number[]
    ) => {
      const active = isActive ?? false;

      let baseColor =
        event.type === "BIRT"
          ? "#38a169"
          : event.type === "DEAT"
          ? "#e53e3e"
          : "#3182ce";

      if (ancestorFilter.showAncestorNumbers && numbers.length > 0) {
        const colorMap: Record<number, string> = {
          2: "#f59e0b",
          3: "#10b981",
          4: "#3b82f6",
          5: "#8b5cf6",
          6: "#ec4899",
          7: "#f43f5e",
          8: "#06b6d4",
          9: "#14b8a6",
        };

        const lowestNumber = Math.min(...numbers);
        const groupNumber = Math.floor(lowestNumber / 2) * 2;
        if (colorMap[groupNumber]) {
          baseColor = colorMap[groupNumber];
        }
      }

      const opacity =
        relationshipType === null
          ? 0.9
          : relationshipType === "none"
          ? 0.15
          : 0.9;

      const borderColor =
        relationshipType === "ancestor"
          ? "#eab308"
          : relationshipType === "descendant"
          ? "#8b5cf6"
          : "#ffffff";

      return {
        radius: active ? 10 : 8,
        fillColor: baseColor,
        color: borderColor,
        weight: relationshipType === "none" ? 1 : 3,
        opacity: relationshipType === "none" ? 0.15 : 1,
        fillOpacity: opacity,
        className: cn(
          "hover:cursor-pointer",
          relationshipType === "ancestor" && "marker-ancestor",
          relationshipType === "descendant" && "marker-descendant",
          ancestorFilter.showAncestorNumbers &&
            numbers.length > 0 &&
            "has-ancestor-number"
        ),
        html:
          ancestorFilter.showAncestorNumbers && numbers.length > 0
            ? `<div class="marker-number">${Math.min(...numbers)}</div>`
            : "",
        pane: "markerPane",
      };
    };

    const markers = new L.MarkerClusterGroup({
      spiderfyOnMaxZoom: true,
      zoomToBoundsOnClick: true,
      disableClusteringAtZoom: 10,
      maxClusterRadius: 40,
      iconCreateFunction: function (cluster: L.MarkerCluster) {
        const markers = cluster.getAllChildMarkers();
        const visibleMarkers = markers.filter((marker) => {
          return (
            marker.options &&
            "fillOpacity" in marker.options &&
            typeof marker.options.fillOpacity === "number" &&
            marker.options.fillOpacity > 0.2
          );
        });

        const uniqueLocations = new Set(
          visibleMarkers.map((marker) => {
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
    const currentNumberMarkersRef = numberMarkersRef.current;

    currentMarkersRef.clear();
    currentNumberMarkersRef.forEach((marker) => map.removeLayer(marker));
    currentNumberMarkersRef.clear();

    const locationNumbers = new Map<string, Set<number>>();

    events.forEach(({ person, event }) => {
      const coordKey = `${event.coordinates[0]},${event.coordinates[1]}`;
      if (ancestorFilter.showAncestorNumbers) {
        const numbers = ahnentafelNumbers.get(person.id) || [];
        const ggGroups = numbers.flatMap(getAllGGNumbers);

        if (ggGroups.length > 0) {
          const existing = locationNumbers.get(coordKey) || new Set<number>();
          ggGroups.forEach((n) => existing.add(n));
          locationNumbers.set(coordKey, existing);
        }
      }
    });

    events.forEach(({ person, event }) => {
      const isActive =
        activeCoordinates &&
        activeCoordinates[0] === event.coordinates[0] &&
        activeCoordinates[1] === event.coordinates[1];

      const relationshipType = getRelationshipType(
        person.id,
        rootPerson,
        relationships,
        temporaryHighlight
      );

      const marker = L.circleMarker(
        [event.coordinates[0], event.coordinates[1]],
        getMarkerOptions(
          event,
          person,
          isActive,
          relationshipType,
          ahnentafelNumbers.get(person.id) || []
        )
      )
        .bindTooltip(event.place, {
          permanent: false,
          direction: "top",
          className: "marker-tooltip",
          opacity: 0.9,
        })
        .on("click", (e) => {
          L.DomEvent.stopPropagation(e);
          onSelectAction(person, event);
        });

      const coordKey = `${event.coordinates[0]},${event.coordinates[1]}`;
      markersRef.current.set(coordKey, marker);
      markers.addLayer(marker);

      if (ancestorFilter.showAncestorNumbers) {
        const coordKey = `${event.coordinates[0]},${event.coordinates[1]}`;
        const numbers = locationNumbers.get(coordKey);

        if (numbers && !numberMarkersRef.current.has(coordKey)) {
          const sortedNumbers = [...numbers].sort((a, b) => a - b);

          const ranges: string[] = [];
          let rangeStart = sortedNumbers[0];
          let prev = rangeStart;

          for (let i = 1; i <= sortedNumbers.length; i++) {
            const current = sortedNumbers[i];
            const isLastNumber = i === sortedNumbers.length;

            if (isLastNumber || current !== prev + 1) {
              ranges.push(
                prev === rangeStart
                  ? rangeStart.toString().padStart(2, "0")
                  : `${rangeStart.toString().padStart(2, "0")}-${prev
                      .toString()
                      .padStart(2, "0")}`
              );
              if (!isLastNumber) {
                rangeStart = current;
                prev = current;
              }
            } else {
              prev = current;
            }
          }

          const numberDiv = L.divIcon({
            html: `<div class="marker-number">${ranges.join(", ")}</div>`,
            className: "marker-number-container",
            iconSize: [120, 20],
            iconAnchor: [-10, 15],
          });

          const numberMarker = L.marker(
            [event.coordinates[0], event.coordinates[1]],
            {
              icon: numberDiv,
              zIndexOffset: 1000,
              interactive: false,
            }
          );

          numberMarkersRef.current.set(coordKey, numberMarker);
          if (ancestorFilter.showAncestorNumbers) {
            numberMarker.addTo(map);
          }
        }
      }
    });

    map.addLayer(markers);

    if (activeCoordinates) {
      const coordKey = `${activeCoordinates[0]},${activeCoordinates[1]}`;
      const marker = markersRef.current.get(coordKey);
      if (marker && marker instanceof L.CircleMarker) {
        marker.setStyle({
          pane: "markerPane",
          radius: 10,
          fillOpacity: 1,
        });
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
      currentNumberMarkersRef.forEach((marker) => map.removeLayer(marker));
      currentNumberMarkersRef.clear();
    };
  }, [
    map,
    events,
    onSelectAction,
    activeCoordinates,
    rootPerson,
    relationships,
    temporaryHighlight,
    setTemporaryHighlightAction,
    ahnentafelNumbers,
    ancestorFilter,
    getAllGGNumbers,
  ]);

  return null;
}
