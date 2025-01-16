"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, ChevronLeft, ChevronRight, Plus, Minus, Info } from "lucide-react";
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
import { PersonCard } from "@/components/person/PersonCard";
import { GeocodingReport } from "@/components/dialogs/GeocodingReport";

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
    useState<GeocodingReportType | null>(null);
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
            setTemporaryHighlightAction={setTemporaryHighlight}
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
