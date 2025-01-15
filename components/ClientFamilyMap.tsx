"use client";

import dynamic from "next/dynamic";

const FamilyMap = dynamic(() => import("@/components/FamilyMap"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-screen">
      Loading map...
    </div>
  ),
});

export default function ClientFamilyMap() {
  return <FamilyMap />;
}
