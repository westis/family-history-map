"use client";

import { Button } from "@/components/ui/button";
import { RelationFilter } from "@/app/utils/types";

interface RelationshipFilterProps {
  relationFilter: RelationFilter;
  onChangeAction: (filter: RelationFilter) => void;
}

export function RelationshipFilter({
  relationFilter,
  onChangeAction,
}: RelationshipFilterProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Filter Events</label>
      <div className="flex gap-2">
        <Button
          size="sm"
          variant={relationFilter === "all" ? "default" : "outline"}
          onClick={() => onChangeAction("all")}
        >
          All
        </Button>
        <Button
          size="sm"
          variant={relationFilter === "ancestors" ? "default" : "outline"}
          onClick={() => onChangeAction("ancestors")}
        >
          Ancestors
        </Button>
        <Button
          size="sm"
          variant={relationFilter === "descendants" ? "default" : "outline"}
          onClick={() => onChangeAction("descendants")}
        >
          Descendants
        </Button>
      </div>
    </div>
  );
}
