"use client";

import dynamic from "next/dynamic";

const FamilyMap = dynamic(() => import("@/components/FamilyMap"), {
  ssr: false,
});

export default function ClientFamilyMap() {
  return <FamilyMap />;
}
