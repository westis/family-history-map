import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FilteredEvent, Person } from "@/app/utils/types";

interface TreeOverlapsProps {
  events: FilteredEvent[];
  onSelectLocation: (coordinates: [number, number], zoom?: number) => void;
  trees: Array<{
    id: string;
    color: string;
    isMain: boolean;
    people: Person[];
  }>;
}

interface Overlap {
  mainTreeEvent: FilteredEvent;
  matchingEvents: FilteredEvent[];
  distance: number;
  yearDiff: number;
}

export function TreeOverlaps({
  events,
  onSelectLocation,
  trees,
}: TreeOverlapsProps) {
  const overlaps = React.useMemo(() => {
    const mainTreeEvents = events.filter(
      (e) => trees.find((t) => t.id === e.person.treeId)?.isMain
    );
    const otherTreeEvents = events.filter(
      (e) => !trees.find((t) => t.id === e.person.treeId)?.isMain
    );

    const foundOverlaps: Overlap[] = [];

    mainTreeEvents.forEach((mainEvent) => {
      otherTreeEvents.forEach((otherEvent) => {
        const distance = calculateDistance(
          mainEvent.event.coordinates,
          otherEvent.event.coordinates
        );

        const yearDiff = Math.abs(
          (mainEvent.event.date.year || 0) - (otherEvent.event.date.year || 0)
        );

        if (distance <= 50 && yearDiff <= 20) {
          // Check if we already have an overlap for this location
          const existingOverlap = foundOverlaps.find(
            (o) =>
              o.mainTreeEvent.event.coordinates[0] ===
                mainEvent.event.coordinates[0] &&
              o.mainTreeEvent.event.coordinates[1] ===
                mainEvent.event.coordinates[1]
          );

          if (existingOverlap) {
            existingOverlap.matchingEvents.push(otherEvent);
          } else {
            foundOverlaps.push({
              mainTreeEvent: mainEvent,
              matchingEvents: [otherEvent],
              distance,
              yearDiff,
            });
          }
        }
      });
    });

    return foundOverlaps.sort((a, b) => a.distance - b.distance);
  }, [events, trees]);

  if (overlaps.length === 0) {
    return null;
  }

  return (
    <Card className="absolute bottom-4 left-4 z-[1000] p-4 max-w-md max-h-[60vh] overflow-y-auto">
      <h3 className="font-medium mb-2">
        Potential Overlaps Found ({overlaps.length})
      </h3>
      <div className="space-y-4">
        {overlaps.map((overlap, index) => (
          <div key={index} className="border-t pt-2">
            <div className="flex justify-between">
              <Button
                variant="link"
                onClick={() =>
                  onSelectLocation(overlap.mainTreeEvent.event.coordinates, 14)
                }
              >
                {overlap.mainTreeEvent.person.name} -{" "}
                {overlap.mainTreeEvent.event.place}
              </Button>
              <span className="text-sm text-gray-500">
                {overlap.mainTreeEvent.event.date.year}
              </span>
            </div>
            <div className="ml-4 space-y-1">
              {overlap.matchingEvents.map((match, idx) => (
                <div key={idx} className="flex justify-between text-sm">
                  <span>
                    {match.person.name} - {match.event.place}
                  </span>
                  <span className="text-gray-500">{match.event.date.year}</span>
                </div>
              ))}
              <div className="text-xs text-gray-500">
                {overlap.distance.toFixed(1)}km apart, {overlap.yearDiff} years
                difference
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function calculateDistance(
  coord1: [number, number],
  coord2: [number, number]
): number {
  const R = 6371; // Earth's radius in km
  const lat1 = (coord1[0] * Math.PI) / 180;
  const lat2 = (coord2[0] * Math.PI) / 180;
  const dLat = ((coord2[0] - coord1[0]) * Math.PI) / 180;
  const dLon = ((coord2[1] - coord1[1]) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
