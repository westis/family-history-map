"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Person } from "@/app/utils/types";
import { ChevronsUpDown, Check, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Command,
  CommandInput,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

interface RootPersonDialogProps {
  open: boolean;
  onOpenChangeAction: (open: boolean) => void;
  rootPerson: string | null;
  people: Person[];
  isCalculating: boolean;
  searchTerm: string;
  onSearchChangeAction: (term: string) => void;
  onSelectPersonAction: (personId: string | null) => void;
}

export function RootPersonDialog({
  open,
  onOpenChangeAction,
  rootPerson,
  people,
  isCalculating,
  searchTerm,
  onSearchChangeAction,
  onSelectPersonAction,
}: RootPersonDialogProps) {
  const filteredPeople = React.useMemo(() => {
    if (!searchTerm) return people;

    const searchTerms = searchTerm.toLowerCase().trim().split(/\s+/);

    return people
      .filter((person) => {
        const name = person.name.toLowerCase();
        return searchTerms.every((term) => name.includes(term));
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [people, searchTerm]);

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Root Person</label>
      <Dialog open={open} onOpenChange={onOpenChangeAction}>
        <DialogTrigger asChild>
          <Button variant="outline" className="w-full justify-between">
            {rootPerson
              ? people.find((p) => p.id === rootPerson)?.name || "Unknown"
              : "Choose Root Person..."}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Choose Person for Root</DialogTitle>
          </DialogHeader>
          <div className="flex gap-4">
            <div className="flex-1">
              <Command className="rounded-lg border shadow-md">
                <CommandInput
                  placeholder="Search people..."
                  value={searchTerm}
                  onValueChange={onSearchChangeAction}
                />
                <CommandList className="max-h-[300px] overflow-y-auto">
                  <CommandEmpty>No person found.</CommandEmpty>
                  <CommandGroup>
                    {filteredPeople.map((person) => (
                      <CommandItem
                        key={person.id}
                        value={person.name}
                        className="cursor-pointer hover:bg-accent pointer-events-auto"
                        onSelect={() => {
                          onSelectPersonAction(person.id);
                          onSearchChangeAction("");
                          onOpenChangeAction(false);
                        }}
                        disabled={isCalculating}
                      >
                        <div
                          className="flex items-center gap-2 w-full"
                          onClick={() => {
                            onSelectPersonAction(person.id);
                            onSearchChangeAction("");
                          }}
                        >
                          {rootPerson === person.id && (
                            <Check className="h-4 w-4 text-primary shrink-0" />
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              {person.name}
                              {isCalculating && rootPerson === person.id && (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {person.events
                                .filter((e) => e.type === "BIRT" && e.date.year)
                                .map((e) => e.date.year)
                                .join(", ")}
                            </div>
                          </div>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </div>
            <div className="flex flex-col gap-2 min-w-[120px]">
              <Button
                variant="outline"
                onClick={() => {
                  onSelectPersonAction(null);
                  onOpenChangeAction(false);
                }}
              >
                Clear Selection
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
