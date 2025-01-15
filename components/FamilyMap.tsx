"use client";

import React, { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileUp, Check, ChevronsUpDown, Loader2, X } from "lucide-react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import L from "leaflet";
import { Icon } from "leaflet";
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

const DefaultIcon = new Icon({
  iconUrl: "/family-history-map/marker-icon.png",
  shadowUrl: "/family-history-map/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

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

// Update the leaflet module declaration
declare module "leaflet" {
  export interface MarkerClusterGroupOptions {
    spiderfyOnMaxZoom?: boolean;
    zoomToBoundsOnClick?: boolean;
    disableClusteringAtZoom?: number;
    maxClusterRadius?: number;
    iconCreateFunction?: (cluster: MarkerCluster) => L.DivIcon;
  }

  export class MarkerCluster extends L.Layer {
    getAllChildMarkers(): L.Marker[];
    getLatLng(): L.LatLng;
  }

  export class MarkerClusterGroup extends L.FeatureGroup {
    constructor(options?: MarkerClusterGroupOptions);
    addLayer(layer: L.Layer): this;
    removeLayer(layer: L.Layer): this;
  }
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

// Add this new component for handling markers
function MarkerLayer({
  events,
  onSelect,
  activeCoordinates,
}: {
  events: { person: Person; event: Event }[];
  onSelect: (person: Person, event: Event) => void;
  activeCoordinates: [number, number] | null;
}) {
  const map = useMap();
  const markersRef = useRef<Map<string, L.Marker>>(new Map());

  useEffect(() => {
    // Create a function to get marker icon based on event type and active state
    const getMarkerIcon = (event: Event, isActive: boolean | null) => {
      // Convert null to false for the isActive parameter
      const active = isActive ?? false;

      const color =
        event.type === "BIRT"
          ? "green"
          : event.type === "DEAT"
          ? "red"
          : "blue";

      return new Icon({
        iconUrl: active
          ? `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`
          : `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-${color}.png`,
        shadowUrl:
          "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
        iconSize: active ? [35, 57] : [25, 41],
        iconAnchor: active ? [17, 57] : [12, 41],
      });
    };

    const markers = new L.MarkerClusterGroup({
      spiderfyOnMaxZoom: true,
      zoomToBoundsOnClick: true,
      disableClusteringAtZoom: 10,
      maxClusterRadius: 30,
      iconCreateFunction: function (cluster: L.MarkerCluster) {
        const markers = cluster.getAllChildMarkers();

        // Create a Set of unique locations using coordinates as key
        const uniqueLocations = new Set(
          markers.map((marker) => {
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

    // Store markers ref in a variable for cleanup
    const currentMarkersRef = markersRef.current;

    events.forEach(({ person, event }) => {
      const isActive =
        activeCoordinates &&
        activeCoordinates[0] === event.coordinates[0] &&
        activeCoordinates[1] === event.coordinates[1];

      const marker = L.marker([event.coordinates[0], event.coordinates[1]], {
        icon: getMarkerIcon(event, isActive),
        zIndexOffset: isActive ? 1000 : 0, // Make active marker appear on top
      }).on("click", (e) => {
        L.DomEvent.stopPropagation(e);
        onSelect(person, event);
      });

      // Store reference to marker
      const coordKey = `${event.coordinates[0]},${event.coordinates[1]}`;
      markersRef.current.set(coordKey, marker);
      markers.addLayer(marker);
    });

    map.addLayer(markers);

    // Handle active marker
    if (activeCoordinates) {
      const coordKey = `${activeCoordinates[0]},${activeCoordinates[1]}`;
      const marker = markersRef.current.get(coordKey);
      if (marker) {
        marker.setZIndexOffset(1000); // Ensure active marker is on top
        map.setView(activeCoordinates, 14); // Zoom to the active marker

        // Add bounce animation class
        const icon = marker.getElement();
        if (icon) {
          icon.classList.add("marker-bounce");
          // Remove animation after 2 seconds
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
      // Skip if relation filter is active and person doesn't match the filter
      if (rootPerson && relationFilter !== "all") {
        const relationship = relationships.get(person.id);
        if (!relationship || relationship === "Not Related") return [];

        // Skip root person if filtering
        if (relationship === "Root Person") return [];

        if (relationFilter === "ancestors") {
          // Check if relationship code contains only parent codes (f/m)
          // and doesn't contain any child codes (s/d)
          const hasChildCodes = /[sd]/.test(relationship);
          const hasParentCodes = /[fm]/.test(relationship);
          if (hasChildCodes || !hasParentCodes) return [];
        }

        if (relationFilter === "descendants") {
          // Check if relationship code contains only child codes (s/d)
          // and doesn't contain any parent codes (f/m)
          const hasParentCodes = /[fm]/.test(relationship);
          const hasChildCodes = /[sd]/.test(relationship);
          if (hasParentCodes || !hasChildCodes) return [];
        }
      }

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
    relationFilter,
    relationships,
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

  return (
    <div className="h-screen w-screen overflow-hidden relative">
      {/* Controls */}
      <div className="absolute top-4 left-4 z-[1000] bg-white p-4 rounded-lg shadow-lg space-y-4 mb-8">
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

        <div className="w-48">
          <RangeSlider
            value={yearRange}
            min={1500}
            max={2024}
            step={1}
            onValueChange={setYearRange}
            className="my-4"
          />
          <div className="flex justify-between mt-2 text-sm text-gray-600">
            <span>{yearRange[0]}</span>
            <span>{yearRange[1]}</span>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm text-gray-600">Event Types:</label>
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

        <div className="flex flex-col gap-2">
          <label className="text-sm text-gray-600">Show Relations:</label>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={relationFilter === "all" ? "default" : "outline"}
              onClick={() => setRelationFilter("all")}
              disabled={!rootPerson}
            >
              All
            </Button>
            <Button
              size="sm"
              variant={relationFilter === "ancestors" ? "default" : "outline"}
              onClick={() => setRelationFilter("ancestors")}
              disabled={!rootPerson}
            >
              Ancestors
            </Button>
            <Button
              size="sm"
              variant={relationFilter === "descendants" ? "default" : "outline"}
              onClick={() => setRelationFilter("descendants")}
              disabled={!rootPerson}
            >
              Descendants
            </Button>
          </div>
        </div>

        <div className="w-48">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full justify-between">
                {rootPerson
                  ? people.find((p) => p.id === rootPerson)?.name || "Unknown"
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
                                      (e) => e.type === "BIRT" && e.date.year
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
      </div>

      {people.length === 0 ? (
        <div className="flex items-center justify-center h-full text-gray-500">
          Upload a GEDCOM file to view your family map
        </div>
      ) : (
        <MapContainer center={[56.85, 14]} zoom={7} className="h-full w-full">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MarkerLayer
            events={filteredEvents}
            onSelect={(person, event) => setSelectedPerson({ person, event })}
            activeCoordinates={activeCoordinates}
          />
          <MapController
            coordinates={zoomToLocation?.coordinates || null}
            zoom={zoomToLocation?.zoom}
          />
        </MapContainer>
      )}

      {selectedPerson && (
        <Card className="absolute bottom-12 left-4 p-4 max-w-md bg-white shadow-lg z-[1000] max-h-[50vh] overflow-y-auto">
          <div className="flex flex-col h-full">
            <div className="flex justify-between items-start sticky top-0 z-10 bg-white pb-2 border-b mb-4">
              <div className="bg-white">
                <h3 className="font-bold text-xl">
                  {selectedPerson.person.name}
                </h3>
                {getRelationship(selectedPerson.person.id) && (
                  <div className="text-sm text-blue-600">
                    {getRelationship(selectedPerson.person.id)}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                {rootPerson !== selectedPerson.person.id ? (
                  <Button
                    size="sm"
                    onClick={() => setRootPerson(selectedPerson.person.id)}
                    disabled={isCalculating}
                  >
                    {isCalculating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
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
                  >
                    {isCalculating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Calculating...
                      </>
                    ) : (
                      "Clear Root"
                    )}
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedPerson(null)}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                  <span className="sr-only">Close</span>
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              {/* Birth event if exists */}
              {selectedPerson.person.events
                .filter((event) => event.type === "BIRT")
                .map((event, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg ${
                      event === selectedPerson.event
                        ? "bg-blue-50 border border-blue-100"
                        : "hover:bg-gray-50"
                    }`}
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

              {/* Death event if exists */}
              {selectedPerson.person.events
                .filter((event) => event.type === "DEAT")
                .map((event, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg ${
                      event === selectedPerson.event
                        ? "bg-blue-50 border border-blue-100"
                        : "hover:bg-gray-50"
                    }`}
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

              {/* Parents section */}
              {selectedPerson.person.parents.length > 0 && (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <h4 className="font-medium mb-2">Parents</h4>
                  <div className="space-y-1">
                    {selectedPerson.person.parents.map((parentId) => {
                      const parent = people.find((p) => p.id === parentId);
                      return (
                        parent && (
                          <button
                            key={parentId}
                            className="text-sm text-blue-600 hover:underline block"
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
                          className={`p-2 rounded-lg ${
                            event === selectedPerson.event
                              ? "bg-blue-50 border border-blue-100"
                              : "hover:bg-gray-50"
                          }`}
                        >
                          <div className="text-sm text-gray-600">
                            {event.date.from}
                            {event.date.to && ` to ${event.date.to}`}
                          </div>
                          <div className="flex justify-between items-center text-sm">
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
                  </div>
                </div>
              )}

              {/* Children section */}
              {selectedPerson.person.children.length > 0 && (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <h4 className="font-medium mb-2">Children</h4>
                  <div className="space-y-1">
                    {selectedPerson.person.children.map((childId) => {
                      const child = people.find((p) => p.id === childId);
                      return (
                        child && (
                          <button
                            key={childId}
                            className="text-sm text-blue-600 hover:underline block"
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
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
