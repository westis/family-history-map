import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { FileUpload } from "./FileUpload";
import { GeocodingSection } from "./GeocodingSection";
import { RootPersonDialog } from "./RootPersonDialog";
import { EventTypeFilter } from "./EventTypeFilter";
import { YearRangeFilter } from "./YearRangeFilter";
import { RelationshipFilter } from "./RelationshipFilter";
import { useState } from "react";
import { Person, EventType, RelationFilter } from "@/app/utils/types";

interface ControlPanelProps {
  people: Person[];
  setPeople: (people: Person[]) => void;
  yearRange: [number, number];
  setYearRange: (range: [number, number]) => void;
  selectedEventTypes: EventType[];
  setSelectedEventTypes: (types: EventType[]) => void;
  rootPerson: string | null;
  setRootPerson: (id: string | null) => void;
  relationFilter: RelationFilter;
  setRelationFilter: (filter: RelationFilter) => void;
  isCalculating: boolean;
  placesToGeocode: Set<string>;
  setPlacesToGeocode: (places: Set<string>) => void;
  isGeocoding: boolean;
  geocodingProgress: {
    processed: number;
    total: number;
    currentPlace: string;
  };
  onStartGeocoding: () => void;
  onCancelGeocoding: () => void;
  setAncestorFilterOpen: (open: boolean) => void;
  ancestorFilterOpen: boolean;
}

export function ControlPanel({
  people,
  setPeople,
  yearRange,
  setYearRange,
  selectedEventTypes,
  setSelectedEventTypes,
  rootPerson,
  setRootPerson,
  relationFilter,
  setRelationFilter,
  isCalculating,
  placesToGeocode,
  setPlacesToGeocode,
  isGeocoding,
  geocodingProgress,
  onStartGeocoding,
  onCancelGeocoding,
  setAncestorFilterOpen,
  ancestorFilterOpen,
}: ControlPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  return (
    <div
      className={cn(
        "absolute top-4 right-4 z-[1000] transition-transform duration-200",
        isCollapsed
          ? "translate-x-[calc(100%-3rem)]"
          : "bg-white rounded-lg shadow-lg"
      )}
    >
      <div className={cn("p-4", isCollapsed ? "hidden" : "")}>
        <div className="space-y-6">
          <FileUpload
            onUploadAction={setPeople}
            onYearRangeUpdateAction={(minYear, maxYear) =>
              setYearRange([minYear, maxYear])
            }
            onClearCacheAction={() => {
              if (typeof window !== "undefined") {
                localStorage.removeItem("geocoding-cache");
                console.log("Geocoding cache cleared");
              }
            }}
            setPlacesToGeocodeAction={setPlacesToGeocode}
          />

          <GeocodingSection
            placesToGeocode={placesToGeocode}
            isGeocoding={isGeocoding}
            progress={geocodingProgress}
            onStartAction={onStartGeocoding}
            onCancelAction={onCancelGeocoding}
          />

          <RootPersonDialog
            open={dialogOpen}
            onOpenChangeAction={setDialogOpen}
            rootPerson={rootPerson}
            people={people}
            isCalculating={isCalculating}
            searchTerm={searchTerm}
            onSearchChangeAction={setSearchTerm}
            onSelectPersonAction={setRootPerson}
          />

          <EventTypeFilter
            selectedTypes={selectedEventTypes}
            onChangeAction={setSelectedEventTypes}
          />

          <YearRangeFilter value={yearRange} onChangeAction={setYearRange} />

          {rootPerson && (
            <RelationshipFilter
              relationFilter={relationFilter}
              onChangeAction={setRelationFilter}
            />
          )}

          {rootPerson && (
            <div className="space-y-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setAncestorFilterOpen(true)}
                className={cn(
                  "w-full",
                  ancestorFilterOpen && "bg-blue-50 text-blue-600"
                )}
              >
                Ancestor Numbers Filter
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className={cn("border-t", isCollapsed ? "hidden" : "")}>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-full h-8 rounded-none hover:bg-gray-50"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {isCollapsed && (
        <Button
          variant="outline"
          size="lg"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -left-10 top-0 h-10 w-10 bg-white shadow-lg rounded-l-lg border-r-0 flex items-center justify-center"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
      )}
    </div>
  );
}
