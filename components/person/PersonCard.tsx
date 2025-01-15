import { Person, Event } from "@/types/family-map";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LocationButton } from "../map/LocationButton";
import { X, Loader2 } from "lucide-react";

interface PersonCardProps {
  selectedPerson: { person: Person; event: Event } | null;
  onClose: () => void;
  onSetRoot: (personId: string) => void;
  onLocationClick: (coordinates: [number, number], zoom?: number) => void;
  rootPerson: string | null;
  isCalculating: boolean;
  people: Person[];
  getRelationship: (personId: string) => string | undefined;
}

export function PersonCard({
  selectedPerson,
  onClose,
  onSetRoot,
  onLocationClick,
  rootPerson,
  isCalculating,
  people,
  getRelationship,
}: PersonCardProps) {
  if (!selectedPerson) return null;

  const { person } = selectedPerson;

  return (
    <Card className="absolute bottom-12 left-4 p-4 max-w-md bg-white shadow-lg z-[1000] max-h-[50vh] overflow-y-auto">
      <div className="flex flex-col h-full">
        <div className="flex justify-between items-start sticky top-0 z-10 bg-white pb-2 border-b mb-4">
          <div className="bg-white">
            <h3 className="font-bold text-xl">{person.name}</h3>
            {getRelationship(person.id) && (
              <div className="text-sm text-blue-600">
                {getRelationship(person.id)}
              </div>
            )}
          </div>
          <div className="flex gap-2">
            {rootPerson !== person.id ? (
              <Button
                size="sm"
                onClick={() => onSetRoot(person.id)}
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
                onClick={() => onSetRoot(person.id)}
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
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          {/* Birth events */}
          {person.events
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
                  {event.coordinates[0] !== 0 && event.coordinates[1] !== 0 && (
                    <LocationButton
                      coordinates={event.coordinates}
                      onClick={() => onLocationClick(event.coordinates, 12)}
                    />
                  )}
                </div>
              </div>
            ))}

          {/* Death events */}
          {person.events
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
                  {event.coordinates[0] !== 0 && event.coordinates[1] !== 0 && (
                    <LocationButton
                      coordinates={event.coordinates}
                      onClick={() => onLocationClick(event.coordinates, 12)}
                    />
                  )}
                </div>
              </div>
            ))}

          {/* Parents section */}
          {person.parents.length > 0 && (
            <div className="bg-gray-50 p-3 rounded-lg">
              <h4 className="font-medium mb-2">Parents</h4>
              <div className="space-y-1">
                {person.parents.map((parentId) => {
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
                            onSetRoot(parent.id);
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
          {person.events.some((event) => event.type === "RESI") && (
            <div>
              <h4 className="font-medium mb-2">Places of Residence</h4>
              <div className="space-y-2">
                {person.events
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
                                onLocationClick(event.coordinates, 12)
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
          {person.children.length > 0 && (
            <div className="bg-gray-50 p-3 rounded-lg">
              <h4 className="font-medium mb-2">Children</h4>
              <div className="space-y-1">
                {person.children.map((childId) => {
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
                            onSetRoot(child.id);
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
  );
}
