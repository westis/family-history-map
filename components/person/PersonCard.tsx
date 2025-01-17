import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import {
  Person,
  Event,
  LocationPerson,
  RelationshipInfo,
} from "@/app/utils/types";
import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";

interface PersonCardProps {
  selectedPerson: { person: Person; event: Event } | null;
  locationPeople: LocationPerson[];
  currentLocationIndex: number;
  setCurrentLocationIndex: (index: number) => void;
  setSelectedPerson: (value: { person: Person; event: Event } | null) => void;
  setLocationPeople: (people: LocationPerson[]) => void;
  handleLocationClick: (
    coordinates: [number, number],
    currentZoom?: number
  ) => void;
  rootPerson: string | null;
  setRootPerson: (id: string | null) => void;
  isCalculating: boolean;
  relationships: Map<string, RelationshipInfo>;
  people: Person[];
}

// Update PersonCardHeader props to include setLocationPeople
interface PersonCardHeaderProps {
  person: Person;
  locationPeople: LocationPerson[];
  currentLocationIndex: number;
  setCurrentLocationIndex: (index: number) => void;
  setSelectedPerson: (value: { person: Person; event: Event } | null) => void;
  setLocationPeople: (people: LocationPerson[]) => void;
  relationship?: RelationshipInfo;
  rootPerson: string | null;
  setRootPerson: (id: string | null) => void;
  isCalculating: boolean;
}

const PersonCardHeader = React.memo(function PersonCardHeader({
  person,
  locationPeople,
  currentLocationIndex,
  setCurrentLocationIndex,
  setSelectedPerson,
  setLocationPeople,
  relationship,
  rootPerson,
  setRootPerson,
  isCalculating,
}: PersonCardHeaderProps) {
  return (
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
              {person.name}
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
          {relationship?.relationship && (
            <div className="text-sm font-medium text-blue-600">
              {relationship?.relationship}
            </div>
          )}
          <div className="ml-auto">
            {rootPerson !== person.id ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setRootPerson(person.id)}
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
  );
});

// Update dynamic imports to use absolute paths
const EventSection = dynamic(() => import("@/components/person/EventSection"), {
  loading: () => <div className="animate-pulse h-20 bg-gray-100 rounded-lg" />,
});

const RelativesSection = dynamic(
  () => import("@/components/person/RelativesSection"),
  {
    loading: () => (
      <div className="animate-pulse h-20 bg-gray-100 rounded-lg" />
    ),
  }
);

const PersonCard = React.memo(function PersonCard({
  selectedPerson,
  locationPeople,
  currentLocationIndex,
  setCurrentLocationIndex,
  setSelectedPerson,
  setLocationPeople,
  handleLocationClick,
  rootPerson,
  setRootPerson,
  isCalculating,
  relationships,
  people,
}: PersonCardProps) {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (selectedPerson) {
      setIsLoading(true);
      // Use requestIdleCallback if available, otherwise setTimeout
      const scheduleRender =
        window.requestIdleCallback || ((cb) => setTimeout(cb, 0));
      scheduleRender(() => {
        setIsLoading(false);
      });
    }
  }, [selectedPerson]);

  const sortedEvents = React.useMemo(() => {
    if (!selectedPerson) return null;
    const events = [...selectedPerson.person.events];
    return {
      birthEvents: events.filter((e) => e.type === "BIRT"),
      deathEvents: events.filter((e) => e.type === "DEAT"),
      residenceEvents: events
        .filter((e) => e.type === "RESI")
        .sort((a, b) => {
          if (a.date.year === null) return 1;
          if (b.date.year === null) return -1;
          return a.date.year - b.date.year;
        }),
    };
  }, [selectedPerson]);

  if (!selectedPerson || !sortedEvents) return null;

  const relationship = relationships.get(selectedPerson.person.id);

  return (
    <Card className="person-card absolute left-0 top-0 bg-white shadow-lg z-[1000] overflow-y-auto rounded-none min-h-[300px] max-h-[calc(100vh-2rem)] w-[400px]">
      {isLoading ? (
        <div className="p-4 space-y-4">
          <div className="animate-pulse h-8 bg-gray-100 rounded w-3/4" />
          <div className="animate-pulse h-20 bg-gray-100 rounded" />
          <div className="animate-pulse h-20 bg-gray-100 rounded" />
        </div>
      ) : (
        <div className="flex flex-col h-full">
          <PersonCardHeader
            person={selectedPerson.person}
            locationPeople={locationPeople}
            currentLocationIndex={currentLocationIndex}
            setCurrentLocationIndex={setCurrentLocationIndex}
            setSelectedPerson={setSelectedPerson}
            setLocationPeople={setLocationPeople}
            relationship={relationship}
            rootPerson={rootPerson}
            setRootPerson={setRootPerson}
            isCalculating={isCalculating}
          />

          <div className="space-y-4 px-4 pb-4">
            {sortedEvents && (
              <>
                <EventSection
                  events={sortedEvents}
                  selectedEvent={selectedPerson.event}
                  handleLocationClick={handleLocationClick}
                />

                <RelativesSection
                  person={selectedPerson.person}
                  people={people}
                  setSelectedPerson={setSelectedPerson}
                />
              </>
            )}
          </div>
        </div>
      )}
    </Card>
  );
});

export default React.memo(PersonCard, (prevProps, nextProps) => {
  return (
    prevProps.selectedPerson === nextProps.selectedPerson &&
    prevProps.locationPeople === nextProps.locationPeople &&
    prevProps.currentLocationIndex === nextProps.currentLocationIndex &&
    prevProps.rootPerson === nextProps.rootPerson &&
    prevProps.isCalculating === nextProps.isCalculating &&
    prevProps.relationships === nextProps.relationships &&
    prevProps.people === nextProps.people
  );
});
