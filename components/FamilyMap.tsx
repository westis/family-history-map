"use client";

import React, { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  FileUp,
  Check,
  ChevronsUpDown,
  Loader2,
  X,
  ChevronLeft,
  ChevronRight,
  Plus,
  Minus,
} from "lucide-react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import L from "leaflet";
import { RangeSlider } from "@/components/ui/range-slider";
import "leaflet.markercluster";
import {
  Command,
  CommandInput,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";

const tileLayerUrl = `https://api.maptiler.com/maps/topo/256/{z}/{x}/{y}.png?key=PWo9ydkPHrwquRTjQYKg`;

interface Event {
  type: "BIRT" | "DEAT" | "RESI";
  date: {
    from?: string; // Full date string
    to?: string; // For date ranges
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
  parents: string[]; // Array of parent IDs
  children: string[]; // Array of children IDs
  spouses: string[]; // Array of spouse IDs
  relationship?: string; // Relationship to root person
}

interface AncestorInfo {
  numbers: number[]; // Ahnentafel numbers this person represents
  name: string;
  birthYear?: number;
  deathYear?: number;
  selected?: boolean;
}

interface AncestorFilter {
  showAncestorNumbers: boolean;
  selectedAncestors: Set<number>;
}

function calculateRelationships(people: Person[], rootId: string) {
  const peopleMap = new Map(people.map((p) => [p.id, p]));
  const relationships = new Map<string, string>();

  function findPath(
    fromId: string,
    toId: string,
    visited = new Set<string>(),
    direction: "up" | "down" | null = null
  ): string[] | null {
    if (fromId === toId) return [fromId];
    if (visited.has(fromId)) return null;

    visited.add(fromId);
    const person = peopleMap.get(fromId);
    if (!person) return null;

    // Try going up to parents (ancestors)
    if (direction === null || direction === "up") {
      for (const parentId of person.parents) {
        const path = findPath(parentId, toId, new Set(visited), "up");
        if (path) return [fromId, ...path];
      }
    }

    // Try going down to children (descendants)
    if (direction === null || direction === "down") {
      for (const childId of person.children) {
        const path = findPath(childId, toId, new Set(visited), "down");
        if (path) return [fromId, ...path];
      }
    }

    return null;
  }

  function formatPath(path: string[]): string {
    const relationshipParts: string[] = [];
    let currentId = path[0];

    // Build the relationship path
    for (let i = 1; i < path.length; i++) {
      const currentPerson = peopleMap.get(currentId);
      const nextPerson = peopleMap.get(path[i]);
      if (!currentPerson || !nextPerson) continue;

      // Handle spouse relationship
      if (nextPerson.spouses.includes(currentId)) {
        return nextPerson.sex === "F" ? "Wife" : "Husband";
      }

      if (nextPerson.children.includes(currentId)) {
        // Going up to parent
        relationshipParts.push(nextPerson.sex === "F" ? "m" : "f");
      } else if (currentPerson.children.includes(path[i])) {
        // Going down to child
        relationshipParts.push(nextPerson.sex === "F" ? "d" : "s");
      }
      currentId = path[i];
    }

    // Add spaces between every two characters for readability
    const rel = relationshipParts
      .join("")
      .replace(/(.{2})/g, "$1 ")
      .trim();

    // Handle common relationships
    const relationshipMap: Record<string, string> = {
      f: "Far",
      m: "Mor",
      s: "Son",
      d: "Dotter",
      "f f": "Farfar",
      "f m": "Farmor",
      "m f": "Morfar",
      "m m": "Mormor",
      "s s": "Sonson",
      "s d": "Sondotter",
      "d s": "Dotterson",
      "d d": "Dotterdotter",
      "f f f": "Farfarsfar",
      "f f m": "Farfarsmor",
      "f m f": "Farmorsfar",
      "f m m": "Farmorsmor",
      "m f f": "Morfarsfar",
      "m f m": "Morfarsmor",
      "m m f": "Mormorsfar",
      "m m m": "Mormorsmor",
    };

    return relationshipMap[rel] || rel;
  }

  people.forEach((person) => {
    if (person.id === rootId) {
      relationships.set(person.id, "Root Person");
      return;
    }

    // Start from the person and find path to root (instead of from root to person)
    const path = findPath(person.id, rootId);
    if (!path) {
      relationships.set(person.id, "Not Related");
      return;
    }

    relationships.set(person.id, formatPath(path.reverse())); // Note the reverse() here
  });

  return relationships;
}

function calculateAhnentafelNumbers(
  people: Person[],
  rootId: string
): Map<string, number[]> {
  const peopleMap = new Map(people.map((p) => [p.id, p]));
  const numbers = new Map<string, number[]>();

  function processAncestor(personId: string, ahnNumber: number) {
    if (!personId) return;

    const person = peopleMap.get(personId);
    if (!person) return;

    // Add this number to person's numbers
    const currentNumbers = numbers.get(personId) || [];
    if (!currentNumbers.includes(ahnNumber)) {
      numbers.set(personId, [...currentNumbers, ahnNumber]);
    }

    // Process parents (if any)
    person.parents.forEach((parentId, index) => {
      processAncestor(parentId, ahnNumber * 2 + index);
    });
  }

  // Start with the root person as 1
  processAncestor(rootId, 1);
  return numbers;
}

function get16Ancestors(
  people: Person[],
  rootId: string,
  ahnentafelNumbers: Map<string, number[]>
): AncestorInfo[] {
  const ancestors: AncestorInfo[] = [];
  const seen = new Set<string>();

  // Only look for exact 2x great-grandparents (numbers 16-31)
  people.forEach((person) => {
    const numbers = ahnentafelNumbers.get(person.id) || [];
    // Only include direct 2x great-grandparents
    const ggNumbers = numbers
      .filter((n) => n >= 16 && n <= 31)
      .map((n) => n - 15); // Convert 16-31 to 1-16

    if (ggNumbers.length > 0 && !seen.has(person.id)) {
      seen.add(person.id);

      // Get birth and death years from events
      const birthEvent = person.events.find((e) => e.type === "BIRT");
      const deathEvent = person.events.find((e) => e.type === "DEAT");

      ancestors.push({
        numbers: ggNumbers,
        name: person.name,
        birthYear: birthEvent?.date.year || undefined,
        deathYear: deathEvent?.date.year || undefined,
        selected: false,
      });
    }
  });

  return ancestors.sort(
    (a, b) => Math.min(...a.numbers) - Math.min(...b.numbers)
  );
}

const parseGEDCOM = (text: string): Person[] => {
  console.log("Starting GEDCOM parsing...");
  const lines = text.split("\n");
  console.log(`Total lines to process: ${lines.length}`);

  const people: Person[] = [];
  const families: {
    id: string;
    spouses: string[];
    children: string[];
  }[] = [];

  let currentPerson: Person | null = null;
  let currentFamily: {
    id: string;
    spouses: string[];
    children: string[];
  } | null = null;
  let currentEvent: Event | null = null;

  lines.forEach((line) => {
    const parts = line.trim().split(/\s+/);
    if (parts.length < 2) return;

    const level = parts[0];
    const tag = parts[1];
    const value = parts.slice(2).join(" ");

    // Handle INDI and FAM records
    if (level === "0") {
      if (parts.length > 2) {
        if (parts[2] === "INDI") {
          if (currentPerson) people.push(currentPerson);
          currentPerson = {
            id: parts[1].replace(/@/g, ""),
            name: "Unknown",
            sex: null,
            events: [],
            parents: [],
            children: [],
            spouses: [],
          };
          currentFamily = null;
        } else if (parts[2] === "FAM") {
          if (currentFamily) families.push(currentFamily);
          currentFamily = {
            id: parts[1].replace(/@/g, ""),
            spouses: [],
            children: [],
          };
          currentPerson = null;
        }
      }
    } else if (currentPerson) {
      if (tag === "NAME") {
        currentPerson.name = value.replace(/\//g, "");
        console.log(`Found name: ${currentPerson.name}`);
      } else if (["BIRT", "DEAT", "RESI"].includes(tag)) {
        currentEvent = {
          type: tag as Event["type"],
          date: {
            year: null,
          },
          place: "Unknown",
          coordinates: [0, 0],
        };
        currentPerson.events.push(currentEvent);
        console.log(`Found event ${tag} for ${currentPerson.name}`);
      } else if (tag === "CHAN") {
        currentEvent = null;
      } else if (tag === "DATE" && currentEvent) {
        if (["BIRT", "DEAT", "RESI"].includes(currentEvent.type)) {
          const fromToMatch = value.match(/FROM (\d{4}) TO (\d{4})/i);
          if (fromToMatch) {
            currentEvent.date = {
              from: fromToMatch[1],
              to: fromToMatch[2],
              year: parseInt(fromToMatch[1]),
            };
          } else {
            const fullDateMatch = value.match(
              /(\d{1,2}\s+[A-Za-z]+\s+)?(\d{4})/
            );
            if (fullDateMatch) {
              const year = parseInt(fullDateMatch[2]);
              currentEvent.date = {
                from: value.trim(),
                year: year,
              };
            }
          }
        }
      } else if (tag === "PLAC" && currentEvent) {
        // Ignore if place is just a number or empty
        if (!value || /^\d+$/.test(value)) {
          currentEvent.place = "Unknown";
          currentEvent.coordinates = [0, 0];
        } else {
          currentEvent.place = value;
          currentEvent.coordinates = [0, 0]; // Will be updated by MAP/LATI/LONG tags
        }
      } else if (tag === "MAP") {
        // Handle MAP tag
        if (currentEvent) {
          currentEvent.coordinates = [0, 0]; // Initialize coordinates
        }
      } else if (tag === "LATI" && currentEvent) {
        const match = value.match(/([NS])(\d+\.\d+)/);
        if (match) {
          const latitude = parseFloat(match[2]) * (match[1] === "S" ? -1 : 1);
          currentEvent.coordinates[0] = latitude;
        }
      } else if (tag === "LONG" && currentEvent) {
        const match = value.match(/([EW])(\d+\.\d+)/);
        if (match) {
          const longitude = parseFloat(match[2]) * (match[1] === "W" ? -1 : 1);
          currentEvent.coordinates[1] = longitude;
        }
      } else if (tag === "SEX") {
        currentPerson.sex = value as "M" | "F";
      }
    } else if (currentFamily) {
      if (["HUSB", "WIFE"].includes(tag)) {
        currentFamily.spouses.push(value.replace(/@/g, ""));
      } else if (tag === "CHIL") {
        currentFamily.children.push(value.replace(/@/g, ""));
      }
    }
  });

  // Add final person or family
  if (currentPerson) people.push(currentPerson);
  if (currentFamily) families.push(currentFamily);

  // Process family relationships
  families.forEach((family) => {
    family.children.forEach((childId) => {
      const child = people.find((p) => p.id === childId);
      if (child) {
        child.parents.push(...family.spouses);
        family.spouses.forEach((spouseId) => {
          const parent = people.find((p) => p.id === spouseId);
          if (parent) {
            parent.children.push(childId);
            parent.spouses.push(
              ...family.spouses.filter((id) => id !== spouseId)
            );
          }
        });
      }
    });
  });

  console.log(`Parsing complete. Found ${people.length} people`);
  console.log("Sample of parsed data:", people.slice(0, 2));

  return people;
};

// Add the getRelationshipType function before MarkerLayer
function getRelationshipType(
  personId: string,
  rootPerson: string | null,
  relationships: Map<string, string>,
  temporaryHighlight: {
    personId: string;
    type: "ancestors" | "descendants" | "both" | null;
  } | null
): "ancestor" | "descendant" | "none" | null {
  // If no root person is selected, return null (no relationship filtering)
  if (!rootPerson) return null;

  // First check temporary highlight
  if (temporaryHighlight && temporaryHighlight.personId) {
    const relationship = relationships.get(personId);
    if (!relationship) return "none";

    // Calculate relationship relative to the temporarily highlighted person
    if (temporaryHighlight.type === "both") {
      if (relationship.includes("far") || relationship.includes("mor"))
        return "ancestor";
      if (relationship.includes("son") || relationship.includes("dotter"))
        return "descendant";
    } else if (temporaryHighlight.type === "ancestors") {
      return relationship.includes("far") || relationship.includes("mor")
        ? "ancestor"
        : "none";
    } else if (temporaryHighlight.type === "descendants") {
      return relationship.includes("son") || relationship.includes("dotter")
        ? "descendant"
        : "none";
    }
  }

  // If no temporary highlight and root person is selected,
  // return null instead of "none" to show markers normally
  return null;
}

// Update MarkerLayer props
function MarkerLayer({
  events,
  onSelect,
  activeCoordinates,
  rootPerson,
  relationships,
  temporaryHighlight,
  ahnentafelNumbers,
  ancestorFilter,
}: {
  events: { person: Person; event: Event }[];
  onSelect: (person: Person, event: Event) => void;
  activeCoordinates: [number, number] | null;
  rootPerson: string | null;
  relationships: Map<string, string>;
  temporaryHighlight: {
    personId: string;
    type: "ancestors" | "descendants" | "both" | null;
  } | null;
  ahnentafelNumbers: Map<string, number[]>;
  ancestorFilter: AncestorFilter;
}) {
  const map = useMap();
  const markersRef = useRef<Map<string, L.CircleMarker | L.Marker>>(new Map());
  const numberMarkersRef = useRef<Map<string, L.Marker>>(new Map());

  // Move getAllGGNumbers outside the effect and memoize it here
  const getAllGGNumbers = React.useCallback((n: number): number[] => {
    const result = new Set<number>();

    // Walk up the tree to find all ancestor groups
    let current = n;
    while (current > 0) {
      if (current >= 16 && current <= 31) {
        result.add(current - 15); // Convert to 1-16
      }
      current = Math.floor(current / 2);
    }

    // If this is an ancestor of a 2x great-grandparent,
    // include all descendant 2x great-grandparent groups
    if (n > 0 && n < 16) {
      // Calculate child numbers
      const child1 = n * 2;
      const child2 = n * 2 + 1;

      // If children are 2x great-grandparents, add them
      if (child1 >= 16 && child1 <= 31) result.add(child1 - 15);
      if (child2 >= 16 && child2 <= 31) result.add(child2 - 15);

      // If children are still ancestors of 2x great-grandparents, process them
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

      // Base colors for event types
      let baseColor =
        event.type === "BIRT"
          ? "#38a169" // green-600
          : event.type === "DEAT"
          ? "#e53e3e" // red-600
          : "#3182ce"; // blue-600

      // If ancestor filter is active, color by ancestor group
      if (ancestorFilter.showAncestorNumbers && numbers.length > 0) {
        // Create color map for ancestor groups (2-3, 4-7, 8-15, 16-31)
        const colorMap: Record<number, string> = {
          2: "#f59e0b", // amber-500
          3: "#10b981", // emerald-500
          4: "#3b82f6", // blue-500
          5: "#8b5cf6", // violet-500
          6: "#ec4899", // pink-500
          7: "#f43f5e", // rose-500
          8: "#06b6d4", // cyan-500
          9: "#14b8a6", // teal-500
        };

        const lowestNumber = Math.min(...numbers);
        const groupNumber = Math.floor(lowestNumber / 2) * 2;
        if (colorMap[groupNumber]) {
          baseColor = colorMap[groupNumber];
        }
      }

      // Modify opacity based on relationship
      const opacity =
        relationshipType === null
          ? 0.9
          : relationshipType === "none"
          ? 0.15
          : 0.9;

      // Add border color based on relationship
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
        // Add HTML for the marker with number inside
        html:
          ancestorFilter.showAncestorNumbers && numbers.length > 0
            ? `<div class="marker-number">${Math.min(...numbers)}</div>`
            : "",
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

    // Clear all existing markers
    currentMarkersRef.clear();
    // Clear all existing number markers from the map
    currentNumberMarkersRef.forEach((marker) => map.removeLayer(marker));
    currentNumberMarkersRef.clear();

    // First pass: collect all numbers for each location
    const locationNumbers = new Map<string, Set<number>>();

    // Process ALL events first to collect numbers
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

    // Then create markers using the complete number sets
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
      ).on("click", (e) => {
        L.DomEvent.stopPropagation(e);
        onSelect(person, event);
      });

      const coordKey = `${event.coordinates[0]},${event.coordinates[1]}`;
      markersRef.current.set(coordKey, marker);
      markers.addLayer(marker);

      // Add the number marker if needed
      if (ancestorFilter.showAncestorNumbers) {
        const coordKey = `${event.coordinates[0]},${event.coordinates[1]}`;
        const numbers = locationNumbers.get(coordKey);

        // Only create one number marker per location
        if (numbers && !numberMarkersRef.current.has(coordKey)) {
          const sortedNumbers = [...numbers].sort((a, b) => a - b);

          // Format numbers as ranges
          const ranges: string[] = [];
          let rangeStart = sortedNumbers[0];
          let prev = rangeStart;

          for (let i = 1; i <= sortedNumbers.length; i++) {
            const current = sortedNumbers[i];
            const isLastNumber = i === sortedNumbers.length;

            if (isLastNumber || current !== prev + 1) {
              // Add the current range or single number
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
      // Clear number markers on cleanup
      currentNumberMarkersRef.forEach((marker) => map.removeLayer(marker));
      currentNumberMarkersRef.clear();
    };
  }, [
    map,
    events,
    onSelect,
    activeCoordinates,
    rootPerson,
    relationships,
    temporaryHighlight,
    ahnentafelNumbers,
    ancestorFilter,
    getAllGGNumbers,
  ]);

  return null;
}

// Update LocationButton to use the coordinates prop
function LocationButton({
  coordinates,
  onClick,
}: {
  coordinates: [number, number];
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="text-blue-600 hover:text-blue-800 p-1 rounded-full hover:bg-blue-50"
      title={`View location (${coordinates[0]}, ${coordinates[1]}) on map`}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
      <span className="sr-only">View on map</span>
    </button>
  );
}

// Update MapController to handle zoom levels
function MapController({
  coordinates,
  zoom,
}: {
  coordinates: [number, number] | null;
  zoom?: number;
}) {
  const map = useMap();

  useEffect(() => {
    if (coordinates) {
      map.setView(coordinates, zoom || map.getZoom());
    }
  }, [coordinates, zoom, map]);

  return null;
}

// Add this type and state
type EventType = "BIRT" | "DEAT" | "RESI";

// Add this type
type RelationFilter = "all" | "ancestors" | "descendants";

// Add this helper function
function getAncestorPath(num: number): string {
  // For numbers 16-31 (converted to 1-16), get the path
  const paths: Record<number, string> = {
    1: "ff ff",
    2: "ff fm",
    3: "ff mf",
    4: "ff mm",
    5: "fm ff",
    6: "fm fm",
    7: "fm mf",
    8: "fm mm",
    9: "mf ff",
    10: "mf fm",
    11: "mf mf",
    12: "mf mm",
    13: "mm ff",
    14: "mm fm",
    15: "mm mf",
    16: "mm mm",
  };
  return paths[num] || "";
}

// Update the Ancestor Groups section in the person card
function getAncestorGroupInfo(
  personId: string,
  ahnentafelNumbers: Map<string, number[]>,
  relationships: Map<string, string>
): { number: number; type: "ancestor" | "descendant" }[] {
  const numbers = ahnentafelNumbers.get(personId) || [];
  const relationship = relationships.get(personId);

  // Helper to get all 2x great-grandparent groups for a number
  function getAllGGNumbers(n: number): number[] {
    const result: number[] = [];

    // Walk up the tree to find all ancestor groups
    let current = n;
    while (current > 0) {
      if (current >= 16 && current <= 31) {
        result.push(current - 15); // Convert to 1-16
      }
      current = Math.floor(current / 2);
    }

    // If this is an ancestor of a 2x great-grandparent,
    // include all descendant 2x great-grandparent groups
    if (n > 0 && n < 16) {
      const stack = [n * 2, n * 2 + 1]; // Start with immediate children
      while (stack.length > 0) {
        const next = stack.pop()!;
        if (next >= 16 && next <= 31) {
          result.push(next - 15);
        } else if (next < 16) {
          stack.push(next * 2, next * 2 + 1);
        }
      }
    }

    return [...new Set(result)];
  }

  // Get all groups this person belongs to
  const allGGNumbers = numbers.flatMap(getAllGGNumbers);
  if (allGGNumbers.length > 0) {
    return [...new Set(allGGNumbers)]
      .sort((a, b) => a - b)
      .map((num) => ({
        number: num,
        type: "ancestor" as const,
      }));
  }

  // For descendants, we need to check all possible ancestor paths
  if (relationship?.includes("son") || relationship?.includes("dotter")) {
    const ancestorGroups = new Set<number>();
    for (const num of numbers) {
      let current = num;
      while (current > 0) {
        if (current >= 16 && current <= 31) {
          ancestorGroups.add(current - 15);
        }
        current = Math.floor(current / 2);
      }
    }

    return Array.from(ancestorGroups)
      .sort((a, b) => a - b)
      .map((num) => ({
        number: num,
        type: "descendant" as const,
      }));
  }

  return [];
}

// Add this interface
interface LocationPerson {
  person: Person;
  events: Event[];
}

// Add this helper to format multiple positions
function formatAncestorLabel(ancestor: AncestorInfo): string {
  // Get the lowest number (main group number)
  const mainNumber = Math.min(...ancestor.numbers);
  const path = getAncestorPath(mainNumber);

  // Get birth and death years
  const birthYear = ancestor.birthYear;
  const deathYear = ancestor.deathYear;
  const years =
    birthYear || deathYear ? `, ${birthYear || "?"}-${deathYear || "?"}` : "";

  // Format as "01 - ff ff (Bengt Olsson, 1759-1812)"
  const mainLabel = `${mainNumber.toString().padStart(2, "0")} - ${path} (${
    ancestor.name
  }${years})`;

  // If there are additional numbers, add them as a suffix with just the numbers
  const additionalNumbers = ancestor.numbers
    .filter((n) => n !== mainNumber)
    .sort((a, b) => a - b);

  if (additionalNumbers.length > 0) {
    const additionalNums = additionalNumbers
      .map((n) => n.toString().padStart(2, "0"))
      .join(", ");
    return `${mainLabel} (also ${additionalNums})`;
  }

  return mainLabel;
}

// Replace Draggable implementation with custom dragging
function AncestorFilterPanel({
  open,
  onOpenChange,
  ancestors,
  filter,
  onFilterChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ancestors: AncestorInfo[];
  filter: AncestorFilter;
  onFilterChange: (filter: AncestorFilter) => void;
}) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const panelRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target instanceof HTMLElement && e.target.closest(".drag-handle")) {
      setIsDragging(true);
      dragStartPos.current = {
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      };
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStartPos.current.x,
        y: e.clientY - dragStartPos.current.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  // Define AncestorCheckbox inside the panel to access filter props
  const AncestorCheckbox = ({ ancestor }: { ancestor: AncestorInfo }) => (
    <div className="flex items-center space-x-2 mb-2">
      <Checkbox
        id={`ancestor-${ancestor.numbers[0]}`}
        checked={ancestor.numbers.some((n) => filter.selectedAncestors.has(n))}
        onCheckedChange={(checked) => {
          const newSelected = new Set(filter.selectedAncestors);
          ancestor.numbers.forEach((n) => {
            if (checked) {
              newSelected.add(n);
            } else {
              newSelected.delete(n);
            }
          });
          onFilterChange({
            ...filter,
            selectedAncestors: newSelected,
          });
        }}
      />
      <label
        htmlFor={`ancestor-${ancestor.numbers[0]}`}
        className="text-sm whitespace-nowrap"
      >
        {formatAncestorLabel(ancestor)}
      </label>
    </div>
  );

  // Group ancestors by paternal/maternal lines (keep existing grouping code)
  const paternalFather = ancestors.filter((a) =>
    a.numbers.some((n) => n >= 1 && n <= 4)
  );
  const paternalMother = ancestors.filter((a) =>
    a.numbers.some((n) => n >= 5 && n <= 8)
  );
  const maternalFather = ancestors.filter((a) =>
    a.numbers.some((n) => n >= 9 && n <= 12)
  );
  const maternalMother = ancestors.filter((a) =>
    a.numbers.some((n) => n >= 13 && n <= 16)
  );

  if (!open) return null;

  return (
    <Card
      ref={panelRef}
      className="absolute left-8 top-8 z-[1000] bg-white shadow-lg w-[800px]"
      style={{
        transform: `translate(${position.x}px, ${position.y}px)`,
        cursor: isDragging ? "grabbing" : "default",
      }}
      onMouseDown={handleMouseDown}
    >
      <div className="p-4">
        <div className="flex justify-between items-center mb-4 drag-handle cursor-grab border-b pb-2">
          <div>
            <h2 className="text-lg font-semibold">
              2x Great-Grandparent Filter
            </h2>
            <p className="text-sm text-gray-500">
              Drag this header to move the panel
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="show-numbers"
              checked={filter.showAncestorNumbers}
              onCheckedChange={(checked) =>
                onFilterChange({
                  ...filter,
                  showAncestorNumbers: checked === true,
                })
              }
            />
            <label htmlFor="show-numbers">
              Show ancestor numbers on markers
            </label>
          </div>

          <div className="grid grid-cols-2 gap-8 max-h-[60vh] overflow-y-auto">
            {/* Father's Line */}
            <div className="space-y-4">
              <h3 className="font-medium text-sm text-gray-900 bg-gray-100 p-2 rounded">
                Father&apos;s Line
              </h3>
              <div className="space-y-4 pl-2">
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    Father&apos;s Father&apos;s Line
                  </h4>
                  {paternalFather.map((ancestor) => (
                    <AncestorCheckbox
                      key={ancestor.numbers[0]}
                      ancestor={ancestor}
                    />
                  ))}
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    Father&apos;s Mother&apos;s Line
                  </h4>
                  {paternalMother.map((ancestor) => (
                    <AncestorCheckbox
                      key={ancestor.numbers[0]}
                      ancestor={ancestor}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Mother's Line */}
            <div className="space-y-4">
              <h3 className="font-medium text-sm text-gray-900 bg-gray-100 p-2 rounded">
                Mother&apos;s Line
              </h3>
              <div className="space-y-4 pl-2">
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    Mother&apos;s Father&apos;s Line
                  </h4>
                  {maternalFather.map((ancestor) => (
                    <AncestorCheckbox
                      key={ancestor.numbers[0]}
                      ancestor={ancestor}
                    />
                  ))}
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    Mother&apos;s Mother&apos;s Line
                  </h4>
                  {maternalMother.map((ancestor) => (
                    <AncestorCheckbox
                      key={ancestor.numbers[0]}
                      ancestor={ancestor}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

export default function FamilyMap() {
  const [people, setPeople] = useState<Person[]>([]);
  const [yearRange, setYearRange] = useState([1800, 2024]);
  const [selectedPerson, setSelectedPerson] = useState<{
    person: Person;
    event: Event;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [rootPerson, setRootPerson] = useState<string | null>(null);
  const [relationships, setRelationships] = useState<Map<string, string>>(
    new Map()
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [zoomToLocation, setZoomToLocation] = useState<{
    coordinates: [number, number];
    zoom?: number;
  } | null>(null);
  const [selectedEventTypes, setSelectedEventTypes] = useState<EventType[]>([
    "BIRT",
    "DEAT",
    "RESI",
  ]);
  // Add state for the relation filter
  const [relationFilter, setRelationFilter] = useState<RelationFilter>("all");
  const [isCalculating, setIsCalculating] = useState(false);
  // Add state for the active marker
  const [activeCoordinates, setActiveCoordinates] = useState<
    [number, number] | null
  >(null);
  const [isControlsCollapsed, setIsControlsCollapsed] = useState(false);
  const mapRef = useRef<L.Map | null>(null);
  // Move the temporaryHighlight state inside the component
  const [temporaryHighlight, setTemporaryHighlight] = useState<{
    personId: string;
    type: "ancestors" | "descendants" | "both" | null;
  } | null>(null);
  const [ancestorFilter, setAncestorFilter] = useState<AncestorFilter>({
    showAncestorNumbers: false,
    selectedAncestors: new Set<number>(),
  });
  const [ahnentafelNumbers, setAhnentafelNumbers] = useState<
    Map<string, number[]>
  >(new Map());
  const [ancestorFilterOpen, setAncestorFilterOpen] = useState(false);
  const [locationPeople, setLocationPeople] = useState<LocationPerson[]>([]);
  const [currentLocationIndex, setCurrentLocationIndex] = useState(0);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      console.log("No file selected");
      return;
    }

    console.log("File selected:", file.name);

    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        console.log("File content length:", content.length);

        const parsedPeople = parseGEDCOM(content);
        console.log("Parsed people:", parsedPeople.length);

        setPeople(parsedPeople);

        // Set year range based on data
        const years = parsedPeople.flatMap((p) =>
          p.events
            .map((e) => e.date.year)
            .filter((y): y is number => y !== null)
        );

        if (years.length) {
          const minYear = Math.min(...years);
          const maxYear = Math.max(...years);
          console.log("Setting year range:", minYear, maxYear);
          setYearRange([minYear, maxYear]);
        } else {
          console.log("No valid years found in the data");
        }
      } catch (error) {
        console.error("Error parsing GEDCOM:", error);
      }
    };

    reader.onerror = (error) => {
      console.error("Error reading file:", error);
    };

    reader.readAsText(file);
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  // Update filteredEvents to include relation filtering
  const filteredEvents = React.useMemo(() => {
    return people.flatMap((person) => {
      // Only apply filters if they are explicitly set
      if (rootPerson) {
        // Handle ancestor number filtering
        if (ancestorFilter.selectedAncestors.size > 0) {
          const personGroups = getAncestorGroupInfo(
            person.id,
            ahnentafelNumbers,
            relationships
          );

          // Check if this person belongs to any of the selected ancestor groups
          const isRelatedToSelectedAncestor = personGroups.some(({ number }) =>
            ancestorFilter.selectedAncestors.has(number)
          );

          if (!isRelatedToSelectedAncestor) return [];
        }
      }

      // Always apply basic event filters...
      return person.events
        .filter(
          (event) =>
            event.date.year !== null &&
            event.date.year >= yearRange[0] &&
            event.date.year <= yearRange[1] &&
            event.coordinates[0] !== 0 &&
            event.coordinates[1] !== 0 &&
            event.place !== "Unknown" &&
            selectedEventTypes.includes(event.type)
        )
        .map((event) => ({ person, event }));
    });
  }, [
    people,
    yearRange,
    selectedEventTypes,
    rootPerson,
    relationships,
    ancestorFilter,
    ahnentafelNumbers,
  ]);

  // Update the useEffect to store relationships separately
  useEffect(() => {
    async function calculateRelationshipsAsync() {
      if (rootPerson && people.length > 0) {
        setIsCalculating(true);
        try {
          // Wrap in setTimeout to allow UI to update
          await new Promise((resolve) => setTimeout(resolve, 0));
          const newRelationships = calculateRelationships(people, rootPerson);
          setRelationships(newRelationships);
          setRelationFilter("all");
        } finally {
          setIsCalculating(false);
        }
      } else {
        setRelationships(new Map());
      }
    }

    calculateRelationshipsAsync();
  }, [rootPerson, people]);

  // Helper function to get relationship for a person
  const getRelationship = (personId: string) => relationships.get(personId);

  // Filter people based on search term
  const filteredPeople = React.useMemo(() => {
    if (!searchTerm) return people;

    const searchTerms = searchTerm.toLowerCase().trim().split(/\s+/);

    return people
      .filter((person) => {
        const name = person.name.toLowerCase();
        // Match if all search terms are found in the name in any order
        return searchTerms.every((term) => name.includes(term));
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [people, searchTerm]);

  // Update the click handler to zoom closer
  const handleLocationClick = (
    coordinates: [number, number],
    currentZoom?: number
  ) => {
    setZoomToLocation({
      coordinates,
      zoom: currentZoom ? currentZoom + 2 : 14,
    });
    setActiveCoordinates(coordinates);
    // Clear the active marker after animation
    setTimeout(() => {
      setActiveCoordinates(null);
    }, 2000);
  };

  useEffect(() => {
    if (rootPerson && people.length > 0) {
      const numbers = calculateAhnentafelNumbers(people, rootPerson);
      setAhnentafelNumbers(numbers);
    } else {
      setAhnentafelNumbers(new Map());
    }
  }, [rootPerson, people]);

  return (
    <div className="h-screen w-screen overflow-hidden relative">
      {/* Controls panel */}
      <div
        className={cn(
          "absolute top-4 right-4 z-[1000] transition-transform duration-200",
          isControlsCollapsed
            ? "translate-x-[calc(100%-3rem)]"
            : "bg-white rounded-lg shadow-lg"
        )}
      >
        {/* Panel content */}
        <div className={cn("p-4", isControlsCollapsed ? "hidden" : "")}>
          <div className="space-y-6">
            {/* File upload */}
            <div>
              <label className="block">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".ged"
                  className="hidden"
                />
                <Button onClick={handleUploadClick}>
                  <FileUp className="w-4 h-4 mr-2" />
                  Upload GEDCOM
                </Button>
              </label>
            </div>

            {/* Root person selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Root Person</label>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full justify-between">
                    {rootPerson
                      ? people.find((p) => p.id === rootPerson)?.name ||
                        "Unknown"
                      : "Choose Root Person..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Choose Person for Root</DialogTitle>
                  </DialogHeader>
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <Command className="rounded-lg border shadow-md">
                        <CommandInput
                          placeholder="Search people..."
                          value={searchTerm}
                          onValueChange={setSearchTerm}
                        />
                        <CommandList className="max-h-[300px] overflow-y-auto">
                          <CommandEmpty>No person found.</CommandEmpty>
                          <CommandGroup>
                            {filteredPeople.map((person) => (
                              <CommandItem
                                key={person.id}
                                value={person.name}
                                className="cursor-pointer hover:bg-accent pointer-events-auto"
                                onSelect={() => {
                                  setRootPerson(person.id);
                                  setSearchTerm("");
                                  setDialogOpen(false);
                                }}
                                disabled={isCalculating}
                              >
                                <div
                                  className="flex items-center gap-2 w-full"
                                  onClick={() => {
                                    setRootPerson(person.id);
                                    setSearchTerm("");
                                  }}
                                >
                                  {rootPerson === person.id && (
                                    <Check className="h-4 w-4 text-primary shrink-0" />
                                  )}
                                  <div>
                                    <div className="flex items-center gap-2">
                                      {person.name}
                                      {isCalculating &&
                                        rootPerson === person.id && (
                                          <Loader2 className="w-4 h-4 animate-spin" />
                                        )}
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                      {person.events
                                        .filter(
                                          (e) =>
                                            e.type === "BIRT" && e.date.year
                                        )
                                        .map((e) => e.date.year)
                                        .join(", ")}
                                    </div>
                                  </div>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </div>
                    <div className="flex flex-col gap-2 min-w-[120px]">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setRootPerson(null);
                          setDialogOpen(false);
                        }}
                      >
                        Clear Selection
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Event types */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Event Types</label>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={
                    selectedEventTypes.includes("BIRT") ? "default" : "outline"
                  }
                  onClick={() => {
                    setSelectedEventTypes((prev) =>
                      prev.includes("BIRT")
                        ? prev.filter((t) => t !== "BIRT")
                        : [...prev, "BIRT"]
                    );
                  }}
                  className="flex items-center gap-1"
                >
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: "#38a169" }}
                  />
                  Birth
                </Button>
                <Button
                  size="sm"
                  variant={
                    selectedEventTypes.includes("DEAT") ? "default" : "outline"
                  }
                  onClick={() => {
                    setSelectedEventTypes((prev) =>
                      prev.includes("DEAT")
                        ? prev.filter((t) => t !== "DEAT")
                        : [...prev, "DEAT"]
                    );
                  }}
                  className="flex items-center gap-1"
                >
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: "#e53e3e" }}
                  />
                  Death
                </Button>
                <Button
                  size="sm"
                  variant={
                    selectedEventTypes.includes("RESI") ? "default" : "outline"
                  }
                  onClick={() => {
                    setSelectedEventTypes((prev) =>
                      prev.includes("RESI")
                        ? prev.filter((t) => t !== "RESI")
                        : [...prev, "RESI"]
                    );
                  }}
                  className="flex items-center gap-1"
                >
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: "#3182ce" }}
                  />
                  Living
                </Button>
              </div>
            </div>

            {/* Year range */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Year Range</label>
              <RangeSlider
                value={yearRange}
                min={1500}
                max={2024}
                step={1}
                onValueChange={setYearRange}
              />
              <div className="flex justify-between text-sm text-gray-600">
                <span>{yearRange[0]}</span>
                <span>{yearRange[1]}</span>
              </div>
            </div>

            {/* Filter section - only show when root person is selected */}
            {rootPerson && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Filter Events</label>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={relationFilter === "all" ? "default" : "outline"}
                    onClick={() => setRelationFilter("all")}
                  >
                    All
                  </Button>
                  <Button
                    size="sm"
                    variant={
                      relationFilter === "ancestors" ? "default" : "outline"
                    }
                    onClick={() => setRelationFilter("ancestors")}
                  >
                    Ancestors
                  </Button>
                  <Button
                    size="sm"
                    variant={
                      relationFilter === "descendants" ? "default" : "outline"
                    }
                    onClick={() => setRelationFilter("descendants")}
                  >
                    Descendants
                  </Button>
                </div>
              </div>
            )}

            {rootPerson && (
              <div className="space-y-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setAncestorFilterOpen(!ancestorFilterOpen)}
                  className={cn(
                    "w-full",
                    ancestorFilterOpen && "bg-blue-50 text-blue-600"
                  )}
                >
                  Ancestor Numbers Filter
                </Button>

                <AncestorFilterPanel
                  open={ancestorFilterOpen}
                  onOpenChange={setAncestorFilterOpen}
                  ancestors={get16Ancestors(
                    people,
                    rootPerson,
                    ahnentafelNumbers
                  )}
                  filter={ancestorFilter}
                  onFilterChange={setAncestorFilter}
                />
              </div>
            )}
          </div>
        </div>

        {/* Collapse button at the bottom of the panel */}
        <div
          className={cn(
            "border-t", // Add top border
            isControlsCollapsed ? "hidden" : "" // Hide when collapsed
          )}
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsControlsCollapsed(!isControlsCollapsed)}
            className="w-full h-8 rounded-none hover:bg-gray-50"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Expand button (only shown when collapsed) */}
        {isControlsCollapsed && (
          <Button
            variant="outline"
            size="lg"
            onClick={() => setIsControlsCollapsed(!isControlsCollapsed)}
            className="absolute -left-10 top-0 h-10 w-10 bg-white shadow-lg rounded-l-lg border-r-0 flex items-center justify-center"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* Keep only the bottom-right zoom controls */}
      <div className="absolute bottom-8 right-4 z-[1000] bg-white rounded-lg shadow-lg">
        <div className="flex flex-col gap-2 p-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const map = mapRef.current;
              if (map) {
                map.setZoom((map.getZoom() || 7) + 1);
              }
            }}
            className="h-8 w-8 p-0"
          >
            <Plus className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const map = mapRef.current;
              if (map) {
                map.setZoom((map.getZoom() || 7) - 1);
              }
            }}
            className="h-8 w-8 p-0"
          >
            <Minus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {people.length === 0 ? (
        <div className="flex items-center justify-center h-full text-gray-500">
          Upload a GEDCOM file to view your family map
        </div>
      ) : (
        <MapContainer
          center={[56.85, 14]}
          zoom={7}
          className="h-full w-full"
          ref={mapRef}
          zoomControl={false}
        >
          <TileLayer
            attribution='<a href="https://www.maptiler.com/copyright/" target="_blank">&copy; MapTiler</a> <a href="https://www.openstreetmap.org/copyright" target="_blank">&copy; OpenStreetMap contributors</a>'
            url={tileLayerUrl}
            maxZoom={19}
            tileSize={256}
          />
          <MarkerLayer
            events={filteredEvents}
            onSelect={(person, event) => {
              // First set the selected person so the card shows immediately
              setSelectedPerson({ person, event });

              // Then process the location people
              const peopleAtLocation = Array.from(
                filteredEvents
                  .filter(
                    (e) =>
                      e.event.coordinates[0] === event.coordinates[0] &&
                      e.event.coordinates[1] === event.coordinates[1]
                  )
                  .reduce((map, e) => {
                    if (!map.has(e.person.id)) {
                      map.set(e.person.id, {
                        person: e.person,
                        events: [e.event],
                      });
                    } else {
                      map.get(e.person.id)!.events.push(e.event);
                    }
                    return map;
                  }, new Map<string, { person: Person; events: Event[] }>())
              ).map((entry) => entry[1]);

              setLocationPeople(peopleAtLocation);
              setCurrentLocationIndex(
                peopleAtLocation.findIndex((p) => p.person.id === person.id)
              );
            }}
            activeCoordinates={activeCoordinates}
            rootPerson={rootPerson}
            relationships={relationships}
            temporaryHighlight={temporaryHighlight}
            ahnentafelNumbers={ahnentafelNumbers}
            ancestorFilter={ancestorFilter}
          />
          <MapController
            coordinates={zoomToLocation?.coordinates || null}
            zoom={zoomToLocation?.zoom}
          />
        </MapContainer>
      )}

      {selectedPerson && (
        <Card
          className={cn(
            "absolute left-0 top-0 bg-white shadow-lg z-[1000] overflow-y-auto rounded-none",
            "min-h-[300px]",
            "max-h-[calc(100vh-2rem)]",
            "w-[400px]"
          )}
        >
          <div className="flex flex-col h-full">
            {/* Header section */}
            <div className="sticky top-0 z-10 bg-white border-b mb-2">
              <div className="p-4">
                {/* Name and close button row */}
                <div className="flex justify-between items-start gap-4">
                  <div className="flex items-center gap-2">
                    {locationPeople.length > 1 && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          const newIndex =
                            (currentLocationIndex - 1 + locationPeople.length) %
                            locationPeople.length;
                          const newPerson = locationPeople[newIndex];
                          setCurrentLocationIndex(newIndex);
                          setSelectedPerson({
                            person: newPerson.person,
                            event: newPerson.events[0], // Show first event by default
                          });
                        }}
                        className="h-8 w-8 p-0"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                    )}
                    <h3 className="font-bold text-xl text-gray-900">
                      {selectedPerson.person.name}
                      {locationPeople.length > 1 && (
                        <span className="text-sm font-normal text-gray-500 ml-2">
                          ({currentLocationIndex + 1}/{locationPeople.length})
                        </span>
                      )}
                    </h3>
                    {locationPeople.length > 1 && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          const newIndex =
                            (currentLocationIndex + 1) % locationPeople.length;
                          const newPerson = locationPeople[newIndex];
                          setCurrentLocationIndex(newIndex);
                          setSelectedPerson({
                            person: newPerson.person,
                            event: newPerson.events[0], // Show first event by default
                          });
                        }}
                        className="h-8 w-8 p-0"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setSelectedPerson(null);
                      setLocationPeople([]);
                      setCurrentLocationIndex(0);
                    }}
                    className="h-8 w-8 p-0 -mt-1 -mr-1"
                  >
                    <X className="h-4 w-4" />
                    <span className="sr-only">Close</span>
                  </Button>
                </div>

                {/* Relationship and Set as Root row */}
                <div className="flex justify-between items-center mt-1">
                  {getRelationship(selectedPerson.person.id) && (
                    <div className="text-sm font-medium text-blue-600">
                      {getRelationship(selectedPerson.person.id)}
                    </div>
                  )}
                  <div className="ml-auto">
                    {rootPerson !== selectedPerson.person.id ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setRootPerson(selectedPerson.person.id)}
                        disabled={isCalculating}
                        className="whitespace-nowrap text-xs"
                      >
                        {isCalculating ? (
                          <>
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                            Calculating...
                          </>
                        ) : (
                          "Set as Root"
                        )}
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setRootPerson(null)}
                        disabled={isCalculating}
                        className="whitespace-nowrap text-xs"
                      >
                        {isCalculating ? (
                          <>
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                            Calculating...
                          </>
                        ) : (
                          "Clear Root"
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Content with padding */}
            <div className="space-y-4 px-4 pb-4">
              {/* Parents section */}
              {selectedPerson.person.parents.length > 0 && (
                <div className="bg-gray-50 p-2 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Parents</h4>
                  <div className="space-y-0">
                    {selectedPerson.person.parents.map((parentId) => {
                      const parent = people.find((p) => p.id === parentId);
                      return (
                        parent && (
                          <button
                            key={parentId}
                            className="w-full text-left px-2 py-1 hover:bg-gray-100 rounded-md text-blue-600 hover:text-blue-800"
                            onClick={() => {
                              const parentEvents = parent.events.filter(
                                (e) =>
                                  e.coordinates[0] !== 0 &&
                                  e.coordinates[1] !== 0 &&
                                  e.place !== "Unknown"
                              );
                              if (parentEvents.length > 0) {
                                setSelectedPerson({
                                  person: parent,
                                  event: parentEvents[0],
                                });
                                // Clear any temporary highlight when selecting new person
                                setTemporaryHighlight(null);
                              }
                            }}
                          >
                            {parent.name}
                          </button>
                        )
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Events section */}
              <div className="space-y-2">
                {/* Birth event */}
                {selectedPerson.person.events
                  .filter((event) => event.type === "BIRT")
                  .map((event, index) => (
                    <div
                      key={index}
                      className={cn(
                        "p-3 rounded-lg border transition-colors",
                        event === selectedPerson.event
                          ? "bg-blue-100 border-blue-300 shadow-sm"
                          : "hover:bg-gray-50 border-transparent"
                      )}
                    >
                      <div className="font-medium text-blue-900">Birth</div>
                      <div className="text-sm text-gray-600">
                        {event.date.from}
                        {event.date.to && ` to ${event.date.to}`}
                      </div>
                      <div className="flex justify-between items-center text-sm mt-1">
                        <span className="text-gray-700">{event.place}</span>
                        {event.coordinates[0] !== 0 &&
                          event.coordinates[1] !== 0 && (
                            <LocationButton
                              coordinates={event.coordinates}
                              onClick={() =>
                                handleLocationClick(event.coordinates, 12)
                              }
                            />
                          )}
                      </div>
                    </div>
                  ))}

                {/* Death event */}
                {selectedPerson.person.events
                  .filter((event) => event.type === "DEAT")
                  .map((event, index) => (
                    <div
                      key={index}
                      className={cn(
                        "p-3 rounded-lg border transition-colors",
                        event === selectedPerson.event
                          ? "bg-blue-100 border-blue-300 shadow-sm"
                          : "hover:bg-gray-50 border-transparent"
                      )}
                    >
                      <div className="font-medium text-blue-900">Death</div>
                      <div className="text-sm text-gray-600">
                        {event.date.from}
                        {event.date.to && ` to ${event.date.to}`}
                      </div>
                      <div className="flex justify-between items-center text-sm mt-1">
                        <span className="text-gray-700">{event.place}</span>
                        {event.coordinates[0] !== 0 &&
                          event.coordinates[1] !== 0 && (
                            <LocationButton
                              coordinates={event.coordinates}
                              onClick={() =>
                                handleLocationClick(event.coordinates, 12)
                              }
                            />
                          )}
                      </div>
                    </div>
                  ))}

                {/* Residence events */}
                {selectedPerson.person.events.some(
                  (event) => event.type === "RESI"
                ) && (
                  <div>
                    <h4 className="font-medium mb-2">Places of Residence</h4>
                    <div className="space-y-2">
                      {selectedPerson.person.events
                        .filter((event) => event.type === "RESI")
                        .sort((a, b) => {
                          if (a.date.year === null) return 1;
                          if (b.date.year === null) return -1;
                          return a.date.year - b.date.year;
                        })
                        .map((event, index) => (
                          <div
                            key={index}
                            className={cn(
                              "p-3 rounded-lg border transition-colors",
                              event === selectedPerson.event
                                ? "bg-blue-100 border-blue-300 shadow-sm"
                                : "hover:bg-gray-50 border-transparent"
                            )}
                          >
                            <div className="text-sm text-gray-600">
                              {event.date.from}
                              {event.date.to && ` to ${event.date.to}`}
                            </div>
                            <div className="flex justify-between items-center text-sm">
                              <span className="text-gray-700">
                                {event.place}
                              </span>
                              {event.coordinates[0] !== 0 &&
                                event.coordinates[1] !== 0 && (
                                  <LocationButton
                                    coordinates={event.coordinates}
                                    onClick={() =>
                                      handleLocationClick(event.coordinates, 12)
                                    }
                                  />
                                )}
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Children section */}
              {selectedPerson.person.children.length > 0 && (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Children</h4>
                  <div className="space-y-2">
                    {selectedPerson.person.children.map((childId) => {
                      const child = people.find((p) => p.id === childId);
                      return (
                        child && (
                          <button
                            key={childId}
                            className="w-full text-left px-2 py-1 hover:bg-gray-100 rounded-md text-blue-600 hover:text-blue-800"
                            onClick={() => {
                              const childEvents = child.events.filter(
                                (e) =>
                                  e.coordinates[0] !== 0 &&
                                  e.coordinates[1] !== 0 &&
                                  e.place !== "Unknown"
                              );
                              if (childEvents.length > 0) {
                                setSelectedPerson({
                                  person: child,
                                  event: childEvents[0],
                                });
                              }
                            }}
                          >
                            {child.name}
                          </button>
                        )
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Ancestor Groups section */}
              <div className="bg-gray-50 p-3 rounded-lg">
                <h4 className="text-sm font-medium text-gray-700 mb-2">
                  2x Great-Grandparent Groups
                </h4>
                <div className="flex flex-wrap gap-2">
                  {getAncestorGroupInfo(
                    selectedPerson.person.id,
                    ahnentafelNumbers,
                    relationships
                  ).map(({ number, type }) => (
                    <span
                      key={`${number}-${type}`}
                      className={cn(
                        "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium",
                        type === "ancestor"
                          ? "bg-yellow-100 text-yellow-800 border border-yellow-300"
                          : "bg-purple-100 text-purple-800 border border-purple-300"
                      )}
                    >
                      {number.toString().padStart(2, "0")}-
                      {getAncestorPath(number)}
                      {type === "descendant" && (
                        <div className="text-xs text-gray-500 ml-1">
                          (descendant)
                        </div>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
