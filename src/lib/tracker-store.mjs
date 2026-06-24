import { DEMO_DATA_CSV, analyzeRecords, parseCsvText } from "./tracking.mjs";

const ROLES = {
  teacher: "teacher",
  middleLeader: "middleLeader",
  seniorLeader: "seniorLeader",
  admin: "admin",
};

const nowIso = () => new Date().toISOString();

function createSeedStore() {
  const teachers = new Map();
  const pupils = new Map();
  const classes = new Map();
  const enrollments = [];
  const assessments = [];
  const results = [];
  const records = parseCsvText(DEMO_DATA_CSV, "Seed data");
  const academicYear = "2026-2027";

  records.forEach((record, index) => {
    const teacherId = `teacher-${record.teacher.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
    if (!teachers.has(teacherId)) {
      teachers.set(teacherId, {
        id: teacherId,
        name: record.teacher,
        role: ROLES.teacher,
      });
    }

    const pupilId = `pupil-${record.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
    if (!pupils.has(pupilId)) {
      pupils.set(pupilId, {
        id: pupilId,
        name: record.name,
        stage: record.stage || "Unstaged",
        ageGroup: record.stage || "Unstaged",
        targetGroup: record.attainmentGap !== null && record.attainmentGap >= 10 ? "High support" : "Core",
        supportInfo: record.support || "Not recorded",
      });
    }

    const classId = `class-${record.stage.toLowerCase()}-${teacherId}`;
    if (!classes.has(classId)) {
      classes.set(classId, {
        id: classId,
        academicYear,
        term: "Term 1",
        stage: record.stage,
        subject: "General",
        name: `${record.stage} General`,
        teacherId,
      });

      assessments.push({
        id: `assessment-${classId}-baseline`,
        classId,
        academicYear,
        term: "Term 1",
        type: "Baseline",
        name: "Baseline check",
        testDate: "2026-09-15",
      });
    }

    enrollments.push({
      id: `enrollment-${classId}-${pupilId}`,
      classId,
      pupilId,
      academicYear,
    });

    const assessmentId = `assessment-${classId}-baseline`;
    const timestamp = nowIso();

    results.push({
      id: `result-${assessmentId}-${pupilId}-${index}`,
      assessmentId,
      pupilId,
      score: record.attainment,
      expected: record.expected,
      attendance: record.attendance,
      wellbeing: record.wellbeing,
      literacy: record.literacy,
      numeracy: record.numeracy,
      breadth: record.breadth,
      challenge: record.challenge,
      application: record.application,
      evidenceNotes: record.notes,
      source: record.source,
      version: 1,
      createdAt: timestamp,
      createdBy: teacherId,
      updatedAt: timestamp,
      updatedBy: teacherId,
    });
  });

  const leadershipRoles = [
    { id: "staff-middle-lead", name: "Middle Leader", role: ROLES.middleLeader },
    { id: "staff-senior-lead", name: "Senior Leader", role: ROLES.seniorLeader },
    { id: "staff-admin", name: "System Admin", role: ROLES.admin },
  ];

  return {
    pupils: [...pupils.values()],
    staff: [...teachers.values(), ...leadershipRoles],
    classes: [...classes.values()],
    enrollments,
    assessments,
    results,
  };
}

const store = globalThis.__trackerStore || createSeedStore();
globalThis.__trackerStore = store;

function toNumeric(value) {
  if (value === "" || value === null || value === undefined) {
    return null;
  }
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function getClassById(classId) {
  return store.classes.find((entry) => entry.id === classId) || null;
}

function getTeacherById(teacherId) {
  return store.staff.find((entry) => entry.id === teacherId) || null;
}

function canAccessClass(actor, classRecord) {
  if (!actor || !classRecord) {
    return false;
  }

  if (actor.role === ROLES.admin || actor.role === ROLES.middleLeader || actor.role === ROLES.seniorLeader) {
    return true;
  }

  return actor.role === ROLES.teacher && classRecord.teacherId === actor.id;
}

function getAssessmentForClass(classId, assessmentType = "Baseline") {
  return (
    store.assessments.find(
      (entry) => entry.classId === classId && entry.type.toLowerCase() === assessmentType.toLowerCase(),
    ) || null
  );
}

function toTeacherRow(enrollment, classRecord, assessment) {
  const pupil = store.pupils.find((entry) => entry.id === enrollment.pupilId);
  const result = store.results.find(
    (entry) => entry.assessmentId === assessment.id && entry.pupilId === enrollment.pupilId,
  );

  if (!pupil) {
    return null;
  }

  return {
    pupilId: pupil.id,
    pupilName: pupil.name,
    stage: pupil.stage,
    ageGroup: pupil.ageGroup,
    targetGroup: pupil.targetGroup,
    supportInfo: pupil.supportInfo,
    classId: classRecord.id,
    className: classRecord.name,
    subject: classRecord.subject,
    assessmentId: assessment.id,
    assessmentName: assessment.name,
    assessmentType: assessment.type,
    testDate: assessment.testDate,
    result: result
      ? {
          id: result.id,
          version: result.version,
          score: result.score,
          expected: result.expected,
          attendance: result.attendance,
          wellbeing: result.wellbeing,
          literacy: result.literacy,
          numeracy: result.numeracy,
          breadth: result.breadth,
          challenge: result.challenge,
          application: result.application,
          evidenceNotes: result.evidenceNotes || "",
          updatedAt: result.updatedAt,
          updatedBy: result.updatedBy,
        }
      : null,
  };
}

function toAnalyticsRecord(result, assessment, classRecord, pupil, teacher) {
  return {
    id: result.id,
    source: result.source || "Tracker",
    name: pupil.name,
    stage: classRecord.stage || pupil.stage,
    teacher: teacher?.name || "Unknown teacher",
    targetGroup: pupil.targetGroup,
    significantAspect: `${assessment.type} · ${classRecord.subject}`,
    support: pupil.supportInfo,
    notes: result.evidenceNotes || "",
    attainment: result.score,
    expected: result.expected,
    attainmentGap:
      result.score !== null && result.expected !== null
        ? Number((result.expected - result.score).toFixed(1))
        : null,
    attendance: result.attendance,
    wellbeing: result.wellbeing,
    literacy: result.literacy,
    numeracy: result.numeracy,
    breadth: result.breadth,
    challenge: result.challenge,
    application: result.application,
  };
}

function toCsvRow(value) {
  const text = String(value ?? "");
  if (text.includes(",") || text.includes('"') || text.includes("\n")) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

export function getTrackerContext() {
  const academicYears = [...new Set(store.classes.map((entry) => entry.academicYear))];
  const teachers = store.staff.filter((entry) => entry.role === ROLES.teacher);

  return {
    roles: Object.values(ROLES),
    academicYears,
    teachers,
    classes: store.classes.map((entry) => ({
      id: entry.id,
      name: entry.name,
      subject: entry.subject,
      stage: entry.stage,
      academicYear: entry.academicYear,
      term: entry.term,
      teacherId: entry.teacherId,
    })),
    assessmentTypes: [...new Set(store.assessments.map((entry) => entry.type))],
  };
}

export function getTeacherTrackerRows({ actorId, actorRole, teacherId, academicYear, classId, assessmentType }) {
  const actor = { id: actorId, role: actorRole || ROLES.teacher };
  const selectedClass = getClassById(classId);
  const selectedTeacher = getTeacherById(teacherId);

  if (!selectedClass || !selectedTeacher) {
    throw new Error("Teacher, class and year selection are required.");
  }

  if (selectedClass.teacherId !== selectedTeacher.id || selectedClass.academicYear !== academicYear) {
    throw new Error("The selected teacher, class and academic year do not match.");
  }

  if (!canAccessClass(actor, selectedClass)) {
    throw new Error("You do not have permission to access this class.");
  }

  const assessment = getAssessmentForClass(selectedClass.id, assessmentType || "Baseline");
  if (!assessment) {
    throw new Error("No assessment exists for this class and assessment type.");
  }

  const rows = store.enrollments
    .filter((entry) => entry.classId === selectedClass.id && entry.academicYear === academicYear)
    .map((entry) => toTeacherRow(entry, selectedClass, assessment))
    .filter(Boolean);

  return {
    metadata: {
      teacher: selectedTeacher,
      class: selectedClass,
      assessment,
    },
    rows,
  };
}

export function upsertTrackerResult(payload) {
  const actor = { id: payload.actorId, role: payload.actorRole || ROLES.teacher };
  const selectedClass = getClassById(payload.classId);

  if (!selectedClass || !canAccessClass(actor, selectedClass)) {
    throw new Error("You do not have permission to update this class.");
  }

  const assessment = getAssessmentForClass(payload.classId, payload.assessmentType || "Baseline");
  if (!assessment) {
    throw new Error("No assessment exists for this class and assessment type.");
  }

  const enrolled = store.enrollments.some(
    (entry) =>
      entry.classId === payload.classId &&
      entry.pupilId === payload.pupilId &&
      entry.academicYear === payload.academicYear,
  );

  if (!enrolled) {
    throw new Error("The selected pupil is not enrolled in this class for this academic year.");
  }

  const existing = store.results.find(
    (entry) => entry.assessmentId === assessment.id && entry.pupilId === payload.pupilId,
  );

  const timestamp = nowIso();
  const nextValues = {
    score: toNumeric(payload.score),
    expected: toNumeric(payload.expected),
    attendance: toNumeric(payload.attendance),
    wellbeing: toNumeric(payload.wellbeing),
    literacy: toNumeric(payload.literacy),
    numeracy: toNumeric(payload.numeracy),
    breadth: toNumeric(payload.breadth),
    challenge: toNumeric(payload.challenge),
    application: toNumeric(payload.application),
    evidenceNotes: String(payload.evidenceNotes || "").trim(),
  };

  if (existing) {
    if (payload.expectedVersion !== undefined && Number(payload.expectedVersion) !== existing.version) {
      const conflict = new Error("This record has changed since you loaded it. Refresh and try again.");
      conflict.code = "VERSION_CONFLICT";
      throw conflict;
    }

    Object.assign(existing, nextValues, {
      updatedAt: timestamp,
      updatedBy: actor.id,
      version: existing.version + 1,
    });
    return existing;
  }

  const created = {
    id: `result-${assessment.id}-${payload.pupilId}-${store.results.length + 1}`,
    assessmentId: assessment.id,
    pupilId: payload.pupilId,
    source: "Teacher entry",
    version: 1,
    createdAt: timestamp,
    createdBy: actor.id,
    updatedAt: timestamp,
    updatedBy: actor.id,
    ...nextValues,
  };

  store.results.push(created);
  return created;
}

export function getLeadershipAnalysis(filters = {}) {
  const filteredResults = store.results.filter((result) => {
    const assessment = store.assessments.find((entry) => entry.id === result.assessmentId);
    if (!assessment) {
      return false;
    }

    const classRecord = store.classes.find((entry) => entry.id === assessment.classId);
    if (!classRecord) {
      return false;
    }

    const pupil = store.pupils.find((entry) => entry.id === result.pupilId);
    if (!pupil) {
      return false;
    }

    if (filters.academicYear && classRecord.academicYear !== filters.academicYear) {
      return false;
    }
    if (filters.teacherId && classRecord.teacherId !== filters.teacherId) {
      return false;
    }
    if (filters.classId && classRecord.id !== filters.classId) {
      return false;
    }
    if (filters.assessmentType && assessment.type !== filters.assessmentType) {
      return false;
    }
    if (filters.targetGroup && pupil.targetGroup !== filters.targetGroup) {
      return false;
    }

    return true;
  });

  const trackingRecords = filteredResults.map((result) => {
    const assessment = store.assessments.find((entry) => entry.id === result.assessmentId);
    const classRecord = store.classes.find((entry) => entry.id === assessment.classId);
    const pupil = store.pupils.find((entry) => entry.id === result.pupilId);
    const teacher = store.staff.find((entry) => entry.id === classRecord.teacherId);
    return toAnalyticsRecord(result, assessment, classRecord, pupil, teacher);
  });

  return {
    analytics: analyzeRecords(trackingRecords),
    records: trackingRecords,
  };
}

export function exportLeadershipCsv(filters = {}) {
  const { records } = getLeadershipAnalysis(filters);
  const header = [
    "Name",
    "Stage",
    "Teacher",
    "Target group",
    "Attainment",
    "Expected",
    "Gap",
    "Attendance",
    "Wellbeing",
    "Literacy",
    "Numeracy",
    "Breadth",
    "Challenge",
    "Application",
    "Notes",
  ];

  const rows = records.map((record) => [
    record.name,
    record.stage,
    record.teacher,
    record.targetGroup || "",
    record.attainment ?? "",
    record.expected ?? "",
    record.attainmentGap ?? "",
    record.attendance ?? "",
    record.wellbeing ?? "",
    record.literacy ?? "",
    record.numeracy ?? "",
    record.breadth ?? "",
    record.challenge ?? "",
    record.application ?? "",
    record.notes || "",
  ]);

  return [header, ...rows].map((row) => row.map(toCsvRow).join(",")).join("\n");
}

export { ROLES };
