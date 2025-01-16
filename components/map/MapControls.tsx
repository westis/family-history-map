"use client";

import { Button } from "@/components/ui/button";
import { Plus, Minus } from "lucide-react";
import { Map } from "leaflet";

interface MapControlsProps {
  mapRef: React.RefObject<Map | null>;
}

export function MapControls({ mapRef }: MapControlsProps) {
  return (
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
  );
}
