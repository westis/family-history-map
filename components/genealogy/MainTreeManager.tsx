import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useTrees } from "@/contexts/TreeContext";

interface MainTreeManagerProps {
  currentGedcom: string | null;
  onRemove: (treeId: string) => Promise<void>;
}

export function MainTreeManager({
  currentGedcom,
  onRemove,
}: MainTreeManagerProps) {
  const [isRemoving, setIsRemoving] = useState(false);
  const { getMainTree } = useTrees();

  const handleRemove = async () => {
    console.log("MainTreeManager: handleRemove called");
    setIsRemoving(true);
    try {
      const mainTree = getMainTree();
      console.log("MainTreeManager: mainTree found:", mainTree);
      if (mainTree) {
        console.log("MainTreeManager: calling onRemove with id:", mainTree.id);
        await onRemove(mainTree.id);
        console.log("MainTreeManager: onRemove completed");
      }
    } catch (error) {
      console.error("MainTreeManager: Error during removal:", error);
    } finally {
      setIsRemoving(false);
    }
  };

  if (!currentGedcom) return null;

  return (
    <div className="mb-6 p-4 border rounded-lg">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium">Current Main Tree</h3>
          <p className="text-sm text-muted-foreground">{currentGedcom}</p>
        </div>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" disabled={isRemoving}>
              {isRemoving ? "Removing..." : "Remove Tree"}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove Main Tree</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to remove the current main tree? This will
                allow you to upload a new one.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  console.log("Remove button clicked");
                  handleRemove();
                }}
              >
                Remove
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
