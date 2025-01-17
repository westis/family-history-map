"use client";

import dynamic from "next/dynamic";
import { MainTreeManager } from "@/components/genealogy/MainTreeManager";
import { useState } from "react";
import { useTrees } from "@/contexts/TreeContext";

const FamilyMap = dynamic(() => import("@/components/FamilyMap"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-screen">
      Loading map...
    </div>
  ),
});

export default function ClientFamilyMap() {
  const [currentGedcom, setCurrentGedcom] = useState<string | null>(null);
  const { removeTree } = useTrees();

  const handleRemoveTree = async (treeId: string) => {
    console.log("ClientFamilyMap: handleRemoveTree called with id:", treeId);
    try {
      console.log("ClientFamilyMap: calling API");
      await fetch("/api/gedcom/remove", { method: "POST" });
      console.log("ClientFamilyMap: API call completed");

      console.log("ClientFamilyMap: clearing localStorage");
      localStorage.clear();

      console.log("ClientFamilyMap: calling removeTree");
      removeTree(treeId);

      console.log("ClientFamilyMap: setting currentGedcom to null");
      setCurrentGedcom(null);

      console.log("ClientFamilyMap: reloading page");
      window.location.reload();
    } catch (error) {
      console.error("ClientFamilyMap: Error during removal:", error);
    }
  };

  return (
    <div>
      <MainTreeManager
        currentGedcom={currentGedcom}
        onRemove={handleRemoveTree}
      />
      <FamilyMap />
    </div>
  );
}
