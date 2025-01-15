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

export type EventType = "BIRT" | "DEAT" | "RESI";
export type RelationFilter = "all" | "ancestors" | "descendants";
