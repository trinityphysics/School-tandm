import { NextResponse } from "next/server";
import { getLeadershipAnalysis } from "../../../../lib/tracker-store.mjs";

export async function GET(request) {
  const { searchParams } = new URL(request.url);

  try {
    const payload = getLeadershipAnalysis({
      academicYear: searchParams.get("academicYear") || "",
      teacherId: searchParams.get("teacherId") || "",
      classId: searchParams.get("classId") || "",
      assessmentType: searchParams.get("assessmentType") || "",
      targetGroup: searchParams.get("targetGroup") || "",
    });
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
