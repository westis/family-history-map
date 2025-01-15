import { Person, Event } from "@/types/family-map";

export const parseGEDCOM = (text: string): Person[] => {
  console.log("Starting GEDCOM parsing...");
  const lines = text.split("\n");
  console.log(`Total lines to process: ${lines.length}`);

  const people: Person[] = [];
  const families: {
    id: string;
    spouses: string[];
    children: string[];
  }[] = [];

  let currentPerson: Person | null = null;
  let currentFamily: {
    id: string;
    spouses: string[];
    children: string[];
  } | null = null;
  let currentEvent: Event | null = null;

  lines.forEach((line) => {
    const parts = line.trim().split(/\s+/);
    if (parts.length < 2) return;

    const level = parts[0];
    const tag = parts[1];
    const value = parts.slice(2).join(" ");

    // Handle INDI and FAM records
    if (level === "0") {
      if (parts.length > 2) {
        if (parts[2] === "INDI") {
          if (currentPerson) people.push(currentPerson);
          currentPerson = {
            id: parts[1].replace(/@/g, ""),
            name: "Unknown",
            sex: null,
            events: [],
            parents: [],
            children: [],
            spouses: [],
          };
          currentFamily = null;
        } else if (parts[2] === "FAM") {
          if (currentFamily) families.push(currentFamily);
          currentFamily = {
            id: parts[1].replace(/@/g, ""),
            spouses: [],
            children: [],
          };
          currentPerson = null;
        }
      }
    } else if (currentPerson) {
      if (tag === "NAME") {
        currentPerson.name = value.replace(/\//g, "");
        console.log(`Found name: ${currentPerson.name}`);
      } else if (["BIRT", "DEAT", "RESI"].includes(tag)) {
        currentEvent = {
          type: tag as Event["type"],
          date: {
            year: null,
          },
          place: "Unknown",
          coordinates: [0, 0],
        };
        currentPerson.events.push(currentEvent);
        console.log(`Found event ${tag} for ${currentPerson.name}`);
      } else if (tag === "CHAN") {
        currentEvent = null;
      } else if (tag === "DATE" && currentEvent) {
        if (["BIRT", "DEAT", "RESI"].includes(currentEvent.type)) {
          const fromToMatch = value.match(/FROM (\d{4}) TO (\d{4})/i);
          if (fromToMatch) {
            currentEvent.date = {
              from: fromToMatch[1],
              to: fromToMatch[2],
              year: parseInt(fromToMatch[1]),
            };
          } else {
            const fullDateMatch = value.match(
              /(\d{1,2}\s+[A-Za-z]+\s+)?(\d{4})/
            );
            if (fullDateMatch) {
              const year = parseInt(fullDateMatch[2]);
              currentEvent.date = {
                from: value.trim(),
                year: year,
              };
            }
          }
        }
      } else if (tag === "PLAC" && currentEvent) {
        if (!value || /^\d+$/.test(value)) {
          currentEvent.place = "Unknown";
          currentEvent.coordinates = [0, 0];
        } else {
          currentEvent.place = value;
          currentEvent.coordinates = [0, 0];
        }
      } else if (tag === "MAP") {
        if (currentEvent) {
          currentEvent.coordinates = [0, 0];
        }
      } else if (tag === "LATI" && currentEvent) {
        const match = value.match(/([NS])(\d+\.\d+)/);
        if (match) {
          const latitude = parseFloat(match[2]) * (match[1] === "S" ? -1 : 1);
          currentEvent.coordinates[0] = latitude;
        }
      } else if (tag === "LONG" && currentEvent) {
        const match = value.match(/([EW])(\d+\.\d+)/);
        if (match) {
          const longitude = parseFloat(match[2]) * (match[1] === "W" ? -1 : 1);
          currentEvent.coordinates[1] = longitude;
        }
      } else if (tag === "SEX") {
        currentPerson.sex = value as "M" | "F";
      }
    } else if (currentFamily) {
      if (["HUSB", "WIFE"].includes(tag)) {
        currentFamily.spouses.push(value.replace(/@/g, ""));
      } else if (tag === "CHIL") {
        currentFamily.children.push(value.replace(/@/g, ""));
      }
    }
  });

  // Add final person or family
  if (currentPerson) people.push(currentPerson);
  if (currentFamily) families.push(currentFamily);

  // Process family relationships
  families.forEach((family) => {
    family.children.forEach((childId) => {
      const child = people.find((p) => p.id === childId);
      if (child) {
        child.parents.push(...family.spouses);
        family.spouses.forEach((spouseId) => {
          const parent = people.find((p) => p.id === spouseId);
          if (parent) {
            parent.children.push(childId);
            parent.spouses.push(
              ...family.spouses.filter((id) => id !== spouseId)
            );
          }
        });
      }
    });
  });

  console.log(`Parsing complete. Found ${people.length} people`);
  console.log("Sample of parsed data:", people.slice(0, 2));

  return people;
};
