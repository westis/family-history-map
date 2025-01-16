import { Person, RelationshipInfo } from "./types";

export function calculateRelationships(
  people: Person[],
  rootId: string
): Map<string, RelationshipInfo> {
  const peopleMap = new Map(people.map((p) => [p.id, p]));
  const relationships = new Map<string, RelationshipInfo>();

  function isAncestor(
    personId: string,
    targetId: string,
    visited = new Set<string>()
  ): boolean {
    if (visited.has(personId)) return false;
    visited.add(personId);

    const person = peopleMap.get(personId);
    if (!person) return false;

    if (person.children.includes(targetId)) return true;

    return person.children.some((childId) =>
      isAncestor(childId, targetId, visited)
    );
  }

  function isDescendant(
    personId: string,
    targetId: string,
    visited = new Set<string>()
  ): boolean {
    if (visited.has(personId)) return false;
    visited.add(personId);

    const person = peopleMap.get(personId);
    if (!person) return false;

    if (person.parents.includes(targetId)) return true;

    return person.parents.some((parentId) =>
      isDescendant(parentId, targetId, visited)
    );
  }

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

    if (direction === null || direction === "up") {
      for (const parentId of person.parents) {
        const path = findPath(parentId, toId, new Set(visited), "up");
        if (path) return [fromId, ...path];
      }
    }

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

      if (nextPerson.spouses.includes(currentId)) {
        return nextPerson.sex === "F" ? "Wife" : "Husband";
      }

      if (nextPerson.children.includes(currentId)) {
        relationshipParts.push(nextPerson.sex === "F" ? "m" : "f");
      } else if (currentPerson.children.includes(path[i])) {
        relationshipParts.push(nextPerson.sex === "F" ? "d" : "s");
      }
      currentId = path[i];
    }

    let result = "";
    relationshipParts.forEach((part, i) => {
      if (i > 0 && i % 2 === 0) result += " ";
      result += part;
    });
    return result;
  }

  people.forEach((person) => {
    if (person.id === rootId) {
      relationships.set(person.id, {
        relationship: "Root Person",
        type: "root",
      });
      return;
    }

    const path = findPath(person.id, rootId);
    if (!path) {
      relationships.set(person.id, {
        relationship: "Not Related",
        type: "none",
      });
      return;
    }

    const type = isAncestor(person.id, rootId)
      ? "ancestor"
      : isDescendant(person.id, rootId)
      ? "descendant"
      : "none";

    relationships.set(person.id, {
      relationship: formatPath(path.reverse()),
      type,
    });
  });

  return relationships;
}
