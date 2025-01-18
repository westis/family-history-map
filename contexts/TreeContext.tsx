"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { Person } from "@/app/utils/types";

export interface TreeData {
  id: string;
  name: string;
  people: Person[];
  color: string;
  isMain: boolean;
  geocodingStatus: {
    processed: number;
    total: number;
    placesToGeocode: Set<string>;
  };
}

interface TreeContextType {
  trees: TreeData[];
  addTree: (people: Person[], name: string, isMain?: boolean) => void;
  removeTree: (id: string) => void;
  updateTreeName: (id: string, name: string) => void;
  updateTreeColor: (id: string, color: string) => void;
  getMainTree: () => TreeData | undefined;
  updateGeocodingStatus: (
    id: string,
    status: Partial<TreeData["geocodingStatus"]>
  ) => void;
}

const TreeContext = createContext<TreeContextType | undefined>(undefined);

const DEFAULT_COLORS = [
  "#2563eb", // Main tree - blue
  "#dc2626", // Red
  "#16a34a", // Green
  "#9333ea", // Purple
  "#ea580c", // Orange
];

export function TreeProvider({ children }: { children: React.ReactNode }) {
  const [trees, setTrees] = useState<TreeData[]>([]);

  // Add debug logging
  console.log("TreeContext state:", { trees });

  const addTree = useCallback(
    (people: Person[], name: string, isMain = false) => {
      const newTree: TreeData = {
        id: crypto.randomUUID(),
        name,
        people,
        color: DEFAULT_COLORS[trees.length % DEFAULT_COLORS.length],
        isMain,
        geocodingStatus: {
          processed: 0,
          total: 0,
          placesToGeocode: new Set(),
        },
      };
      setTrees((current) => [...current, newTree]);
    },
    [trees.length]
  );

  const value = {
    trees,
    addTree,
    removeTree: (id: string) => {
      console.log("TreeContext: removeTree called with id:", id);
      const treeToRemove = trees.find((t) => t.id === id);
      console.log("TreeContext: found tree:", treeToRemove);

      setTrees((current) => {
        // Create new array without the removed tree
        const updatedTrees = current.filter((t) => t.id !== id);
        console.log("TreeContext: updated trees:", updatedTrees);
        return updatedTrees;
      });
    },
    updateTreeName: (id: string, name: string) =>
      setTrees((current) =>
        current.map((t) => (t.id === id ? { ...t, name } : t))
      ),
    updateTreeColor: (id: string, color: string) =>
      setTrees((current) =>
        current.map((t) => (t.id === id ? { ...t, color } : t))
      ),
    getMainTree: () => trees.find((t) => t.isMain),
    updateGeocodingStatus: (
      id: string,
      status: Partial<TreeData["geocodingStatus"]>
    ) =>
      setTrees((current) =>
        current.map((t) =>
          t.id === id
            ? { ...t, geocodingStatus: { ...t.geocodingStatus, ...status } }
            : t
        )
      ),
  };

  return <TreeContext.Provider value={value}>{children}</TreeContext.Provider>;
}

export const useTrees = () => {
  const context = useContext(TreeContext);
  if (context === undefined) {
    throw new Error("useTrees must be used within a TreeProvider");
  }
  return context;
};
