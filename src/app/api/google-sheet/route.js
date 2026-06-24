import { NextResponse } from "next/server";
import { parseCsvText, parseGoogleSheetReference } from "../../../lib/tracking.mjs";

export async function POST(request) {
  try {
    const { url } = await request.json();
    const reference = parseGoogleSheetReference(url);

    if (!reference) {
      return NextResponse.json(
        { error: "Enter a valid Google Sheets URL that can be exported as CSV." },
        { status: 400 },
      );
    }

    if (!/^[A-Za-z0-9-_]+$/.test(reference.sheetId) || !/^\d+$/.test(reference.gid)) {
      return NextResponse.json(
        { error: "The Google Sheets URL contains an invalid sheet reference." },
        { status: 400 },
      );
    }

    const exportUrl = new URL(
      `/spreadsheets/d/${reference.sheetId}/export`,
      "https://docs.google.com",
    );
    exportUrl.searchParams.set("format", "csv");
    exportUrl.searchParams.set("gid", reference.gid);

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
