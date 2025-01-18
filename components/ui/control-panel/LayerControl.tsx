import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface LayerControlProps {
  showParishes: boolean;
  onChangeAction: (show: boolean) => void;
}

export function LayerControl({
  showParishes,
  onChangeAction,
}: LayerControlProps) {
  return (
    <div className="flex items-center space-x-2">
      <Switch
        id="parish-layer"
        checked={showParishes}
        onCheckedChange={onChangeAction}
      />
      <Label htmlFor="parish-layer">Show Historical Parishes</Label>
    </div>
  );
}
