import { MapContainer, TileLayer } from "react-leaflet";
import { Button } from "@/components/ui/button";
import { Plus, Minus } from "lucide-react";
import { useRef, useMemo } from "react";
import L from "leaflet";
import { MarkerLayer } from "./MarkerLayer";
import { MapController } from "./MapController";
import {
  Person,
  Event,
  RelationshipInfo,
  AncestorFilter,
  FilteredEvent,
  PersonWithTree,
  EventWithTree,
} from "@/app/utils/types";
import { useTrees } from "@/contexts/TreeContext";

const tileLayerUrl = `https://api.maptiler.com/maps/topo/256/{z}/{x}/{y}.png?key=PWo9ydkPHrwquRTjQYKg`;

interface MapViewProps {
  events: { person: Person; event: Event }[];
  onSelectPerson: (person: Person, event: Event) => void;
  activeCoordinates: [number, number] | null;
  rootPerson: string | null;
  relationships: Map<string, RelationshipInfo>;
  temporaryHighlight: {
    personId: string;
    type: "ancestors" | "descendants" | "both" | null;
  } | null;
  setTemporaryHighlight: (
    highlight: {
      personId: string;
      type: "ancestors" | "descendants" | "both" | null;
    } | null
  ) => void;
  ahnentafelNumbers: Map<string, number[]>;
  ancestorFilter: AncestorFilter;
  zoomToLocation: { coordinates: [number, number]; zoom?: number } | null;
}

export function MapView({
  events,
  onSelectPerson,
  activeCoordinates,
  rootPerson,
  relationships,
  temporaryHighlight,
  setTemporaryHighlight,
  ahnentafelNumbers,
  ancestorFilter,
  zoomToLocation,
}: MapViewProps) {
  const mapRef = useRef<L.Map | null>(null);
  const { trees } = useTrees();

  const filteredEvents = useMemo<FilteredEvent[]>(() => {
    return events.map(({ person, event }) => {
      const tree = trees.find((t) => t.id === person.treeId);

      const personWithTree: PersonWithTree = {
        ...person,
        treeId: person.treeId,
      };

      const eventWithTree: EventWithTree = {
        ...event,
        treeId: person.treeId,
        treeColor: tree?.color || "#666666",
      };

      return {
        person: personWithTree,
        event: eventWithTree,
      };
    });
  }, [events, trees]);

  return (
    <>
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

      <MapContainer
        center={[56.85, 14]}
        zoom={7}
        className="h-full w-full"
        ref={mapRef}
        zoomControl={false}
      >
        <TileLayer
          attribution='<a href="https://www.maptiler.com/copyright/" target="_blank">&copy; MapTiler</a> <a href="https://www.openstreetmap.org/copyright" target="_blank">&copy; OpenStreetMap contributors</a>'
          url={tileLayerUrl}
          maxZoom={19}
          tileSize={256}
        />
        <MarkerLayer
          events={filteredEvents}
          onSelectAction={onSelectPerson}
          activeCoordinates={activeCoordinates}
          rootPerson={rootPerson}
          relationships={relationships}
          temporaryHighlight={temporaryHighlight}
          setTemporaryHighlightAction={setTemporaryHighlight}
          ahnentafelNumbers={ahnentafelNumbers}
          ancestorFilter={ancestorFilter}
        />
        <MapController
          coordinates={zoomToLocation?.coordinates || null}
          zoom={zoomToLocation?.zoom}
        />
      </MapContainer>
    </>
  );
}
