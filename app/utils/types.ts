export interface Event {
  type: EventType;
  date: {
    year: number | null;
    month: number | null;
    day: number | null;
  };
  place: string;
  coordinates: [number, number];
  treeId: string;
}

export interface Person {
  id: string;
  name: string;
  sex: "M" | "F" | null;
  events: Event[];
  parents: string[];
  children: string[];
  spouses: string[];
  relationship?: string;
  treeId: string;
}

export interface AncestorInfo {
  numbers: number[];
  name: string;
  birthYear?: number;
  deathYear?: number;
  selected?: boolean;
}

export interface AncestorFilter {
  showAncestorNumbers: boolean;
  selectedAncestors: Set<number>;
}

export interface RelationshipInfo {
  relationship: string;
  type: "ancestor" | "descendant" | "root" | "none";
}

export interface GeocodingReport {
  failedPlaces: string[];
  totalAttempted: number;
  successCount: number;
}

export interface LocationPerson {
  person: Person;
  events: Event[];
}

export type EventType = "BIRT" | "DEAT" | "RESI";
export type RelationFilter = "all" | "ancestors" | "descendants";

export interface GeoJSONFeature {
  type: "Feature";
  properties: {
    name: string;
    [key: string]: string | number | boolean | null;
  };
  geometry: {
    type: "Polygon" | "MultiPolygon";
    coordinates: number[][][] | number[][][][];
  };
}

export interface GeoJSONCollection {
  type: "FeatureCollection";
  features: GeoJSONFeature[];
}

export interface EventWithTree extends Event {
  treeId: string;
  treeColor: string;
}

export interface PersonWithTree extends Person {
  treeId: string;
}

export interface FilteredEvent {
  person: PersonWithTree;
  event: EventWithTree;
}
