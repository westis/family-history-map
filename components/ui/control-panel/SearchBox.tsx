import React, { useState, useRef, useEffect } from "react";
import { Search } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Person, Event } from "@/app/utils/types";

interface SearchResult {
  type: "person" | "location";
  text: string;
  person?: Person;
  location?: {
    place: string;
    coordinates: [number, number];
    events: Array<{
      person: Person;
      event: Event;
    }>;
  };
}

interface SearchBoxProps {
  people: Person[];
  onSelectPerson: (person: Person) => void;
  onSelectLocation: (coordinates: [number, number], zoom?: number) => void;
}

// First, let's get the birth/death years from events
const getBirthYear = (person: Person): number | null => {
  const birthEvent = person.events.find((e) => e.type === "BIRT");
  return birthEvent?.date.year || null;
};

const getDeathYear = (person: Person): number | null => {
  const deathEvent = person.events.find((e) => e.type === "DEAT");
  return deathEvent?.date.year || null;
};

export function SearchBox({
  people,
  onSelectPerson,
  onSelectLocation,
}: SearchBoxProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const search = (term: string) => {
    setSearchTerm(term);
    if (!term.trim()) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    const searchResults: SearchResult[] = [];
    const locationMap = new Map<
      string,
      {
        coordinates: [number, number];
        events: Array<{ person: Person; event: Event }>;
      }
    >();

    // Search for people
    const matchingPeople = people.filter((person) => {
      const birthYear = getBirthYear(person);
      const deathYear = getDeathYear(person);

      return (
        person.name.toLowerCase().includes(term.toLowerCase()) ||
        (birthYear?.toString() || "").includes(term) ||
        (deathYear?.toString() || "").includes(term)
      );
    });

    matchingPeople.forEach((person) => {
      const birthYear = getBirthYear(person);
      const deathYear = getDeathYear(person);

      searchResults.push({
        type: "person",
        text: `${person.name} (${birthYear || "?"}-${deathYear || "?"})`,
        person,
      });
    });

    // Search for locations
    people.forEach((person) => {
      person.events.forEach((event) => {
        if (
          event.place &&
          event.place !== "Unknown" &&
          event.place.toLowerCase().includes(term.toLowerCase()) &&
          event.coordinates[0] !== 0 &&
          event.coordinates[1] !== 0
        ) {
          const key = `${event.coordinates[0]},${event.coordinates[1]}`;
          if (!locationMap.has(key)) {
            locationMap.set(key, {
              coordinates: event.coordinates,
              events: [{ person, event }],
            });
          } else {
            locationMap.get(key)!.events.push({ person, event });
          }
        }
      });
    });

    locationMap.forEach((value) => {
      const place = value.events[0].event.place;
      searchResults.push({
        type: "location",
        text: `${place} (${value.events.length} events)`,
        location: {
          place,
          coordinates: value.coordinates,
          events: value.events,
        },
      });
    });

    setResults(searchResults);
    setIsOpen(searchResults.length > 0);
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Input
          type="text"
          placeholder="Search people or places..."
          value={searchTerm}
          onChange={(e) => search(e.target.value)}
          className="pl-10"
        />
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
      </div>

      {isOpen && results.length > 0 && (
        <Card className="absolute mt-1 w-full z-50 max-h-[300px] overflow-y-auto">
          <div className="p-2 space-y-1">
            {results.map((result, index) => (
              <button
                key={index}
                className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded-md text-sm"
                onClick={() => {
                  if (result.type === "person" && result.person) {
                    onSelectPerson(result.person);
                  } else if (result.type === "location" && result.location) {
                    onSelectLocation(result.location.coordinates, 14);
                  }
                  setIsOpen(false);
                  setSearchTerm("");
                  setResults([]);
                }}
              >
                <div className="flex items-center gap-2">
                  {result.type === "person" ? (
                    <Search className="h-4 w-4 text-blue-500" />
                  ) : (
                    <Search className="h-4 w-4 text-green-500" />
                  )}
                  <span>{result.text}</span>
                </div>
              </button>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
