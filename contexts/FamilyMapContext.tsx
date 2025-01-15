"use client";

import {
  createContext,
  useContext,
  useState,
  ReactNode,
  Dispatch,
  SetStateAction,
} from "react";
import { Person, EventType, RelationFilter } from "@/types/family-map";

interface FamilyMapContextType {
  people: Person[];
  setPeople: Dispatch<SetStateAction<Person[]>>;
  yearRange: [number, number];
  setYearRange: Dispatch<SetStateAction<[number, number]>>;
  selectedEventTypes: EventType[];
  setSelectedEventTypes: Dispatch<SetStateAction<EventType[]>>;
  relationFilter: RelationFilter;
  setRelationFilter: Dispatch<SetStateAction<RelationFilter>>;
  rootPerson: string | null;
  setRootPerson: Dispatch<SetStateAction<string | null>>;
  isCalculating: boolean;
  setIsCalculating: Dispatch<SetStateAction<boolean>>;
  relationships: Map<string, string>;
  setRelationships: Dispatch<SetStateAction<Map<string, string>>>;
}

const FamilyMapContext = createContext<FamilyMapContextType | undefined>(
  undefined
);

export function FamilyMapProvider({ children }: { children: ReactNode }) {
  const [people, setPeople] = useState<Person[]>([]);
  const [yearRange, setYearRange] = useState<[number, number]>([1800, 2024]);
  const [selectedEventTypes, setSelectedEventTypes] = useState<EventType[]>([
    "BIRT",
    "DEAT",
    "RESI",
  ]);
  const [relationFilter, setRelationFilter] = useState<RelationFilter>("all");
  const [rootPerson, setRootPerson] = useState<string | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [relationships, setRelationships] = useState<Map<string, string>>(
    new Map()
  );

  const value = {
    people,
    setPeople,
    yearRange,
    setYearRange,
    selectedEventTypes,
    setSelectedEventTypes,
    relationFilter,
    setRelationFilter,
    rootPerson,
    setRootPerson,
    isCalculating,
    setIsCalculating,
    relationships,
    setRelationships,
  };

  return (
    <FamilyMapContext.Provider value={value}>
      {children}
    </FamilyMapContext.Provider>
  );
}

export function useFamilyMap() {
  const context = useContext(FamilyMapContext);
  if (context === undefined) {
    throw new Error("useFamilyMap must be used within a FamilyMapProvider");
  }
  return context;
}
