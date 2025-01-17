"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { FileUp } from "lucide-react";
import { Person } from "@/app/utils/types";
import { parseGEDCOM } from "@/app/utils/gedcom";

interface FileUploadProps {
  isFirstTree: boolean;
  onUploadAction: (
    people: Person[],
    placesToGeocode: Set<string>,
    isMain: boolean
  ) => void;
  onYearRangeUpdateAction: (minYear: number, maxYear: number) => void;
  onClearCacheAction: () => void;
}

export function FileUpload({
  isFirstTree,
  onUploadAction,
  onYearRangeUpdateAction,
  onClearCacheAction,
}: FileUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [needsGeocoding, setNeedsGeocoding] = useState(false);

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const people = await parseGEDCOM(text);

      // Collect all unique places that need geocoding
      const placesToGeocode = new Set<string>();
      const years: number[] = [];
      let hasValidCoordinates = false;

      people.forEach((person) => {
        person.events.forEach((event) => {
          if (event.place !== "Unknown") {
            if (event.coordinates[0] === 0 && event.coordinates[1] === 0) {
              placesToGeocode.add(event.place);
            } else {
              // If we have at least one event with valid coordinates, we'll show markers
              hasValidCoordinates = true;
            }
          }
          if (event.date.year !== null) {
            years.push(event.date.year);
          }
        });
      });

      setNeedsGeocoding(placesToGeocode.size > 0);
      onUploadAction(people, placesToGeocode, isFirstTree);

      if (years.length) {
        const minYear = Math.min(...years);
        const maxYear = Math.max(...years);
        onYearRangeUpdateAction(minYear, maxYear);
      }

      // If we have valid coordinates, clear the file input to allow re-uploading the same file
      if (hasValidCoordinates) {
        event.target.value = "";
      }
    } catch (error) {
      console.error("Error parsing GEDCOM:", error);
    }
  };

  return (
    <div className="space-y-2">
      <label className="block">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          accept=".ged"
          className="hidden"
        />
        <div className="flex gap-2">
          <Button onClick={() => fileInputRef.current?.click()}>
            <FileUp className="w-4 h-4 mr-2" />
            {isFirstTree ? "Upload Main Tree" : "Add Comparison Tree"}
          </Button>
          <Button
            variant="outline"
            onClick={onClearCacheAction}
            title="Clear cached geocoding results"
          >
            Clear Cache
          </Button>
        </div>
      </label>
      {needsGeocoding && (
        <p className="text-sm text-amber-600">
          Some places need geocoding. Check the Geocoding section below to add
          coordinates.
        </p>
      )}
    </div>
  );
}
