import { GeoJSONCollection } from "@/app/utils/types";

// This is just a type definition - the actual data will be loaded dynamically
export const svenskaSocknarGeoJSON: GeoJSONCollection = {
  type: "FeatureCollection",
  features: [],
} as const;
