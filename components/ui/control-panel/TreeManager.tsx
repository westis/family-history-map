import React from "react";
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

  if (trees.length === 0) return null;

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium">Loaded Trees</h3>
      <div className="flex flex-col gap-2">
        {trees.map((tree) => (
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
                onTreeRemove(tree.id);
              }}
              className="h-8 w-8 p-0"
              title={
                tree.isMain ? "Remove main tree" : "Remove comparison tree"
              }
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
