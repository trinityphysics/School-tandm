import Papa from "papaparse";

const HEADER_ALIASES = {
  name: ["name", "learner", "student", "student name", "pupil", "young person"],
  stage: ["stage", "year", "year group", "class", "cohort"],
  teacher: ["teacher", "class teacher", "staff", "mentor", "subject teacher"],
  significantAspect: [
    "significant aspect",
    "significant aspects",
    "significant aspects of learning",
    "sal",
  ],
  attainment: ["attainment", "score", "current score", "achievement", "attainment score"],
  expected: ["expected", "target", "expected score", "target score", "expected attainment"],
  attendance: ["attendance", "attendance %", "attendance percent"],
  wellbeing: ["wellbeing", "wellbeing score", "health and wellbeing", "hwb"],
  literacy: ["literacy", "literacy score", "reading", "writing"],
  numeracy: ["numeracy", "numeracy score", "maths", "mathematics"],
  breadth: ["breadth", "breadth score"],
  challenge: ["challenge", "challenge score"],
  application: ["application", "application score"],
  support: ["support", "support needed", "intervention", "support plan"],
  notes: ["notes", "comment", "teacher comment", "evidence", "next steps"],
};

const THEME_GUIDANCE = {
  "Attainment gap": "Use moderation and targeted planning to review progress against expected attainment.",
  "Attendance concern": "Discuss attendance barriers early and align support with pastoral or family partners.",
  "Wellbeing concern": "Review wellbeing evidence alongside a trusted adult and agree proportionate support.",
  "Literacy concern": "Plan literacy interventions and check whether challenge and application are secure.",
  "Numeracy concern": "Review numeracy misconceptions and provide timely support or stretch tasks.",
  "Learning entitlement concern": "Check breadth, challenge and application evidence rather than isolated completion data.",
};

export const DEMO_DATA_CSV = `Name,Stage,Teacher,Significant Aspect,Attainment,Expected,Attendance,Wellbeing,Literacy,Numeracy,Breadth,Challenge,Application,Support,Notes
Aoife MacLeod,S1,Ms Grant,Reading comprehension,72,78,96,74,70,76,68,64,62,Monitor,Improving after supported reading tasks
Ben Fraser,S1,Ms Grant,Number processes,51,68,87,58,55,48,52,45,41,Yes,Attendance dip affecting progress
Cara Singh,S2,Mr Ahmed,Writing for purpose,81,82,95,79,84,75,80,78,76,No,Consistent performance across contexts
Dylan Ross,S2,Mr Ahmed,Data handling,59,71,89,63,61,54,58,57,48,Yes,Needs greater application in unfamiliar contexts
Eilidh Kerr,S3,Ms Campbell,Health and wellbeing reflection,76,76,93,82,73,70,78,77,79,No,On track and engaging well
Farah Yousaf,S3,Ms Campbell,Algebraic reasoning,48,66,84,55,58,44,46,43,40,Yes,Requires intervention and family contact
Gregor Bell,S2,Mr Ahmed,Listening and talking,67,74,91,69,72,64,63,59,57,Monitor,Needs more consistent challenge evidence
Hana Ali,S1,Ms Grant,Problem solving,88,85,98,86,82,90,84,83,87,No,Exceeding expected progress`;

function normalizeHeader(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseNumber(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const numeric = Number(String(value).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(numeric) ? numeric : null;
}

function inferFieldMap(headers) {
  const normalizedHeaders = headers.map((header) => ({
    original: header,
    normalized: normalizeHeader(header),
  }));

  return Object.fromEntries(
    Object.entries(HEADER_ALIASES).map(([field, aliases]) => [
      field,
      normalizedHeaders.find((header) => aliases.includes(header.normalized))?.original ?? null,
    ]),
  );
}

function buildRecord(rawRecord, source, index, fieldMap) {
  const textValue = (field) => {
    const header = fieldMap[field];
    return header ? String(rawRecord[header] || "").trim() : "";
  };

  const numberValue = (field) => {
    const header = fieldMap[field];
    return header ? parseNumber(rawRecord[header]) : null;
  };

  const attainment = numberValue("attainment");
  const expected = numberValue("expected");

  return {
    id: `${source}-${index}-${textValue("name") || "learner"}`,
    source,
    name: textValue("name"),
    stage: textValue("stage"),
    teacher: textValue("teacher"),
    significantAspect: textValue("significantAspect"),
    support: textValue("support"),
    notes: textValue("notes"),
    attainment,
    expected,
    attainmentGap:
      attainment !== null && expected !== null ? Number((expected - attainment).toFixed(1)) : null,
    attendance: numberValue("attendance"),
    wellbeing: numberValue("wellbeing"),
    literacy: numberValue("literacy"),
    numeracy: numberValue("numeracy"),
    breadth: numberValue("breadth"),
    challenge: numberValue("challenge"),
    application: numberValue("application"),
  };
}

function mapRecords(rawRecords, source) {
  if (!rawRecords.length) {
    throw new Error("No learner rows were found to import.");
  }

  const fieldMap = inferFieldMap(Object.keys(rawRecords[0]));
  const records = rawRecords
    .map((row, index) => buildRecord(row, source, index, fieldMap))
    .filter((record) => record.name);

  if (!records.length) {
    throw new Error("The import needs at least one row with a learner name.");
  }

  return records;
}

function scoreRecord(record) {
  const flags = [];
  let riskScore = 0;

  if (record.attainmentGap !== null && record.attainmentGap >= 5) {
    flags.push("Attainment gap");
    riskScore += record.attainmentGap >= 10 ? 3 : 2;
  }

  if (record.attendance !== null && record.attendance < 90) {
    flags.push("Attendance concern");
    riskScore += 2;
  }

  if (record.wellbeing !== null && record.wellbeing < 60) {
    flags.push("Wellbeing concern");
    riskScore += 2;
  }

  if (record.literacy !== null && record.literacy < 60) {
    flags.push("Literacy concern");
    riskScore += 1;
  }

  if (record.numeracy !== null && record.numeracy < 60) {
    flags.push("Numeracy concern");
    riskScore += 1;
  }

  const entitlementIndicators = [record.breadth, record.challenge, record.application].filter(
    (value) => value !== null,
  );

  if (entitlementIndicators.some((value) => value < 60)) {
    flags.push("Learning entitlement concern");
    riskScore += 1;
  }

  return { ...record, flags, riskScore };
}

function average(values) {
  const populated = values.filter((value) => value !== null && value !== undefined);

  if (!populated.length) {
    return null;
  }

  return populated.reduce((sum, value) => sum + value, 0) / populated.length;
}

export function parseCsvText(text, source = "CSV import") {
  const result = Papa.parse(text.trim(), {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => String(header).trim(),
  });

  if (result.errors.length) {
    throw new Error(result.errors[0].message);
  }

  return mapRecords(result.data, source);
}

export function parseWorksheetRows(rows, source = "Workbook import") {
  if (!Array.isArray(rows) || rows.length < 2) {
    throw new Error("Excel imports need a header row and at least one learner row.");
  }

  const headers = rows[0].map((header) => String(header || "").trim());
  const rawRecords = rows.slice(1).reduce((records, row) => {
    if (!row.some((cell) => String(cell ?? "").trim())) {
      return records;
    }

    records.push(
      Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ""])),
    );
    return records;
  }, []);

  return mapRecords(rawRecords, source);
}

export function parseGoogleSheetReference(value) {
  try {
    const url = new URL(value);

    if (url.hostname !== "docs.google.com") {
      return null;
    }

    const match = url.pathname.match(/\/spreadsheets\/d\/([^/]+)/);

    if (!match) {
      return null;
    }

    const hashGid = url.hash.match(/gid=(\d+)/)?.[1];
    const gid = url.searchParams.get("gid") || hashGid || "0";

    return {
      sheetId: match[1],
      gid,
    };
  } catch {
    return null;
  }
}

export function sanitizeGoogleSheetUrl(value) {
  const reference = parseGoogleSheetReference(value);

  if (!reference) {
    return null;
  }

  return `https://docs.google.com/spreadsheets/d/${reference.sheetId}/export?format=csv&gid=${reference.gid}`;
}

export function analyzeRecords(records) {
  const scoredRecords = records.map(scoreRecord);
  const flaggedRecords = scoredRecords
    .filter((record) => record.flags.length)
    .sort(
      (left, right) =>
        right.riskScore - left.riskScore ||
        (right.attainmentGap ?? 0) - (left.attainmentGap ?? 0),
    );

  const groups = Object.values(
    scoredRecords.reduce((accumulator, record) => {
      const key = record.stage || "Unstaged";
      const group =
        accumulator[key] ||
        (accumulator[key] = { name: key, count: 0, flagged: 0, gaps: [], attendance: [] });

      group.count += 1;
      group.flagged += record.flags.length ? 1 : 0;
      group.gaps.push(record.attainmentGap);
      group.attendance.push(record.attendance);
      return accumulator;
    }, {}),
  )
    .map((group) => ({
      name: group.name,
      count: group.count,
      concernRate: (group.flagged / group.count) * 100,
      averageGap: average(group.gaps),
      averageAttendance: average(group.attendance),
    }))
    .sort((left, right) => right.concernRate - left.concernRate);

  const themeCounts = flaggedRecords.reduce((accumulator, record) => {
    record.flags.forEach((flag) => {
      accumulator[flag] = (accumulator[flag] || 0) + 1;
    });
    return accumulator;
  }, {});

  const priorityThemes =
    Object.entries(themeCounts)
      .sort((left, right) => right[1] - left[1])
      .map(([label, count]) => ({
        label,
        count,
        guidance:
          THEME_GUIDANCE[label] ||
          "Use the summary signal to prompt professional dialogue and agree on the next intervention.",
      })) || [];

  return {
    summary: {
      totalLearners: scoredRecords.length,
      flaggedLearners: flaggedRecords.length,
      averageAttainment: average(scoredRecords.map((record) => record.attainment)),
      averageGap: average(scoredRecords.map((record) => record.attainmentGap)),
      averageAttendance: average(scoredRecords.map((record) => record.attendance)),
    },
    flaggedLearners: flaggedRecords.slice(0, 8),
    groupInsights: groups,
    priorityThemes: priorityThemes.length
      ? priorityThemes
      : [
          {
            label: "No themes detected",
            count: 0,
            guidance: "Import learner evidence to surface attainment, attendance and wellbeing patterns.",
          },
        ],
    preview: scoredRecords.slice(0, 8),
  };
}
