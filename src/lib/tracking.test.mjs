import test from "node:test";
import assert from "node:assert/strict";

import {
  analyzeRecords,
  parseCsvText,
  sanitizeGoogleSheetUrl,
} from "./tracking.mjs";

test("parseCsvText maps common tracking headers", () => {
  const records = parseCsvText(`Student Name,Year,Score,Target,Attendance %,HWB
Jamie,S1,62,75,88,59`);

  assert.equal(records[0].name, "Jamie");
  assert.equal(records[0].stage, "S1");
  assert.equal(records[0].gap, 13);
  assert.equal(records[0].attendance, 88);
  assert.equal(records[0].wellbeing, 59);
});

test("analyzeRecords highlights attainment and attendance concerns", () => {
  const analytics = analyzeRecords(
    parseCsvText(`Name,Stage,Attainment,Expected,Attendance,Wellbeing
Pupil A,S2,50,68,87,55
Pupil B,S2,82,82,96,78`),
  );

  assert.equal(analytics.summary.totalLearners, 2);
  assert.equal(analytics.summary.flaggedLearners, 1);
  assert.equal(analytics.flaggedLearners[0].name, "Pupil A");
  assert.ok(analytics.flaggedLearners[0].flags.includes("Attainment gap"));
  assert.ok(analytics.flaggedLearners[0].flags.includes("Attendance concern"));
});

test("sanitizeGoogleSheetUrl only allows Google Sheets links", () => {
  assert.equal(
    sanitizeGoogleSheetUrl("https://docs.google.com/spreadsheets/d/abc123/edit#gid=456"),
    "https://docs.google.com/spreadsheets/d/abc123/export?format=csv&gid=0",
  );
  assert.equal(sanitizeGoogleSheetUrl("https://example.com/data.csv"), null);
});
