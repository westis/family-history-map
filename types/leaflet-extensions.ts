import L from "leaflet";

declare module "leaflet" {
  interface MarkerCluster extends L.Layer {
    getChildCount(): number;
    getAllChildMarkers(): L.Marker[];
  }

  interface MarkerClusterGroupOptions extends L.LayerOptions {
    maxClusterRadius?: number;
    spiderfyOnMaxZoom?: boolean;
    disableClusteringAtZoom?: number;
    iconCreateFunction?: (cluster: MarkerCluster) => L.DivIcon;
  }

  class MarkerClusterGroup extends L.FeatureGroup {
    constructor(options?: MarkerClusterGroupOptions);
    addLayer(layer: L.Layer): this;
    removeLayer(layer: L.Layer): this;
  }
}
