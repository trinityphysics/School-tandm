import { NextResponse } from "next/server";
import { getTeacherTrackerRows, upsertTrackerResult } from "../../../../lib/tracker-store.mjs";

export async function GET(request) {
  const { searchParams } = new URL(request.url);

  try {
    const payload = getTeacherTrackerRows({
      actorId: searchParams.get("actorId") || searchParams.get("teacherId"),
      actorRole: searchParams.get("actorRole") || "teacher",
      teacherId: searchParams.get("teacherId"),
      academicYear: searchParams.get("academicYear"),
      classId: searchParams.get("classId"),
      assessmentType: searchParams.get("assessmentType") || "Baseline",
    });

    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function PUT(request) {
  try {
    const payload = await request.json();
    const result = upsertTrackerResult(payload);
    return NextResponse.json({ result });
  } catch (error) {
    const status = error.code === "VERSION_CONFLICT" ? 409 : 400;
    return NextResponse.json({ error: error.message, code: error.code || "BAD_REQUEST" }, { status });
  }
}
