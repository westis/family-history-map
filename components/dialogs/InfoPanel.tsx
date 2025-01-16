import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface InfoPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InfoPanel({ open, onOpenChange }: InfoPanelProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>About Family Map</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p>
            Family Map is a tool for visualizing and exploring your family
            history geographically. Upload a GEDCOM file to see where your
            ancestors lived, were born, and died.
          </p>
          <div className="space-y-2">
            <h3 className="font-medium">Created by</h3>
            <p>Daniel Westergren</p>
            <div className="flex items-center gap-2">
              <a
                href="mailto:westis+dna@gmail.com"
                className="text-blue-600 hover:text-blue-800"
              >
                westis+dna@gmail.com
              </a>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
