import { NextResponse } from "next/server";
import { parseCsvText, sanitizeGoogleSheetUrl } from "../../../lib/tracking.mjs";

export async function POST(request) {
  try {
    const { url } = await request.json();
    const exportUrl = sanitizeGoogleSheetUrl(url);

    if (!exportUrl) {
      return NextResponse.json(
        { error: "Enter a valid Google Sheets URL that can be exported as CSV." },
        { status: 400 },
      );
    }

    const response = await fetch(exportUrl, { cache: "no-store" });

    if (!response.ok) {
      return NextResponse.json(
        { error: "The Google Sheet could not be fetched. Check that it is shared for access." },
        { status: 400 },
      );
    }

    const csv = await response.text();
    const records = parseCsvText(csv, "Google Sheets");

    return NextResponse.json({ records });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Unable to import the Google Sheet." },
      { status: 500 },
    );
  }
}
