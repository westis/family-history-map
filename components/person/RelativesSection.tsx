import { Person, Event } from "@/app/utils/types";

interface RelativesSectionProps {
  person: Person;
  people: Person[];
  setSelectedPerson: (value: { person: Person; event: Event } | null) => void;
}

export default function RelativesSection({
  person,
  people,
  setSelectedPerson,
}: RelativesSectionProps) {
  return (
    <>
      {/* Parents section */}
      {person.parents.length > 0 && (
        <div className="bg-gray-50 p-2 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-2">Parents</h4>
          <div className="space-y-0">
            {person.parents.map((parentId) => {
              const parent = people.find((p) => p.id === parentId);
              return (
                parent && (
                  <button
                    key={parentId}
                    className="w-full text-left px-2 py-1 hover:bg-gray-100 rounded-md text-blue-600 hover:text-blue-800"
                    onClick={() => {
                      setSelectedPerson({
                        person: parent,
                        event:
                          parent.events.find(
                            (e) =>
                              e.coordinates[0] !== 0 &&
                              e.coordinates[1] !== 0 &&
                              e.place !== "Unknown"
                          ) || parent.events[0],
                      });
                    }}
                  >
                    {parent.name}
                  </button>
                )
              );
            })}
          </div>
        </div>
      )}

      {/* Children section */}
      {person.children.length > 0 && (
        <div className="bg-gray-50 p-3 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-2">Children</h4>
          <div className="space-y-2">
            {person.children.map((childId) => {
              const child = people.find((p) => p.id === childId);
              return (
                child && (
                  <button
                    key={childId}
                    className="w-full text-left px-2 py-1 hover:bg-gray-100 rounded-md text-blue-600 hover:text-blue-800"
                    onClick={() => {
                      setSelectedPerson({
                        person: child,
                        event:
                          child.events.find(
                            (e) =>
                              e.coordinates[0] !== 0 &&
                              e.coordinates[1] !== 0 &&
                              e.place !== "Unknown"
                          ) || child.events[0],
                      });
                    }}
                  >
                    {child.name}
                  </button>
                )
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
