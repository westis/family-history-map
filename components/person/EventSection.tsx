import { Event } from "@/app/utils/types";
import { EventCard } from "./EventCard";

export default function EventSection({
  events,
  selectedEvent,
  handleLocationClick,
}: {
  events: {
    birthEvents: Event[];
    deathEvents: Event[];
    residenceEvents: Event[];
  };
  selectedEvent: Event;
  handleLocationClick: (coordinates: [number, number], zoom?: number) => void;
}) {
  // Helper function to check if two events are the same
  const isSameEvent = (a: Event, b: Event) => {
    return (
      a.type === b.type &&
      a.place === b.place &&
      a.coordinates[0] === b.coordinates[0] &&
      a.coordinates[1] === b.coordinates[1] &&
      a.date.from === b.date.from &&
      a.date.to === b.date.to
    );
  };

  return (
    <>
      {/* Birth Events */}
      {events.birthEvents.map((event, index) => (
        <EventCard
          key={`birth-${index}`}
          event={event}
          type="Birth"
          isSelected={isSameEvent(event, selectedEvent)}
          handleLocationClick={handleLocationClick}
        />
      ))}

      {/* Death Events */}
      {events.deathEvents.map((event, index) => (
        <EventCard
          key={`death-${index}`}
          event={event}
          type="Death"
          isSelected={isSameEvent(event, selectedEvent)}
          handleLocationClick={handleLocationClick}
        />
      ))}

      {/* Residence Events */}
      {events.residenceEvents.length > 0 && (
        <div>
          <h4 className="font-medium mb-2">Places of Residence</h4>
          <div className="space-y-2">
            {events.residenceEvents.map((event, index) => (
              <EventCard
                key={`residence-${index}`}
                event={event}
                type="Residence"
                isSelected={isSameEvent(event, selectedEvent)}
                handleLocationClick={handleLocationClick}
              />
            ))}
          </div>
        </div>
      )}
    </>
  );
}
