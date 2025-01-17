import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";
import { useTrees } from "@/contexts/TreeContext";

interface TreeManagerProps {
  onTreeSelect: (treeId: string) => void;
  onTreeRemove: (treeId: string) => void;
}

export function TreeManager({ onTreeSelect, onTreeRemove }: TreeManagerProps) {
  const { trees, updateTreeName } = useTrees();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [treeToRemove, setTreeToRemove] = useState<string | null>(null);

  console.log("TreeManager render:", { trees });

  if (trees.length === 0) return null;

  const mainTree = trees.find((tree) => tree.isMain);
  const comparisonTrees = trees.filter((tree) => !tree.isMain);

  const handleRemove = async (treeId: string) => {
    console.log("TreeManager: handleRemove called for tree:", treeId);
    try {
      await fetch("/api/gedcom/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ treeId }),
      });

      localStorage.clear();
      onTreeRemove(treeId);
      window.location.reload();
    } catch (error) {
      console.error("TreeManager: Error during removal:", error);
    }
    setShowConfirmDialog(false);
    setTreeToRemove(null);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium">Loaded Trees</h3>

      {/* Main Tree Section */}
      {mainTree && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-gray-500">Main Tree</h4>
          <div
            className="flex items-center gap-2 p-2 rounded-lg border border-blue-200 bg-blue-50"
            onClick={() => onTreeSelect(mainTree.id)}
          >
            <div
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: mainTree.color }}
            />
            <Input
              value={mainTree.name}
              onChange={(e) => updateTreeName(mainTree.id, e.target.value)}
              className="h-8 flex-1"
            />
            <Button
              variant="destructive"
              size="sm"
              className="h-8"
              onClick={() => {
                console.log("Opening confirm dialog for main tree");
                setTreeToRemove(mainTree.id);
                setShowConfirmDialog(true);
              }}
            >
              Remove Tree
            </Button>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      {showConfirmDialog && treeToRemove && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
            <h2 className="text-lg font-semibold mb-4">Remove Tree?</h2>
            <p className="text-gray-600 mb-6">
              Are you sure you want to remove this tree? This action cannot be
              undone.
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowConfirmDialog(false);
                  setTreeToRemove(null);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  console.log("Confirm remove clicked for tree:", treeToRemove);
                  handleRemove(treeToRemove);
                }}
              >
                Remove
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Comparison Trees Section */}
      {comparisonTrees.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-gray-500">
            Comparison Trees
          </h4>
          {comparisonTrees.map((tree) => (
            <div
              key={tree.id}
              className="flex items-center gap-2 p-2 rounded-lg border"
              onClick={() => onTreeSelect(tree.id)}
            >
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: tree.color }}
              />
              <Input
                value={tree.name}
                onChange={(e) => updateTreeName(tree.id, e.target.value)}
                className="h-8 flex-1"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setTreeToRemove(tree.id);
                  setShowConfirmDialog(true);
                }}
                className="h-8 w-8 p-0"
                title="Remove comparison tree"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
