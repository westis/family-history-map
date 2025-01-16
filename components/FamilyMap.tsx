"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  X,
  ChevronLeft,
  ChevronRight,
  Plus,
  Minus,
  Info,
} from "lucide-react";
import { MapContainer, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import L from "leaflet";
import "leaflet.markercluster";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { geocodePlace } from "@/lib/geocoding";
import { LocationButton } from "@/components/map/LocationButton";
import { MapController } from "@/components/map/MapController";
import { MarkerLayer } from "@/components/map/MarkerLayer";
import {
  Person,
  Event,
  AncestorInfo,
  AncestorFilter,
  RelationshipInfo,
  GeocodingReport,
  LocationPerson,
  EventType,
  RelationFilter,
} from "@/app/utils/types";
import { calculateRelationships } from "@/app/utils/relationships";
import {
  calculateAhnentafelNumbers,
  get16Ancestors,
  getAncestorPath,
  getAncestorGroupInfo,
} from "@/app/utils/ancestors";
import { FileUpload } from "@/components/ui/control-panel/FileUpload";
import { EventTypeFilter } from "@/components/ui/control-panel/EventTypeFilter";
import { YearRangeFilter } from "@/components/ui/control-panel/YearRangeFilter";
import { RelationshipFilter } from "@/components/ui/control-panel/RelationshipFilter";
import { GeocodingSection } from "@/components/ui/control-panel/GeocodingSection";
import { RootPersonDialog } from "@/components/ui/control-panel/RootPersonDialog";

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

function InfoPanel({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>About Family Map</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p>
            Family Map is a tool for visualizing and exploring your family
            history geographically. Upload a GEDCOM file to see where your
            ancestors lived, were born, and died.
          </p>
          <div className="space-y-2">
            <h3 className="font-medium">Created by</h3>
            <p>Daniel Westergren</p>
            <div className="flex items-center gap-2">
              <a
                href="mailto:westis+dna@gmail.com"
                className="text-blue-600 hover:text-blue-800"
              >
                westis+dna@gmail.com
              </a>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

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
  });
  const [geocodingReport, setGeocodingReport] =
    useState<GeocodingReport | null>(null);
  const [placesToGeocode, setPlacesToGeocode] = useState<Set<string>>(
    new Set()
  );
  const geocodingRef = useRef({ shouldContinue: true });

  const filteredEvents = React.useMemo(() => {
    return people.flatMap((person) => {
      if (rootPerson) {
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
        .map((event) => ({ person, event }));
    });
  }, [
    people,
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

  const getRelationship = (personId: string) => relationships.get(personId);

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
    if (rootPerson && people.length > 0) {
      const numbers = calculateAhnentafelNumbers(people, rootPerson);
      setAhnentafelNumbers(numbers);
    } else {
      setAhnentafelNumbers(new Map());
    }
  }, [rootPerson, people]);

  const handleGeocoding = async () => {
    if (placesToGeocode.size === 0) return;

    setIsGeocoding(true);
    geocodingRef.current.shouldContinue = true;

    setGeocodingProgress({
      processed: 0,
      total: placesToGeocode.size,
      currentPlace: "",
    });

    const geocodedPlaces = new Map<string, [number, number]>();
    const failedPlaces: string[] = [];
    let processed = 0;
    let successCount = 0;

    const placesArray = Array.from(placesToGeocode);

    for (let i = 0; i < placesArray.length; i++) {
      if (!geocodingRef.current.shouldContinue) {
        console.log("Geocoding cancelled");
        const remainingPlaces = new Set(placesArray.slice(i));
        setPlacesToGeocode(remainingPlaces);
        break;
      }

      const place = placesArray[i];

      setGeocodingProgress({
        processed,
        total: placesToGeocode.size,
        currentPlace: place,
      });

      try {
        const coordinates = await geocodePlace(place);
        if (coordinates) {
          geocodedPlaces.set(place, coordinates);
          successCount++;

          setPeople((currentPeople) => {
            const updatedPeople = currentPeople.map((person) => ({
              ...person,
              events: person.events.map((event) => {
                if (event.place === place) {
                  return { ...event, coordinates };
                }
                return event;
              }),
            }));
            return updatedPeople;
          });

          setPlacesToGeocode((current) => {
            const updated = new Set(current);
            updated.delete(place);
            return updated;
          });
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

    if (processed > 0 && geocodingRef.current.shouldContinue) {
      setGeocodingReport({
        failedPlaces,
        totalAttempted: placesToGeocode.size,
        successCount,
      });
    }
  };

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
            <FileUpload
              onUploadAction={setPeople}
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
              placesToGeocode={placesToGeocode}
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
          <MarkerLayer
            events={filteredEvents}
            onSelectAction={(person, event) => {
              setSelectedPerson({ person, event });

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
            <div className="sticky top-0 z-10 bg-white border-b mb-2">
              <div className="p-4">
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
                            event: newPerson.events[0],
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
                            event: newPerson.events[0],
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

                <div className="flex justify-between items-center mt-1">
                  {getRelationship(selectedPerson.person.id)?.relationship && (
                    <div className="text-sm font-medium text-blue-600">
                      {getRelationship(selectedPerson.person.id)?.relationship}
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

            <div className="space-y-4 px-4 pb-4">
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
                              setSelectedPerson({
                                person: parent,
                                event:
                                  parent.events.find(
                                    (e) =>
                                      e.coordinates[0] !== 0 &&
                                      e.coordinates[1] !== 0 &&
                                      e.place !== "Unknown"
                                  ) || parent.events[0],
                              });
                              setTemporaryHighlight(null);
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

              <div className="space-y-2">
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
                              setSelectedPerson({
                                person: child,
                                event:
                                  child.events.find(
                                    (e) =>
                                      e.coordinates[0] !== 0 &&
                                      e.coordinates[1] !== 0 &&
                                      e.place !== "Unknown"
                                  ) || child.events[0],
                              });
                              setTemporaryHighlight(null);
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
                      {getAncestorPath(
                        number,
                        people,
                        relationships,
                        ahnentafelNumbers
                      )}
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

      {geocodingReport && (
        <Dialog
          open={!!geocodingReport}
          onOpenChange={() => setGeocodingReport(null)}
        >
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Geocoding Report</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span>Total places attempted:</span>
                <span className="font-medium">
                  {geocodingReport.totalAttempted}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Successfully geocoded:</span>
                <span className="font-medium text-green-600">
                  {geocodingReport.successCount}(
                  {Math.round(
                    (geocodingReport.successCount /
                      geocodingReport.totalAttempted) *
                      100
                  )}
                  %)
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Failed to geocode:</span>
                <span className="font-medium text-red-600">
                  {geocodingReport.failedPlaces.length}(
                  {Math.round(
                    (geocodingReport.failedPlaces.length /
                      geocodingReport.totalAttempted) *
                      100
                  )}
                  %)
                </span>
              </div>

              {geocodingReport.failedPlaces.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-medium mb-2">Failed Places:</h4>
                  <div className="bg-gray-50 rounded-lg p-4 max-h-[300px] overflow-y-auto">
                    <ul className="space-y-1">
                      {geocodingReport.failedPlaces
                        .sort()
                        .map((place, index) => (
                          <li key={index} className="text-sm text-gray-700">
                            {place}
                          </li>
                        ))}
                    </ul>
                  </div>
                </div>
              )}

              <div className="mt-4 text-sm text-gray-500">
                <p>
                  Failed places could not be geocoded due to unclear or
                  historical place names. You may want to manually review these
                  locations.
                </p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
