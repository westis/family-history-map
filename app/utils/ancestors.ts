import { Person, AncestorInfo, RelationshipInfo } from "./types";

export function calculateAhnentafelNumbers(
  people: Person[],
  rootId: string
): Map<string, number[]> {
  const peopleMap = new Map(people.map((p) => [p.id, p]));
  const numbers = new Map<string, number[]>();

  function processAncestor(personId: string, ahnNumber: number) {
    if (!personId) return;

    const person = peopleMap.get(personId);
    if (!person) return;

    // Add this number to person's numbers
    const currentNumbers = numbers.get(personId) || [];
    if (!currentNumbers.includes(ahnNumber)) {
      numbers.set(personId, [...currentNumbers, ahnNumber]);
    }

    // Process parents (if any)
    const parents = person.parents;
    if (parents.length === 2) {
      // If we have both parents, use their actual sex to determine Ahnentafel numbers
      const father = peopleMap.get(parents[0]);
      const mother = peopleMap.get(parents[1]);
      if (father?.sex === "M") {
        processAncestor(parents[0], ahnNumber * 2);
        processAncestor(parents[1], ahnNumber * 2 + 1);
      } else if (mother?.sex === "F") {
        processAncestor(parents[1], ahnNumber * 2);
        processAncestor(parents[0], ahnNumber * 2 + 1);
      }
    } else {
      // If we don't have both parents, process them in order
      parents.forEach((parentId, index) => {
        processAncestor(parentId, ahnNumber * 2 + index);
      });
    }
  }

  // Start with the root person as 1
  processAncestor(rootId, 1);
  return numbers;
}

export function get16Ancestors(
  people: Person[],
  rootId: string,
  ahnentafelNumbers: Map<string, number[]>
): AncestorInfo[] {
  const ancestors: AncestorInfo[] = [];
  const seen = new Set<string>();

  // Only look for exact 2x great-grandparents (numbers 16-31)
  people.forEach((person) => {
    const numbers = ahnentafelNumbers.get(person.id) || [];
    // Only include direct 2x great-grandparents
    const ggNumbers = numbers
      .filter((n) => n >= 16 && n <= 31)
      .map((n) => n - 15); // Convert 16-31 to 1-16

    if (ggNumbers.length > 0 && !seen.has(person.id)) {
      seen.add(person.id);

      // Get birth and death years from events
      const birthEvent = person.events.find((e) => e.type === "BIRT");
      const deathEvent = person.events.find((e) => e.type === "DEAT");

      ancestors.push({
        numbers: ggNumbers,
        name: person.name,
        birthYear: birthEvent?.date.year || undefined,
        deathYear: deathEvent?.date.year || undefined,
        selected: false,
      });
    }
  });

  return ancestors.sort(
    (a, b) => Math.min(...a.numbers) - Math.min(...b.numbers)
  );
}

export function getAncestorPath(
  num: number,
  people: Person[],
  relationships: Map<string, RelationshipInfo>,
  ahnentafelNumbers: Map<string, number[]>
): string {
  // Convert back to Ahnentafel number (16-31)
  const ahnNum = num + 15;

  // Find the person with this Ahnentafel number
  const person = people.find((p) => {
    const numbers = ahnentafelNumbers.get(p.id) || [];
    return numbers.includes(ahnNum);
  });

  if (person) {
    // Use the already calculated relationship path
    const relationship = relationships.get(person.id);
    return relationship?.relationship || "";
  }

  return "";
}

export function getAncestorGroupInfo(
  personId: string,
  ahnentafelNumbers: Map<string, number[]>,
  relationships: Map<string, RelationshipInfo>
): { number: number; type: "ancestor" | "descendant" }[] {
  const numbers = ahnentafelNumbers.get(personId) || [];
  const relationship = relationships.get(personId);

  // Helper to get all 2x great-grandparent groups for a number
  function getAllGGNumbers(n: number): number[] {
    const result: number[] = [];

    // Walk up the tree to find all ancestor groups
    let current = n;
    while (current > 0) {
      if (current >= 16 && current <= 31) {
        result.push(current - 15); // Convert to 1-16
      }
      current = Math.floor(current / 2);
    }

    // If this is an ancestor of a 2x great-grandparent,
    // include all descendant 2x great-grandparent groups
    if (n > 0 && n < 16) {
      const stack = [n * 2, n * 2 + 1]; // Start with immediate children
      while (stack.length > 0) {
        const next = stack.pop()!;
        if (next >= 16 && next <= 31) {
          result.push(next - 15);
        } else if (next < 16) {
          stack.push(next * 2, next * 2 + 1);
        }
      }
    }

    return [...new Set(result)];
  }

  // Get all groups this person belongs to
  const allGGNumbers = numbers.flatMap(getAllGGNumbers);
  if (allGGNumbers.length > 0) {
    return [...new Set(allGGNumbers)]
      .sort((a, b) => a - b)
      .map((num) => ({
        number: num,
        type: "ancestor" as const,
      }));
  }

  // For descendants, we need to check all possible ancestor paths
  if (
    relationship?.relationship?.includes("son") ||
    relationship?.relationship?.includes("dotter")
  ) {
    const ancestorGroups = new Set<number>();
    for (const num of numbers) {
      let current = num;
      while (current > 0) {
        if (current >= 16 && current <= 31) {
          ancestorGroups.add(current - 15);
        }
        current = Math.floor(current / 2);
      }
    }

    return Array.from(ancestorGroups)
      .sort((a, b) => a - b)
      .map((num) => ({
        number: num,
        type: "descendant" as const,
      }));
  }

  return [];
}
