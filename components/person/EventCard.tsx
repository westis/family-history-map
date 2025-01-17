import { cn } from "@/lib/utils";
import { Event } from "@/app/utils/types";
import { LocationButton } from "../map/LocationButton";

interface EventCardProps {
  event: Event;
  type: "Birth" | "Death" | "Residence";
  isSelected: boolean;
  handleLocationClick: (coordinates: [number, number], zoom?: number) => void;
}

export function EventCard({
  event,
  type,
  isSelected,
  handleLocationClick,
}: EventCardProps) {
  return (
    <div
      className={cn(
        "p-3 rounded-lg border transition-colors",
        isSelected
          ? "bg-blue-100 border-blue-300 shadow-sm"
          : "hover:bg-gray-50 border-transparent"
      )}
    >
      <div className="font-medium text-blue-900">{type}</div>
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
  );
}
