import { NextResponse } from "next/server";

export async function POST() {
  console.log("API: remove endpoint called");
  try {
    // For now, just return success
    console.log("API: remove successful");
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("API: Error during remove:", error);
    return NextResponse.json(
      { error: "Failed to remove GEDCOM" },
      { status: 500 }
    );
  }
}
