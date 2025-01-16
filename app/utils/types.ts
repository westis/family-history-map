export interface Event {
  type: "BIRT" | "DEAT" | "RESI";
  date: {
    from?: string;
    to?: string;
    year: number | null;
  };
  place: string;
  coordinates: [number, number];
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
