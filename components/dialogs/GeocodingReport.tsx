import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { GeocodingReport as GeocodingReportType } from "@/app/utils/types";

interface GeocodingReportProps {
  report: GeocodingReportType | null;
  onOpenChange: (open: boolean) => void;
}

export function GeocodingReport({
  report,
  onOpenChange,
}: GeocodingReportProps) {
  if (!report) return null;

  return (
    <Dialog open={!!report} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Geocoding Report</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex justify-between text-sm">
            <span>Total places attempted:</span>
            <span className="font-medium">{report.totalAttempted}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Successfully geocoded:</span>
            <span className="font-medium text-green-600">
              {report.successCount}(
              {Math.round((report.successCount / report.totalAttempted) * 100)}
              %)
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Failed to geocode:</span>
            <span className="font-medium text-red-600">
              {report.failedPlaces.length}(
              {Math.round(
                (report.failedPlaces.length / report.totalAttempted) * 100
              )}
              %)
            </span>
          </div>

          {report.failedPlaces.length > 0 && (
            <div className="mt-4">
              <h4 className="font-medium mb-2">Failed Places:</h4>
              <div className="bg-gray-50 rounded-lg p-4 max-h-[300px] overflow-y-auto">
                <ul className="space-y-1">
                  {report.failedPlaces.sort().map((place, index) => (
                    <li key={index} className="text-sm text-gray-700">
                      {place}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          <div className="mt-4 text-sm text-gray-500">
            <p>
              Failed places could not be geocoded due to unclear or historical
              place names. You may want to manually review these locations.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
