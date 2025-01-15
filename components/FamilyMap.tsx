"use client";

import React, { useState, useRef, useEffect } from "react";
import { MapContainer, TileLayer } from "react-leaflet";
import { MarkerLayer } from "./map/MarkerLayer";
import { MapController } from "./map/MapController";
import { PersonCard } from "./person/PersonCard";
import { Button } from "@/components/ui/button";
import { FileUp, Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { RangeSlider } from "@/components/ui/range-slider";
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
import { useFamilyMap } from "@/contexts/FamilyMapContext";

export default function FamilyMap() {
  const {
    people,
    setPeople,
    yearRange,
    setYearRange,
    selectedEventTypes,
    setSelectedEventTypes,
    relationFilter,
    setRelationFilter,
    rootPerson,
    setRootPerson,
    isCalculating,
    setIsCalculating,
    relationships,
    setRelationships,
  } = useFamilyMap();

  const [selectedPerson, setSelectedPerson] = useState<{
    person: Person;
    event: Event;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [zoomToLocation, setZoomToLocation] = useState<{
    coordinates: [number, number];
    zoom?: number;
  } | null>(null);
  const [activeCoordinates, setActiveCoordinates] = useState<
    [number, number] | null
  >(null);

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const parsedPeople = parseGEDCOM(content);
      setPeople(parsedPeople);

      const years = parsedPeople.flatMap((p) =>
        p.events.map((e) => e.date.year).filter((y): y is number => y !== null)
      );

      if (years.length) {
        const minYear = Math.min(...years);
        const maxYear = Math.max(...years);
        setYearRange([minYear, maxYear]);
      }
    };

    reader.readAsText(file);
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  useEffect(() => {
    if (rootPerson && people.length > 0) {
      setIsCalculating(true);
      const calculateAsync = async () => {
        try {
          await new Promise((resolve) => setTimeout(resolve, 0));
          const newRelationships = calculateRelationships(people, rootPerson);
          setRelationships(newRelationships);
          setRelationFilter("all");
        } finally {
          setIsCalculating(false);
        }
      };
      calculateAsync();
    } else {
      setRelationships(new Map());
    }
  }, [
    rootPerson,
    people,
    setIsCalculating,
    setRelationships,
    setRelationFilter,
  ]);

  const filteredEvents = React.useMemo(() => {
    return people.flatMap((person) => {
      if (rootPerson && relationFilter !== "all") {
        const relationship = relationships.get(person.id);
        if (!relationship || relationship === "Not Related") return [];
        if (relationship === "Root Person") return [];

        if (relationFilter === "ancestors") {
          const hasChildCodes = /[sd]/.test(relationship);
          const hasParentCodes = /[fm]/.test(relationship);
          if (hasChildCodes || !hasParentCodes) return [];
        }

        if (relationFilter === "descendants") {
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

  const filteredPeople = React.useMemo(() => {
    if (!searchTerm) return people;
    const searchTerms = searchTerm.toLowerCase().trim().split(/\s+/);
    return people
      .filter((person) => {
        const name = person.name.toLowerCase();
        return searchTerms.every((term) => name.includes(term));
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [people, searchTerm]);

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

  const handleYearRangeChange = (value: number[]) => {
    setYearRange([value[0], value[1]] as [number, number]);
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
            onValueChange={handleYearRangeChange}
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
                setSelectedEventTypes((prev) => {
                  if (prev.includes("BIRT")) {
                    return prev.filter((t) => t !== "BIRT");
                  }
                  return [...prev, "BIRT"];
                });
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
                setSelectedEventTypes((prev) => {
                  if (prev.includes("DEAT")) {
                    return prev.filter((t) => t !== "DEAT");
                  }
                  return [...prev, "DEAT"];
                });
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
                setSelectedEventTypes((prev) => {
                  if (prev.includes("RESI")) {
                    return prev.filter((t) => t !== "RESI");
                  }
                  return [...prev, "RESI"];
                });
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
        <MapContainer
          center={[56.85, 14]}
          zoom={7}
          className="h-full w-full"
          zoomControl={true}
          minZoom={3}
          maxZoom={18}
        >
          <TileLayer
            attribution='<a href="https://www.maptiler.com/copyright/" target="_blank">&copy; MapTiler</a> <a href="https://www.openstreetmap.org/copyright" target="_blank">&copy; OpenStreetMap contributors</a>'
            url={`https://api.maptiler.com/maps/topo/256/{z}/{x}/{y}.png?key=${process.env.NEXT_PUBLIC_MAPTILER_API_KEY}`}
            maxZoom={19}
            tileSize={256}
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
        <PersonCard
          selectedPerson={selectedPerson}
          onClose={() => setSelectedPerson(null)}
          onSetRoot={setRootPerson}
          onLocationClick={handleLocationClick}
          rootPerson={rootPerson}
          isCalculating={isCalculating}
          people={people}
          getRelationship={(id) => relationships.get(id)}
        />
      )}
    </div>
  );
}
