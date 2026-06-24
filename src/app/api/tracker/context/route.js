import { NextResponse } from "next/server";
import { getTrackerContext } from "../../../../lib/tracker-store.mjs";

export async function GET() {
  return NextResponse.json(getTrackerContext());
}
