"use client";

import { Button } from "@/components/ui/button";
import { EventType } from "@/app/utils/types";

interface EventTypeFilterProps {
  selectedTypes: EventType[];
  onChangeAction: (types: EventType[]) => void;
}

export function EventTypeFilter({
  selectedTypes,
  onChangeAction,
}: EventTypeFilterProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Event Types</label>
      <div className="flex gap-2">
        <Button
          size="sm"
          variant={selectedTypes.includes("BIRT") ? "default" : "outline"}
          onClick={() => {
            onChangeAction(
              selectedTypes.includes("BIRT")
                ? selectedTypes.filter((t) => t !== "BIRT")
                : [...selectedTypes, "BIRT"]
            );
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
          variant={selectedTypes.includes("DEAT") ? "default" : "outline"}
          onClick={() => {
            onChangeAction(
              selectedTypes.includes("DEAT")
                ? selectedTypes.filter((t) => t !== "DEAT")
                : [...selectedTypes, "DEAT"]
            );
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
          variant={selectedTypes.includes("RESI") ? "default" : "outline"}
          onClick={() => {
            onChangeAction(
              selectedTypes.includes("RESI")
                ? selectedTypes.filter((t) => t !== "RESI")
                : [...selectedTypes, "RESI"]
            );
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
  );
}
