export interface Event {
  type: "BIRT" | "DEAT" | "RESI";
  date: {
    year: number | null;
    month?: number;
    day?: number;
  };
  place: string;
  coordinates: [number, number];
}

export interface Person {
  id: string;
  name: string;
  events: Event[];
}

export type EventType = "BIRT" | "DEAT" | "RESI";
export type RelationFilter = "all" | "ancestors" | "descendants";
