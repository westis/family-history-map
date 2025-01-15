import "./globals.css";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import { FamilyMapProvider } from "@/contexts/FamilyMapContext";

export const metadata = {
  title: "Family History Map",
  description: "Visualize your family history on a map",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <FamilyMapProvider>{children}</FamilyMapProvider>
      </body>
    </html>
  );
}
