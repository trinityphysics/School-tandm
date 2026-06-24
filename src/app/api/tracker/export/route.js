import { NextResponse } from "next/server";
import { exportLeadershipCsv } from "../../../../lib/tracker-store.mjs";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const csv = exportLeadershipCsv({
    academicYear: searchParams.get("academicYear") || "",
    teacherId: searchParams.get("teacherId") || "",
    classId: searchParams.get("classId") || "",
    assessmentType: searchParams.get("assessmentType") || "",
    targetGroup: searchParams.get("targetGroup") || "",
  });

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="tracker-export.csv"',
    },
  });
}
