import test from "node:test";
import assert from "node:assert/strict";
import {
  getLeadershipAnalysis,
  getTeacherTrackerRows,
  getTrackerContext,
  upsertTrackerResult,
} from "./tracker-store.mjs";

test("tracker context provides teachers, classes, years, and assessments", () => {
  const context = getTrackerContext();
  assert.ok(context.academicYears.length > 0);
  assert.ok(context.teachers.length > 0);
  assert.ok(context.classes.length > 0);
  assert.ok(context.assessmentTypes.includes("Baseline"));
});

test("teacher scoped rows load for matching class", () => {
  const context = getTrackerContext();
  const teacher = context.teachers[0];
  const classRecord = context.classes.find(
    (entry) => entry.teacherId === teacher.id && entry.academicYear === context.academicYears[0],
  );

  const payload = getTeacherTrackerRows({
    actorId: teacher.id,
    actorRole: "teacher",
    teacherId: teacher.id,
    classId: classRecord.id,
    academicYear: classRecord.academicYear,
    assessmentType: "Baseline",
  });

  assert.ok(payload.rows.length > 0);
});

test("result upsert enforces optimistic concurrency", () => {
  const context = getTrackerContext();
  const teacher = context.teachers[0];
  const classRecord = context.classes.find((entry) => entry.teacherId === teacher.id);
  const payload = getTeacherTrackerRows({
    actorId: teacher.id,
    actorRole: "teacher",
    teacherId: teacher.id,
    classId: classRecord.id,
    academicYear: classRecord.academicYear,
    assessmentType: "Baseline",
  });

  const row = payload.rows[0];
  const saved = upsertTrackerResult({
    actorId: teacher.id,
    actorRole: "teacher",
    classId: classRecord.id,
    academicYear: classRecord.academicYear,
    assessmentType: "Baseline",
    pupilId: row.pupilId,
    expectedVersion: row.result.version,
    score: 70,
    expected: 75,
    attendance: 95,
    wellbeing: 76,
    evidenceNotes: "Updated in test",
  });

  assert.equal(saved.version, row.result.version + 1);

  assert.throws(() => {
    upsertTrackerResult({
      actorId: teacher.id,
      actorRole: "teacher",
      classId: classRecord.id,
      academicYear: classRecord.academicYear,
      assessmentType: "Baseline",
      pupilId: row.pupilId,
      expectedVersion: row.result.version,
      score: 71,
    });
  }, /This record has changed since you loaded it\. Refresh and try again\./);
});

test("leadership analysis returns summary metrics", () => {
  const context = getTrackerContext();
  const analytics = getLeadershipAnalysis({ academicYear: context.academicYears[0] });
  assert.ok(analytics.analytics.summary.totalLearners > 0);
});
