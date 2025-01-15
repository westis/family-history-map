import L from "leaflet";

declare module "leaflet" {
  export interface MarkerClusterGroupOptions {
    spiderfyOnMaxZoom?: boolean;
    zoomToBoundsOnClick?: boolean;
    disableClusteringAtZoom?: number;
    maxClusterRadius?: number;
    iconCreateFunction?: (cluster: MarkerCluster) => L.DivIcon;
  }

  export class MarkerCluster extends L.Layer {
    getAllChildMarkers(): L.Marker[];
    getLatLng(): L.LatLng;
  }

  export class MarkerClusterGroup extends L.FeatureGroup {
    constructor(options?: MarkerClusterGroupOptions);
    addLayer(layer: L.Layer): this;
    removeLayer(layer: L.Layer): this;
  }
}
