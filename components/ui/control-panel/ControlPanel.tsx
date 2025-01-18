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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LayerControl } from "./LayerControl";

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
  isGeocoding: boolean;
  geocodingProgress: {
    processed: number;
    total: number;
    currentPlace: string;
    treeId: string;
  };
  onStartGeocoding: (treeId: string) => void;
  onCancelGeocoding: () => void;
  setAncestorFilterOpen: (open: boolean) => void;
  ancestorFilterOpen: boolean;
  showParishes: boolean;
  setShowParishes: (show: boolean) => void;
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
  isGeocoding,
  geocodingProgress,
  onStartGeocoding,
  onCancelGeocoding,
  setAncestorFilterOpen,
  ancestorFilterOpen,
  showParishes,
  setShowParishes,
}: ControlPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("trees");

  return (
    <div
      className={cn(
        "absolute top-4 right-4 z-[1000] transition-transform duration-200 bg-white rounded-lg shadow-lg",
        isCollapsed && "translate-x-[calc(100%-3rem)]"
      )}
    >
      <div className={cn("w-[350px] flex flex-col", isCollapsed && "hidden")}>
        <Tabs
          defaultValue="trees"
          value={activeTab}
          onValueChange={setActiveTab}
        >
          <TabsList className="w-full border-b">
            <TabsTrigger
              value="trees"
              className="flex-1 px-4 py-2 data-[state=active]:border-b-2 data-[state=active]:border-primary"
            >
              Trees
            </TabsTrigger>
            <TabsTrigger
              value="geocoding"
              className="flex-1 px-4 py-2 data-[state=active]:border-b-2 data-[state=active]:border-primary"
            >
              Places
            </TabsTrigger>
            <TabsTrigger
              value="filters"
              className="flex-1 px-4 py-2 data-[state=active]:border-b-2 data-[state=active]:border-primary"
            >
              Filters
            </TabsTrigger>
            <TabsTrigger
              value="layers"
              className="flex-1 px-4 py-2 data-[state=active]:border-b-2 data-[state=active]:border-primary"
            >
              Layers
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-[500px]">
              <div className="p-4 space-y-4">
                <TabsContent value="trees">
                  <FileUpload
                    isFirstTree={true}
                    treeColor="#4A90E2"
                    onFileUploadAction={setPeople}
                    onYearRangeUpdateAction={(minYear, maxYear) =>
                      setYearRange([minYear, maxYear])
                    }
                    onClearCacheAction={() => {
                      localStorage.removeItem("geocoding-cache");
                    }}
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
                </TabsContent>

                <TabsContent value="geocoding">
                  <GeocodingSection
                    isGeocoding={isGeocoding}
                    progress={geocodingProgress}
                    onStartAction={onStartGeocoding}
                    onCancelAction={onCancelGeocoding}
                  />
                </TabsContent>

                <TabsContent value="filters">
                  <EventTypeFilter
                    selectedTypes={selectedEventTypes}
                    onChangeAction={setSelectedEventTypes}
                  />

                  <YearRangeFilter
                    value={yearRange}
                    onChangeAction={setYearRange}
                  />

                  {rootPerson && (
                    <>
                      <RelationshipFilter
                        relationFilter={relationFilter}
                        onChangeAction={setRelationFilter}
                      />

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
                    </>
                  )}
                </TabsContent>

                <TabsContent value="layers">
                  <LayerControl
                    showParishes={showParishes}
                    onChangeAction={setShowParishes}
                  />
                </TabsContent>
              </div>
            </ScrollArea>
          </div>
        </Tabs>
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
