import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Person,
  Event,
  LocationPerson,
  RelationshipInfo,
} from "@/app/utils/types";
import { LocationButton } from "../map/LocationButton";

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

export function PersonCard({
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
  if (!selectedPerson) return null;

  const getRelationship = (personId: string) => relationships.get(personId);

  return (
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
          {/* Add back Parents section */}
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

          {/* Birth Events */}
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
                  {event.coordinates[0] !== 0 && event.coordinates[1] !== 0 && (
                    <LocationButton
                      coordinates={event.coordinates}
                      onClick={() => handleLocationClick(event.coordinates, 12)}
                    />
                  )}
                </div>
              </div>
            ))}

          {/* Death Events */}
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
                  {event.coordinates[0] !== 0 && event.coordinates[1] !== 0 && (
                    <LocationButton
                      coordinates={event.coordinates}
                      onClick={() => handleLocationClick(event.coordinates, 12)}
                    />
                  )}
                </div>
              </div>
            ))}

          {/* Residence Events */}
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

          {/* Add back Children section */}
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
  );
}
