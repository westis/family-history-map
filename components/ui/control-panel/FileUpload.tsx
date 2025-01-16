"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { FileUp } from "lucide-react";
import { Person } from "@/app/utils/types";
import { parseGEDCOM } from "@/app/utils/gedcom";

interface FileUploadProps {
  onUploadAction: (people: Person[]) => void;
  onYearRangeUpdateAction: (minYear: number, maxYear: number) => void;
  onClearCacheAction: () => void;
}

export function FileUpload({
  onUploadAction,
  onYearRangeUpdateAction,
  onClearCacheAction,
}: FileUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) {
      console.log("No file selected");
      return;
    }

    console.log("File selected:", file.name);

    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        const parsedPeople = await parseGEDCOM(content);

        // Update parent component with parsed data
        onUploadAction(parsedPeople);

        // Calculate year range from the data
        const years = parsedPeople.flatMap((p) =>
          p.events
            .map((e) => e.date.year)
            .filter((y): y is number => y !== null)
        );

        if (years.length) {
          const minYear = Math.min(...years);
          const maxYear = Math.max(...years);
          onYearRangeUpdateAction(minYear, maxYear);
        }
      } catch (error) {
        console.error("Error parsing GEDCOM:", error);
      }
    };

    reader.onerror = (error) => {
      console.error("Error reading file:", error);
    };

    reader.readAsText(file);
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div>
      <label className="block">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          accept=".ged"
          className="hidden"
        />
        <div className="flex gap-2">
          <Button onClick={handleUploadClick}>
            <FileUp className="w-4 h-4 mr-2" />
            Upload GEDCOM
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
    </div>
  );
}
