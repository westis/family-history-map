"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Plus,
  Minus,
  Info,
  Loader2,
} from "lucide-react";
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  useMapEvents,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import L from "leaflet";
import "leaflet.markercluster";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { geocodePlace } from "@/lib/geocoding";
import { MapController } from "@/components/map/MapController";
import { MarkerLayer } from "@/components/map/MarkerLayer";
import {
  Person,
  Event,
  AncestorInfo,
  AncestorFilter,
  RelationshipInfo,
  GeocodingReport as GeocodingReportType,
  LocationPerson,
  EventType,
  RelationFilter,
  GeoJSONCollection,
  PersonWithTree,
  FilteredEvent,
} from "@/app/utils/types";
import { calculateRelationships } from "@/app/utils/relationships";
import {
  get16Ancestors,
  getAncestorPath,
  getAncestorGroupInfo,
  calculateAhnentafelNumbers,
} from "@/app/utils/ancestors";
import { FileUpload } from "@/components/ui/control-panel/FileUpload";
import { EventTypeFilter } from "@/components/ui/control-panel/EventTypeFilter";
import { YearRangeFilter } from "@/components/ui/control-panel/YearRangeFilter";
import { RelationshipFilter } from "@/components/ui/control-panel/RelationshipFilter";
import { GeocodingSection } from "@/components/ui/control-panel/GeocodingSection";
import { RootPersonDialog } from "@/components/ui/control-panel/RootPersonDialog";
import PersonCard from "@/components/person/PersonCard";
import { GeocodingReport } from "@/components/dialogs/GeocodingReport";
import { InfoPanel } from "@/components/dialogs/InfoPanel";
import { LayerControl } from "@/components/ui/control-panel/LayerControl";
import { SearchBox } from "@/components/ui/control-panel/SearchBox";
import { TreeManager } from "@/components/ui/control-panel/TreeManager";
import { TreeOverlaps } from "@/components/ui/TreeOverlaps";

const DEFAULT_COLORS = [
  "#2563eb", // Main tree - blue
  "#dc2626", // Red
  "#16a34a", // Green
  "#9333ea", // Purple
  "#ea580c", // Orange
];

const tileLayerUrl = `https://api.maptiler.com/maps/topo/256/{z}/{x}/{y}.png?key=PWo9ydkPHrwquRTjQYKg`;

interface AncestorFilterPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ancestors: AncestorInfo[];
  filter: AncestorFilter;
  onFilterChange: (filter: AncestorFilter) => void;
  setRelationFilter: (filter: RelationFilter) => void;
  people: Person[];
  relationships: Map<string, RelationshipInfo>;
  ahnentafelNumbers: Map<string, number[]>;
  onSelectPerson: (person: Person) => void;
}

interface TreeData {
  id: string;
  name: string;
  color: string;
  isMain: boolean;
  people: Person[];
  geocodingStatus: {
    processed: number;
    total: number;
    placesToGeocode: Set<string>;
  };
}

// Add this interface for the performance memory
interface PerformanceMemory {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

// Update the logMemoryUsage function
const logMemoryUsage = () => {
  if (
    typeof window !== "undefined" &&
    (window.performance as unknown as { memory: PerformanceMemory }).memory
  ) {
    const memory = (
      window.performance as unknown as { memory: PerformanceMemory }
    ).memory;
    console.log("Memory usage:", {
      usedJSHeapSize: Math.round(memory.usedJSHeapSize / 1024 / 1024) + "MB",
      totalJSHeapSize: Math.round(memory.totalJSHeapSize / 1024 / 1024) + "MB",
      limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024) + "MB",
    });
  }
};

// Add interface for parish feature
interface ParishFeature {
  properties: {
    NAMN?: string;
    [key: string]: unknown;
  };
}

function AncestorFilterPanel({
  open,
  onOpenChange,
  ancestors,
  filter,
  onFilterChange,
  setRelationFilter,
  people,
  relationships,
  ahnentafelNumbers,
  onSelectPerson,
}: AncestorFilterPanelProps) {
  console.log("AncestorFilterPanel render:", { open });

  const [position, setPosition] = useState(() => {
    if (typeof window !== "undefined") {
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const panelWidth = 800;
      const panelHeight = 600;

      return {
        x: Math.max((viewportWidth - panelWidth) / 2, 20),
        y: Math.max((viewportHeight - panelHeight) / 2, 20),
      };
    }
    return { x: 20, y: 20 };
  });

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

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (isDragging) {
        setPosition({
          x: e.clientX - dragStartPos.current.x,
          y: e.clientY - dragStartPos.current.y,
        });
      }
    },
    [isDragging]
  );

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
  }, [isDragging, handleMouseMove]);

  const AncestorCheckbox = ({ ancestor }: { ancestor: AncestorInfo }) => {
    const person = people.find((p) =>
      ahnentafelNumbers
        .get(p.id)
        ?.some((n) => ancestor.numbers.includes(n - 15))
    );

    const years =
      ancestor.birthYear || ancestor.deathYear
        ? `, ${ancestor.birthYear || "?"}-${ancestor.deathYear || "?"}`
        : "";

    const path = getAncestorPath(
      Math.min(...ancestor.numbers),
      people,
      relationships,
      ahnentafelNumbers
    );

    return (
      <div className="flex items-center space-x-2 mb-2">
        <Checkbox
          id={`ancestor-${ancestor.numbers[0]}`}
          checked={ancestor.numbers.some((n) =>
            filter.selectedAncestors.has(n)
          )}
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
          className="text-sm whitespace-nowrap flex items-center"
        >
          <span>
            {ancestor.numbers[0].toString().padStart(2, "0")} - {path} (
          </span>
          <button
            onClick={(e) => {
              e.preventDefault();
              if (person) {
                onSelectPerson(person);
                onOpenChange(false);
              }
            }}
            className="text-blue-600 hover:text-blue-800 hover:underline"
          >
            {ancestor.name}
          </button>
          <span>{years})</span>
        </label>
      </div>
    );
  };

  const paternalFather = ancestors.filter((ancestor: AncestorInfo) =>
    ancestor.numbers.some((n: number) => n >= 1 && n <= 4)
  );
  const paternalMother = ancestors.filter((ancestor: AncestorInfo) =>
    ancestor.numbers.some((n: number) => n >= 5 && n <= 8)
  );
  const maternalFather = ancestors.filter((ancestor: AncestorInfo) =>
    ancestor.numbers.some((n: number) => n >= 9 && n <= 12)
  );
  const maternalMother = ancestors.filter((ancestor: AncestorInfo) =>
    ancestor.numbers.some((n: number) => n >= 13 && n <= 16)
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] overflow-hidden">
      <div
        className="absolute inset-0 bg-black/20"
        onClick={() => onOpenChange(false)}
      />

      <Card
        ref={panelRef}
        className="absolute bg-white shadow-lg w-[800px] max-h-[90vh] overflow-y-auto"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
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
            <div className="flex items-center justify-between">
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
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onFilterChange({
                    showAncestorNumbers: filter.showAncestorNumbers,
                    selectedAncestors: new Set<number>(),
                  });
                  setRelationFilter("all");
                }}
                className="text-xs"
              >
                Clear All Filters
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-8 max-h-[60vh] overflow-y-auto">
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
    </div>
  );
}

function CoordinateContextMenu({
  position: [lat, lng],
  onClose,
}: {
  position: [number, number];
  onClose: () => void;
}) {
  const mapRef = useMap();
  const point = mapRef.latLngToContainerPoint([lat, lng]);

  const formattedLat = lat.toFixed(6);
  const formattedLng = lng.toFixed(6);

  const copyToClipboard = (format: "decimal" | "dms") => {
    let textToCopy = "";

    if (format === "decimal") {
      textToCopy = `${formattedLat}, ${formattedLng}`;
    } else {
      // Convert to degrees, minutes, seconds format
      const latDMS = convertToDMS(lat, "N", "S");
      const lngDMS = convertToDMS(lng, "E", "W");
      textToCopy = `${latDMS} ${lngDMS}`;
    }

    navigator.clipboard.writeText(textToCopy);
    onClose();
  };

  return (
    <Card
      className="absolute z-[1000] bg-white shadow-lg p-2 min-w-[200px]"
      style={{
        left: `${point.x}px`,
        top: `${point.y}px`,
      }}
    >
      <div className="space-y-2">
        <div className="text-sm font-medium px-2 py-1">
          {formattedLat}, {formattedLng}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start"
          onClick={() => copyToClipboard("decimal")}
        >
          Copy Decimal Format
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start"
          onClick={() => copyToClipboard("dms")}
        >
          Copy DMS Format
        </Button>
      </div>
    </Card>
  );
}

function convertToDMS(
  decimal: number,
  posChar: string,
  negChar: string
): string {
  const direction = decimal >= 0 ? posChar : negChar;
  const absolute = Math.abs(decimal);
  const degrees = Math.floor(absolute);
  const minutesDecimal = (absolute - degrees) * 60;
  const minutes = Math.floor(minutesDecimal);
  const seconds = Math.round((minutesDecimal - minutes) * 60 * 100) / 100;

  return `${degrees}°${minutes}'${seconds}"${direction}`;
}

function MapEventHandler({
  onContextMenu,
}: {
  onContextMenu: (latlng: [number, number]) => void;
}) {
  const map = useMapEvents({
    contextmenu: (e) => {
      e.originalEvent.preventDefault(); // Prevent default context menu
      onContextMenu([e.latlng.lat, e.latlng.lng]);
    },
    click: () => {
      // Close context menu on regular click
      onContextMenu([-1, -1]);
    },
  });

  // Prevent default context menu on the map container
  useEffect(() => {
    if (map) {
      map.getContainer().addEventListener("contextmenu", (e) => {
        e.preventDefault();
      });
    }
  }, [map]);

  return null;
}

interface StyleOptions {
  weight: number;
  color: string;
  opacity: number;
  fillOpacity: number;
}

// Define the debounce function specifically for StyleOptions
const debounceStyle = (
  func: (style: StyleOptions) => void,
  wait: number
): ((style: StyleOptions) => void) => {
  let timeout: NodeJS.Timeout;
  return (style: StyleOptions) => {
    const later = () => {
      clearTimeout(timeout);
      func(style);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// Add memoization for the parish layer to prevent unnecessary re-renders
const MemoizedParishLayer = React.memo(
  function ParishLayer({
    parishData,
    mapRef,
  }: {
    parishData: GeoJSONCollection;
    mapRef: React.MutableRefObject<L.Map | null>;
  }) {
    return (
      <GeoJSON
        data={parishData}
        style={{
          color: "#374151",
          weight: 1,
          opacity: 0.5,
          fillOpacity: 0.1,
          pane: "parishPane",
        }}
        onEachFeature={(feature, layer) => {
          const name = feature.properties?.NAMN;
          if (name) {
            layer.bindTooltip(name, {
              permanent: false,
              direction: "auto",
              className: "parish-tooltip",
              offset: [0, -5],
            });
          }

          const debouncedStyle = debounceStyle((style: StyleOptions) => {
            const parishPane = mapRef.current?.getPane("parishPane");
            if (parishPane) {
              parishPane.style.pointerEvents = "auto";
            }
            (layer as L.Path).setStyle(style);
          }, 16);

          const resetStyle = debounceStyle((style: StyleOptions) => {
            const parishPane = mapRef.current?.getPane("parishPane");
            if (parishPane) {
              parishPane.style.pointerEvents = "none";
            }
            (layer as L.Path).setStyle(style);
          }, 16);

          layer.on({
            mouseover: () => {
              debouncedStyle({
                weight: 3,
                color: "#1d4ed8",
                opacity: 1,
                fillOpacity: 0.2,
              });
            },
            mouseout: () => {
              resetStyle({
                weight: 1,
                color: "#374151",
                opacity: 0.5,
                fillOpacity: 0.1,
              });
            },
          });
        }}
      />
    );
  },
  (prevProps, nextProps) => {
    // Only re-render if parishData changes
    return prevProps.parishData === nextProps.parishData;
  }
);

export default function FamilyMap() {
  const [people, setPeople] = useState<Person[]>([]);
  const [yearRange, setYearRange] = useState<[number, number]>([1800, 2024]);
  const [selectedPerson, setSelectedPerson] = useState<{
    person: Person;
    event: Event;
  } | null>(null);
  const [rootPerson, setRootPerson] = useState<string | null>(null);
  const [relationships, setRelationships] = useState<
    Map<string, RelationshipInfo>
  >(new Map());
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
  const [relationFilter, setRelationFilter] = useState<RelationFilter>("all");
  const [isCalculating, setIsCalculating] = useState(false);
  const [activeCoordinates, setActiveCoordinates] = useState<
    [number, number] | null
  >(null);
  const [isControlsCollapsed, setIsControlsCollapsed] = useState(false);
  const mapRef = useRef<L.Map | null>(null);
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
  const [infoOpen, setInfoOpen] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geocodingProgress, setGeocodingProgress] = useState({
    processed: 0,
    total: 0,
    currentPlace: "",
    treeId: "",
  });
  const [geocodingReport, setGeocodingReport] =
    useState<GeocodingReportType | null>(null);
  const geocodingRef = useRef({ shouldContinue: true });
  const [showParishes, setShowParishes] = useState(false);
  const [parishData, setParishData] = useState<GeoJSONCollection | null>(null);
  const [contextMenuPosition, setContextMenuPosition] = useState<
    [number, number] | null
  >(null);
  const [isLoadingParishes, setIsLoadingParishes] = useState(false);
  const [trees, setTrees] = useState<TreeData[]>([]);

  const loadParishData = async () => {
    try {
      setIsLoadingParishes(true);
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

      const response = await fetch(`${basePath}/data/svenska-socknar.geojson`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();

      // Simplify geometries to reduce memory usage
      data.features = data.features.map((feature: ParishFeature) => ({
        ...feature,
        properties: {
          NAMN: feature.properties.NAMN,
        },
      }));

      setParishData(data);
    } catch (error) {
      console.error("Error loading parish data:", error);
    } finally {
      setIsLoadingParishes(false);
    }
  };

  const filteredEvents = React.useMemo(() => {
    const mainTree = trees.find((tree) => tree.isMain);
    if (!mainTree) return [];

    return trees.flatMap((tree) => {
      return tree.people.flatMap((person) => {
        // Add tree info to person
        const personWithTree: PersonWithTree = {
          ...person,
          treeId: tree.id,
        };

        if (tree.isMain && rootPerson) {
          const relationship = relationships.get(person.id);
          const personGroups = getAncestorGroupInfo(
            person.id,
            ahnentafelNumbers,
            relationships
          );

          const matchesRelationFilter = (() => {
            if (relationFilter === "all") return true;
            if (!relationship) return false;

            if (relationship.type === "root") return true;

            if (relationFilter === "ancestors")
              return relationship.type === "ancestor";
            if (relationFilter === "descendants")
              return relationship.type === "descendant";

            return false;
          })();

          const matchesAncestorFilter =
            ancestorFilter.selectedAncestors.size === 0 ||
            personGroups.some(({ number }) =>
              ancestorFilter.selectedAncestors.has(number)
            );

          if (!matchesRelationFilter || !matchesAncestorFilter) {
            return [];
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
          .map((event) => ({
            person: personWithTree,
            event: {
              ...event,
              treeId: tree.id,
              treeColor: tree.color,
            },
          }));
      });
    });
  }, [
    trees,
    yearRange,
    selectedEventTypes,
    rootPerson,
    relationships,
    relationFilter,
    ancestorFilter,
    ahnentafelNumbers,
  ]);

  useEffect(() => {
    async function calculateRelationshipsAsync() {
      if (rootPerson && people.length > 0) {
        setIsCalculating(true);
        try {
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

  useEffect(() => {
    if (rootPerson && people.length > 0) {
      const numbers = calculateAhnentafelNumbers(people, rootPerson);
      setAhnentafelNumbers(numbers);
    } else {
      setAhnentafelNumbers(new Map());
    }
  }, [rootPerson, people]);

  const handleGeocoding = async (treeId: string) => {
    const tree = trees.find((t) => t.id === treeId);
    if (!tree || tree.geocodingStatus.placesToGeocode.size === 0) return;

    setIsGeocoding(true);
    geocodingRef.current.shouldContinue = true;

    setGeocodingProgress({
      processed: 0,
      total: tree.geocodingStatus.placesToGeocode.size,
      currentPlace: "",
      treeId: tree.id,
    });

    const geocodedPlaces = new Map<string, [number, number]>();
    const failedPlaces: string[] = [];
    let processed = 0;
    let successCount = 0;

    const placesArray = Array.from(tree.geocodingStatus.placesToGeocode);

    for (let i = 0; i < placesArray.length; i++) {
      if (!geocodingRef.current.shouldContinue) {
        console.log("Geocoding cancelled");
        break;
      }

      const place = placesArray[i];

      setGeocodingProgress({
        processed,
        total: tree.geocodingStatus.placesToGeocode.size,
        currentPlace: place,
        treeId: tree.id,
      });

      try {
        const coordinates = await geocodePlace(place);
        if (coordinates) {
          geocodedPlaces.set(place, coordinates);
          successCount++;

          setTrees((currentTrees) =>
            currentTrees.map((t) => {
              if (t.id !== tree.id) return t;

              return {
                ...t,
                people: t.people.map((person) => ({
                  ...person,
                  events: person.events.map((event) => {
                    if (event.place === place) {
                      return { ...event, coordinates };
                    }
                    return event;
                  }),
                })),
                geocodingStatus: {
                  ...t.geocodingStatus,
                  placesToGeocode: new Set(
                    Array.from(t.geocodingStatus.placesToGeocode).filter(
                      (p) => p !== place
                    )
                  ),
                },
              };
            })
          );

          // Also update main people state if this is the main tree
          if (tree.isMain) {
            setPeople((currentPeople) =>
              currentPeople.map((person) => ({
                ...person,
                events: person.events.map((event) => {
                  if (event.place === place) {
                    return { ...event, coordinates };
                  }
                  return event;
                }),
              }))
            );
          }
        } else {
          failedPlaces.push(place);
        }
      } catch (error) {
        console.error(`Error geocoding ${place}:`, error);
        failedPlaces.push(place);
      }

      processed++;
    }

    setIsGeocoding(false);
    geocodingRef.current.shouldContinue = true;

    if (processed > 0) {
      setGeocodingReport({
        failedPlaces,
        totalAttempted: tree.geocodingStatus.placesToGeocode.size,
        successCount,
      });
    }
  };

  const handleLocationClick = (
    coordinates: [number, number],
    currentZoom?: number
  ) => {
    setZoomToLocation({
      coordinates,
      zoom: currentZoom ? currentZoom + 2 : 14,
    });
    setActiveCoordinates(coordinates);
    setTimeout(() => {
      setActiveCoordinates(null);
    }, 2000);
  };

  useEffect(() => {
    if (showParishes && !parishData) {
      console.log("Before loading parish data:");
      logMemoryUsage();
      loadParishData().then(() => {
        console.log("After loading parish data:");
        logMemoryUsage();
      });
    }
  }, [showParishes, parishData]);

  useEffect(() => {
    if (mapRef.current) {
      const map = mapRef.current;
      if (showParishes) {
        if (!map.getPane("parishPane")) {
          map.createPane("parishPane");
          const parishPane = map.getPane("parishPane");
          if (parishPane) {
            parishPane.style.zIndex = "200";
            parishPane.style.pointerEvents = "none";
            parishPane.style.willChange = "transform";
            parishPane.style.transform = "translate3d(0,0,0)";
            parishPane.style.backfaceVisibility = "hidden";
          }
        }
      }
    }
  }, [showParishes]);

  useEffect(() => {
    if (!showParishes && parishData) {
      // Clear parish data when layer is disabled
      setParishData(null);
      console.log("After clearing parish data:");
      logMemoryUsage();
    }
  }, [showParishes]);

  // Add this memoized lookup map for quick coordinate access
  const coordinateMap = React.useMemo(() => {
    const map = new Map<string, FilteredEvent[]>();

    filteredEvents.forEach((event) => {
      const key = `${event.event.coordinates[0]},${event.event.coordinates[1]}`;
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(event);
    });

    return map;
  }, [filteredEvents]);

  // Optimize the marker click handler
  const handleMarkerClick = useCallback(
    (person: Person, event: Event) => {
      console.time("total-selection-process");
      performance.mark("selection-start");

      // Use a single batch update
      const key = `${event.coordinates[0]},${event.coordinates[1]}`;
      const eventsAtLocation = coordinateMap.get(key) || [];

      const peopleAtLocation = Array.from(
        eventsAtLocation.reduce((map, e) => {
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

      const currentIndex = peopleAtLocation.findIndex(
        (p) => p.person.id === person.id
      );

      // Batch the state updates
      queueMicrotask(() => {
        setSelectedPerson({ person, event });
        setLocationPeople(peopleAtLocation);
        setCurrentLocationIndex(currentIndex);
      });

      performance.mark("selection-end");
      console.timeEnd("total-selection-process");
    },
    [coordinateMap]
  );

  return (
    <div className="h-screen w-screen overflow-hidden relative">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setInfoOpen(true)}
        className="absolute top-4 left-4 z-[1000] bg-white shadow-md"
      >
        <Info className="h-4 w-4 mr-2" />
        About
      </Button>

      <InfoPanel open={infoOpen} onOpenChange={setInfoOpen} />

      {showParishes && isLoadingParishes && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-white rounded-lg shadow-lg px-4 py-2 flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Loading parish borders...</span>
        </div>
      )}

      <div
        className={cn(
          "absolute top-4 right-4 z-[1000] transition-transform duration-200",
          isControlsCollapsed
            ? "translate-x-[calc(100%-3rem)]"
            : "bg-white rounded-lg shadow-lg"
        )}
      >
        <div className={cn("p-4", isControlsCollapsed ? "hidden" : "")}>
          <div className="space-y-6">
            <SearchBox
              people={people}
              onSelectPerson={(person) => {
                const event =
                  person.events.find(
                    (e) =>
                      e.coordinates[0] !== 0 &&
                      e.coordinates[1] !== 0 &&
                      e.place !== "Unknown"
                  ) || person.events[0];

                setSelectedPerson({ person, event });

                if (
                  event &&
                  event.coordinates[0] !== 0 &&
                  event.coordinates[1] !== 0
                ) {
                  setZoomToLocation({
                    coordinates: event.coordinates,
                    zoom: 14,
                  });
                }
              }}
              onSelectLocation={(coordinates, zoom) => {
                setZoomToLocation({ coordinates, zoom });
              }}
            />

            <FileUpload
              isFirstTree={trees.length === 0}
              onUploadAction={(people, placesToGeocode, isMain) => {
                const newTree: TreeData = {
                  id: crypto.randomUUID(),
                  name: isMain ? "Main Tree" : `Tree ${trees.length + 1}`,
                  people,
                  color: DEFAULT_COLORS[trees.length % DEFAULT_COLORS.length],
                  isMain,
                  geocodingStatus: {
                    processed: 0,
                    total: 0,
                    placesToGeocode,
                  },
                };
                setTrees((current) => [...current, newTree]);

                // If this is the main tree, also update people state
                if (isMain) {
                  setPeople(people);
                }
              }}
              onYearRangeUpdateAction={(minYear, maxYear) =>
                setYearRange([minYear, maxYear])
              }
              onClearCacheAction={() => {
                if (typeof window !== "undefined") {
                  localStorage.removeItem("geocoding-cache");
                  console.log("Geocoding cache cleared");
                }
              }}
            />

            <GeocodingSection
              isGeocoding={isGeocoding}
              progress={geocodingProgress}
              onStartAction={handleGeocoding}
              onCancelAction={() => {
                geocodingRef.current.shouldContinue = false;
                setIsGeocoding(false);
              }}
            />

            <RootPersonDialog
              open={dialogOpen}
              onOpenChangeAction={setDialogOpen}
              rootPerson={rootPerson}
              people={people}
              isCalculating={isCalculating}
              searchTerm={searchTerm}
              onSearchChangeAction={setSearchTerm}
              onSelectPersonAction={setRootPerson}
            />

            <EventTypeFilter
              selectedTypes={selectedEventTypes}
              onChangeAction={setSelectedEventTypes}
            />

            <YearRangeFilter value={yearRange} onChangeAction={setYearRange} />

            {rootPerson && (
              <RelationshipFilter
                relationFilter={relationFilter}
                onChangeAction={setRelationFilter}
              />
            )}

            {rootPerson && (
              <div className="space-y-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setAncestorFilterOpen(true)}
                  className={cn(
                    "w-full",
                    ancestorFilterOpen && "bg-blue-50 text-blue-600"
                  )}
                >
                  Ancestor Numbers Filter
                </Button>
              </div>
            )}

            <LayerControl
              showParishes={showParishes}
              onChangeAction={setShowParishes}
            />

            <TreeManager
              onTreeSelect={(treeId) => {
                const selectedTree = trees.find((t) => t.id === treeId);
                if (selectedTree?.isMain) {
                  setPeople(selectedTree.people);
                }
              }}
              onTreeRemove={(treeId) => {
                setTrees((current) => current.filter((t) => t.id !== treeId));
                // If removing main tree, clear people state
                const removedTree = trees.find((t) => t.id === treeId);
                if (removedTree?.isMain) {
                  setPeople([]);
                  setRootPerson(null);
                }
              }}
            />
          </div>
        </div>

        <div className={cn("border-t", isControlsCollapsed ? "hidden" : "")}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsControlsCollapsed(!isControlsCollapsed)}
            className="w-full h-8 rounded-none hover:bg-gray-50"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

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
          {showParishes && parishData && !isLoadingParishes && (
            <MemoizedParishLayer parishData={parishData} mapRef={mapRef} />
          )}
          <MarkerLayer
            events={filteredEvents}
            onSelectAction={handleMarkerClick}
            activeCoordinates={activeCoordinates}
            rootPerson={rootPerson}
            relationships={relationships}
            temporaryHighlight={temporaryHighlight}
            setTemporaryHighlightAction={setTemporaryHighlight}
            ahnentafelNumbers={ahnentafelNumbers}
            ancestorFilter={ancestorFilter}
          />
          <MapController
            coordinates={zoomToLocation?.coordinates || null}
            zoom={zoomToLocation?.zoom}
          />
          <MapEventHandler
            onContextMenu={(latlng) => {
              if (latlng[0] === -1) {
                setContextMenuPosition(null);
              } else {
                setContextMenuPosition(latlng);
              }
            }}
          />
          {contextMenuPosition && (
            <CoordinateContextMenu
              position={contextMenuPosition}
              onClose={() => setContextMenuPosition(null)}
            />
          )}
          <TreeOverlaps
            events={filteredEvents}
            onSelectLocation={handleLocationClick}
            trees={trees}
          />
        </MapContainer>
      )}

      {selectedPerson && (
        <PersonCard
          selectedPerson={selectedPerson}
          locationPeople={locationPeople}
          currentLocationIndex={currentLocationIndex}
          setCurrentLocationIndex={setCurrentLocationIndex}
          setSelectedPerson={setSelectedPerson}
          setLocationPeople={setLocationPeople}
          handleLocationClick={handleLocationClick}
          rootPerson={rootPerson}
          setRootPerson={setRootPerson}
          isCalculating={isCalculating}
          relationships={relationships}
          people={people}
        />
      )}

      {rootPerson && (
        <AncestorFilterPanel
          open={ancestorFilterOpen}
          onOpenChange={setAncestorFilterOpen}
          ancestors={get16Ancestors(people, rootPerson, ahnentafelNumbers)}
          filter={ancestorFilter}
          onFilterChange={setAncestorFilter}
          setRelationFilter={setRelationFilter}
          people={people}
          relationships={relationships}
          ahnentafelNumbers={ahnentafelNumbers}
          onSelectPerson={(person) => {
            const event =
              person.events.find(
                (e) =>
                  e.coordinates[0] !== 0 &&
                  e.coordinates[1] !== 0 &&
                  e.place !== "Unknown"
              ) || person.events[0];

            setSelectedPerson({ person, event });
          }}
        />
      )}

      <GeocodingReport
        report={geocodingReport}
        onOpenChange={() => setGeocodingReport(null)}
      />
    </div>
  );
}
