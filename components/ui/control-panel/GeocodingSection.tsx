"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Loader2 } from "lucide-react";
import { useTrees } from "@/contexts/TreeContext";

interface GeocodingSectionProps {
  isGeocoding: boolean;
  progress: {
    processed: number;
    total: number;
    currentPlace: string;
    treeId: string;
  };
  onStartAction: (treeId: string) => void;
  onCancelAction: () => void;
}

export function GeocodingSection({
  isGeocoding,
  progress,
  onStartAction,
  onCancelAction,
}: GeocodingSectionProps) {
  const { trees } = useTrees();

  const pendingTrees = trees.filter(
    (tree) => tree.geocodingStatus.placesToGeocode.size > 0
  );

  if (pendingTrees.length === 0) return null;

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium">Places Need Geocoding</h3>
      {pendingTrees.map((tree) => (
        <div key={tree.id} className="space-y-2 p-2 border rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: tree.color }}
              />
              <span className="text-sm">{tree.name}</span>
            </div>
            <span className="text-sm text-gray-500">
              {tree.geocodingStatus.placesToGeocode.size} places need
              coordinates
            </span>
          </div>
          {isGeocoding && tree.id === progress.treeId ? (
            <div className="space-y-1">
              <Progress
                value={(progress.processed / progress.total) * 100}
                className="h-2"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>
                  {progress.processed} of {progress.total}
                </span>
                <span className="truncate ml-2">{progress.currentPlace}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={onCancelAction}
                className="w-full"
              >
                Cancel
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onStartAction(tree.id)}
              disabled={isGeocoding}
              className="w-full"
            >
              {isGeocoding ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Waiting...
                </>
              ) : (
                "Start Geocoding"
              )}
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}
