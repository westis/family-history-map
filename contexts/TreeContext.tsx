"use client";

import React, { createContext, useContext, useState } from "react";
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

  const addTree = (people: Person[], name: string, isMain: boolean = false) => {
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
  };

  const removeTree = (id: string) => {
    setTrees((current) => current.filter((tree) => tree.id !== id));
  };

  const updateTreeName = (id: string, name: string) => {
    setTrees((current) =>
      current.map((tree) => (tree.id === id ? { ...tree, name } : tree))
    );
  };

  const updateTreeColor = (id: string, color: string) => {
    setTrees((current) =>
      current.map((tree) => (tree.id === id ? { ...tree, color } : tree))
    );
  };

  const getMainTree = () => {
    return trees.find((tree) => tree.isMain);
  };

  const updateGeocodingStatus = (
    id: string,
    status: Partial<TreeData["geocodingStatus"]>
  ) => {
    setTrees((current) =>
      current.map((tree) =>
        tree.id === id
          ? {
              ...tree,
              geocodingStatus: { ...tree.geocodingStatus, ...status },
            }
          : tree
      )
    );
  };

  return (
    <TreeContext.Provider
      value={{
        trees,
        addTree,
        removeTree,
        updateTreeName,
        updateTreeColor,
        getMainTree,
        updateGeocodingStatus,
      }}
    >
      {children}
    </TreeContext.Provider>
  );
}

export const useTrees = () => {
  const context = useContext(TreeContext);
  if (context === undefined) {
    throw new Error("useTrees must be used within a TreeProvider");
  }
  return context;
};
