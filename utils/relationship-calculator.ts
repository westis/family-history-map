import { Person } from "@/types/family-map";

export function calculateRelationships(
  people: Person[],
  rootId: string
): Map<string, string> {
  const peopleMap = new Map(people.map((p) => [p.id, p]));
  const relationships = new Map<string, string>();

  function findPath(
    fromId: string,
    toId: string,
    visited = new Set<string>(),
    direction: "up" | "down" | null = null
  ): string[] | null {
    if (fromId === toId) return [fromId];
    if (visited.has(fromId)) return null;

    visited.add(fromId);
    const person = peopleMap.get(fromId);
    if (!person) return null;

    // Try going up to parents (ancestors)
    if (direction === null || direction === "up") {
      for (const parentId of person.parents) {
        const path = findPath(parentId, toId, new Set(visited), "up");
        if (path) return [fromId, ...path];
      }
    }

    // Try going down to children (descendants)
    if (direction === null || direction === "down") {
      for (const childId of person.children) {
        const path = findPath(childId, toId, new Set(visited), "down");
        if (path) return [fromId, ...path];
      }
    }

    return null;
  }

  function formatPath(path: string[]): string {
    const relationshipParts: string[] = [];
    let currentId = path[0];

    for (let i = 1; i < path.length; i++) {
      const currentPerson = peopleMap.get(currentId);
      const nextPerson = peopleMap.get(path[i]);
      if (!currentPerson || !nextPerson) continue;

      // Handle spouse relationship
      if (nextPerson.spouses.includes(currentId)) {
        return nextPerson.sex === "F" ? "Wife" : "Husband";
      }

      if (nextPerson.children.includes(currentId)) {
        // Going up to parent
        relationshipParts.push(nextPerson.sex === "F" ? "m" : "f");
      } else if (currentPerson.children.includes(path[i])) {
        // Going down to child
        relationshipParts.push(nextPerson.sex === "F" ? "d" : "s");
      }
      currentId = path[i];
    }

    const rel = relationshipParts
      .join("")
      .replace(/(.{2})/g, "$1 ")
      .trim();

    const relationshipMap: Record<string, string> = {
      f: "Far",
      m: "Mor",
      s: "Son",
      d: "Dotter",
      "f f": "Farfar",
      "f m": "Farmor",
      "m f": "Morfar",
      "m m": "Mormor",
      "s s": "Sonson",
      "s d": "Sondotter",
      "d s": "Dotterson",
      "d d": "Dotterdotter",
      "f f f": "Farfarsfar",
      "f f m": "Farfarsmor",
      "f m f": "Farmorsfar",
      "f m m": "Farmorsmor",
      "m f f": "Morfarsfar",
      "m f m": "Morfarsmor",
      "m m f": "Mormorsfar",
      "m m m": "Mormorsmor",
    };

    return relationshipMap[rel] || rel;
  }

  people.forEach((person) => {
    if (person.id === rootId) {
      relationships.set(person.id, "Root Person");
      return;
    }

    const path = findPath(person.id, rootId);
    if (!path) {
      relationships.set(person.id, "Not Related");
      return;
    }

    relationships.set(person.id, formatPath(path.reverse()));
  });

  return relationships;
}
