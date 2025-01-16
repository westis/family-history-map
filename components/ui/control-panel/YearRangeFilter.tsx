"use client";

import { RangeSlider } from "@/components/ui/range-slider";

interface YearRangeFilterProps {
  value: [number, number];
  onChangeAction: (value: [number, number]) => void;
  min?: number;
  max?: number;
}

export function YearRangeFilter({
  value,
  onChangeAction,
  min = 1500,
  max = 2024,
}: YearRangeFilterProps) {
  const handleValueChange = (newValue: number[]) => {
    // Ensure we always have exactly two values
    onChangeAction([newValue[0], newValue[1]] as [number, number]);
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Year Range</label>
      <RangeSlider
        value={value}
        min={min}
        max={max}
        step={1}
        onValueChange={handleValueChange}
      />
      <div className="flex justify-between text-sm text-gray-600">
        <span>{value[0]}</span>
        <span>{value[1]}</span>
      </div>
    </div>
  );
}
