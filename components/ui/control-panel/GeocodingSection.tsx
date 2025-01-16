"use client";

import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface GeocodingProgress {
  processed: number;
  total: number;
  currentPlace: string;
}

interface GeocodingSectionProps {
  placesToGeocode: Set<string>;
  isGeocoding: boolean;
  progress: GeocodingProgress;
  onStartAction: () => void;
  onCancelAction: () => void;
}

export function GeocodingSection({
  placesToGeocode,
  isGeocoding,
  progress,
  onStartAction,
  onCancelAction,
}: GeocodingSectionProps) {
  if (placesToGeocode.size === 0) return null;

  return (
    <div className="space-y-2">
      <Button onClick={onStartAction} disabled={isGeocoding} className="w-full">
        {isGeocoding ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
        Geocode {placesToGeocode.size} places
      </Button>

      {/* Progress indicator */}
      {isGeocoding && (
        <div className="space-y-2 p-2 bg-gray-50 rounded-md">
          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all duration-300"
              style={{
                width: `${(progress.processed / progress.total) * 100}%`,
              }}
            />
          </div>
          <div className="text-xs space-y-1">
            <div className="text-gray-600">
              Processing {progress.processed} of {progress.total} places
            </div>
            {progress.currentPlace && (
              <div className="text-gray-500 truncate">
                {progress.currentPlace}
              </div>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onCancelAction}
            className="w-full"
          >
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}
