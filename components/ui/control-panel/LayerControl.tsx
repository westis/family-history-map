import { Checkbox } from "@/components/ui/checkbox";

interface LayerControlProps {
  showParishes: boolean;
  onChangeAction: (checked: boolean) => void;
}

export function LayerControl({
  showParishes,
  onChangeAction,
}: LayerControlProps) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium">Map Layers</h3>
      <div className="flex items-center space-x-2">
        <Checkbox
          id="show-parishes"
          checked={showParishes}
          onCheckedChange={(checked) => onChangeAction(checked === true)}
        />
        <label htmlFor="show-parishes" className="text-sm">
          Show Historical Swedish Parishes
        </label>
      </div>
    </div>
  );
}
