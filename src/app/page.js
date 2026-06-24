"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./page.module.css";

const summaryCardOrder = [
  ["Learners tracked", "totalLearners"],
  ["Priority concerns", "flaggedLearners"],
  ["Average attainment", "averageAttainment"],
  ["Average gap", "averageGap"],
  ["Average attendance", "averageAttendance"],
];

function formatValue(key, value) {
  if (value === null || value === undefined) {
    return "—";
  }
  if (key === "totalLearners" || key === "flaggedLearners") {
    return String(value);
  }
  return `${value.toFixed(1)}%`;
}

function asNumber(value) {
  return value === "" ? null : Number(value);
}

export default function Home() {
  const [view, setView] = useState("teacher");
  const [status, setStatus] = useState("Loading tracker context...");
  const [context, setContext] = useState({
    academicYears: [],
    teachers: [],
    classes: [],
    assessmentTypes: [],
  });
  const [teacherSelection, setTeacherSelection] = useState({
    academicYear: "",
    teacherId: "",
    classId: "",
    assessmentType: "Baseline",
  });
  const [teacherRows, setTeacherRows] = useState([]);
  const [analysisFilters, setAnalysisFilters] = useState({
    academicYear: "",
    teacherId: "",
    classId: "",
    assessmentType: "",
    targetGroup: "",
  });
  const [analysis, setAnalysis] = useState({
    summary: {
      totalLearners: 0,
      flaggedLearners: 0,
      averageAttainment: null,
      averageGap: null,
      averageAttendance: null,
    },
    flaggedLearners: [],
    groupInsights: [],
    priorityThemes: [],
    preview: [],
  });

  const classesForTeacher = useMemo(
    () =>
      context.classes.filter(
        (entry) =>
          entry.teacherId === teacherSelection.teacherId &&
          entry.academicYear === teacherSelection.academicYear,
      ),
    [context.classes, teacherSelection.teacherId, teacherSelection.academicYear],
  );

  useEffect(() => {
    const loadContext = async () => {
      const response = await fetch("/api/tracker/context");
      const payload = await response.json();
      setContext(payload);

      const defaultYear = payload.academicYears[0] || "";
      const defaultTeacher = payload.teachers[0]?.id || "";
      const defaultClass =
        payload.classes.find(
          (entry) => entry.teacherId === defaultTeacher && entry.academicYear === defaultYear,
        )?.id || "";
      const defaultAssessment = payload.assessmentTypes[0] || "Baseline";

      setTeacherSelection({
        academicYear: defaultYear,
        teacherId: defaultTeacher,
        classId: defaultClass,
        assessmentType: defaultAssessment,
      });

      setAnalysisFilters({
        academicYear: defaultYear,
        teacherId: "",
        classId: "",
        assessmentType: "",
        targetGroup: "",
      });
      setStatus("Tracker context loaded.");
    };

    loadContext().catch(() => setStatus("Unable to load tracker context."));
  }, []);

  useEffect(() => {
    if (!teacherSelection.academicYear || !teacherSelection.teacherId || !teacherSelection.classId) {
      return;
    }

    const params = new URLSearchParams({
      actorRole: "teacher",
      actorId: teacherSelection.teacherId,
      teacherId: teacherSelection.teacherId,
      classId: teacherSelection.classId,
      academicYear: teacherSelection.academicYear,
      assessmentType: teacherSelection.assessmentType,
    });

    fetch(`/api/tracker/records?${params.toString()}`)
      .then((response) => response.json())
      .then((payload) => {
        if (payload.error) {
          setStatus(payload.error);
          return;
        }
        setTeacherRows(
          payload.rows.map((row) => ({
            ...row,
            draft: {
              score: row.result?.score ?? "",
              expected: row.result?.expected ?? "",
              attendance: row.result?.attendance ?? "",
              wellbeing: row.result?.wellbeing ?? "",
              evidenceNotes: row.result?.evidenceNotes ?? "",
            },
          })),
        );
        setStatus(`Loaded ${payload.rows.length} pupil records for teacher input.`);
      })
      .catch(() => setStatus("Unable to load teacher records."));
  }, [teacherSelection]);

  useEffect(() => {
    const params = new URLSearchParams(
      Object.entries(analysisFilters).filter(([, value]) => value),
    );
    fetch(`/api/tracker/analysis?${params.toString()}`)
      .then((response) => response.json())
      .then((payload) => {
        if (!payload.error) {
          setAnalysis(payload.analytics);
        }
      });
  }, [analysisFilters]);

  const updateRow = (index, field, value) => {
    setTeacherRows((current) =>
      current.map((row, rowIndex) =>
        rowIndex === index ? { ...row, draft: { ...row.draft, [field]: value } } : row,
      ),
    );
  };

  const saveRow = async (row) => {
    const response = await fetch("/api/tracker/records", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        actorId: teacherSelection.teacherId,
        actorRole: "teacher",
        teacherId: teacherSelection.teacherId,
        classId: teacherSelection.classId,
        academicYear: teacherSelection.academicYear,
        assessmentType: teacherSelection.assessmentType,
        pupilId: row.pupilId,
        expectedVersion: row.result?.version,
        score: asNumber(row.draft.score),
        expected: asNumber(row.draft.expected),
        attendance: asNumber(row.draft.attendance),
        wellbeing: asNumber(row.draft.wellbeing),
        evidenceNotes: row.draft.evidenceNotes,
      }),
    });

    const payload = await response.json();
    if (!response.ok) {
      setStatus(payload.error || "Unable to save result.");
      return;
    }

    setStatus(`Saved ${row.pupilName}'s result to the central tracker.`);
    setTeacherSelection((current) => ({ ...current }));
  };

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>School tracking and monitoring</span>
          <h1>Centralized pupil outcomes with teacher input and leadership analytics.</h1>
          <p>
            Teachers enter assessment outcomes against class and year selections. Middle and senior
            leaders filter the same central tracker for attainment, progress and intervention views.
          </p>
        </div>
        <div className={styles.heroActions}>
          <button
            type="button"
            className={view === "teacher" ? styles.primaryButton : styles.secondaryButton}
            onClick={() => setView("teacher")}
          >
            Teacher input
          </button>
          <button
            type="button"
            className={view === "leadership" ? styles.primaryButton : styles.secondaryButton}
            onClick={() => setView("leadership")}
          >
            Leadership analysis
          </button>
        </div>
        <p className={styles.status}>{status}</p>
      </section>

      {view === "teacher" ? (
        <section className={styles.grid}>
          <article className={styles.panel}>
            <h2>Teacher selection</h2>
            <div className={styles.importStack}>
              <label className={styles.fieldLabel}>
                Academic year
                <select
                  className={styles.input}
                  value={teacherSelection.academicYear}
                  onChange={(event) =>
                    setTeacherSelection((current) => ({
                      ...current,
                      academicYear: event.target.value,
                      classId: "",
                    }))
                  }
                >
                  {context.academicYears.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </label>
              <label className={styles.fieldLabel}>
                Teacher
                <select
                  className={styles.input}
                  value={teacherSelection.teacherId}
                  onChange={(event) =>
                    setTeacherSelection((current) => ({
                      ...current,
                      teacherId: event.target.value,
                      classId: "",
                    }))
                  }
                >
                  {context.teachers.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className={styles.fieldLabel}>
                Class / subject
                <select
                  className={styles.input}
                  value={teacherSelection.classId}
                  onChange={(event) =>
                    setTeacherSelection((current) => ({ ...current, classId: event.target.value }))
                  }
                >
                  <option value="">Select class</option>
                  {classesForTeacher.map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entry.name} ({entry.subject})
                    </option>
                  ))}
                </select>
              </label>
              <label className={styles.fieldLabel}>
                Assessment type
                <select
                  className={styles.input}
                  value={teacherSelection.assessmentType}
                  onChange={(event) =>
                    setTeacherSelection((current) => ({
                      ...current,
                      assessmentType: event.target.value,
                    }))
                  }
                >
                  {context.assessmentTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </article>

          <article className={styles.panel}>
            <h2>Class tracker input</h2>
            {teacherRows.length === 0 ? (
              <p className={styles.emptyState}>Select a class to load pupil tracking rows.</p>
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Pupil</th>
                      <th>Target group</th>
                      <th>Score</th>
                      <th>Expected</th>
                      <th>Attendance</th>
                      <th>Wellbeing</th>
                      <th>Evidence</th>
                      <th>Save</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teacherRows.map((row, index) => (
                      <tr key={row.pupilId}>
                        <td>{row.pupilName}</td>
                        <td>{row.targetGroup}</td>
                        <td>
                          <input
                            className={styles.input}
                            value={row.draft.score}
                            onChange={(event) => updateRow(index, "score", event.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            className={styles.input}
                            value={row.draft.expected}
                            onChange={(event) => updateRow(index, "expected", event.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            className={styles.input}
                            value={row.draft.attendance}
                            onChange={(event) => updateRow(index, "attendance", event.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            className={styles.input}
                            value={row.draft.wellbeing}
                            onChange={(event) => updateRow(index, "wellbeing", event.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            className={styles.input}
                            value={row.draft.evidenceNotes}
                            onChange={(event) => updateRow(index, "evidenceNotes", event.target.value)}
                          />
                        </td>
                        <td>
                          <button
                            type="button"
                            className={styles.secondaryButton}
                            onClick={() => saveRow(row)}
                          >
                            Save
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </article>
        </section>
      ) : (
        <>
          <section className={styles.grid}>
            <article className={styles.panel}>
              <h2>Leadership filters</h2>
              <div className={styles.importStack}>
                <label className={styles.fieldLabel}>
                  Academic year
                  <select
                    className={styles.input}
                    value={analysisFilters.academicYear}
                    onChange={(event) =>
                      setAnalysisFilters((current) => ({
                        ...current,
                        academicYear: event.target.value,
                      }))
                    }
                  >
                    <option value="">All years</option>
                    {context.academicYears.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={styles.fieldLabel}>
                  Teacher
                  <select
                    className={styles.input}
                    value={analysisFilters.teacherId}
                    onChange={(event) =>
                      setAnalysisFilters((current) => ({ ...current, teacherId: event.target.value }))
                    }
                  >
                    <option value="">All teachers</option>
                    {context.teachers.map((teacher) => (
                      <option key={teacher.id} value={teacher.id}>
                        {teacher.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={styles.fieldLabel}>
                  Class
                  <select
                    className={styles.input}
                    value={analysisFilters.classId}
                    onChange={(event) =>
                      setAnalysisFilters((current) => ({ ...current, classId: event.target.value }))
                    }
                  >
                    <option value="">All classes</option>
                    {context.classes.map((entry) => (
                      <option key={entry.id} value={entry.id}>
                        {entry.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={styles.fieldLabel}>
                  Assessment
                  <select
                    className={styles.input}
                    value={analysisFilters.assessmentType}
                    onChange={(event) =>
                      setAnalysisFilters((current) => ({
                        ...current,
                        assessmentType: event.target.value,
                      }))
                    }
                  >
                    <option value="">All assessment types</option>
                    {context.assessmentTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={styles.fieldLabel}>
                  Target group
                  <select
                    className={styles.input}
                    value={analysisFilters.targetGroup}
                    onChange={(event) =>
                      setAnalysisFilters((current) => ({
                        ...current,
                        targetGroup: event.target.value,
                      }))
                    }
                  >
                    <option value="">All groups</option>
                    <option value="Core">Core</option>
                    <option value="High support">High support</option>
                  </select>
                </label>
              </div>
              <a
                className={styles.secondaryButton}
                href={`/api/tracker/export?${new URLSearchParams(
                  Object.entries(analysisFilters).filter(([, value]) => value),
                ).toString()}`}
              >
                Export filtered CSV
              </a>
            </article>
          </section>

          <section className={styles.summaryGrid}>
            {summaryCardOrder.map(([label, key]) => (
              <article key={key} className={styles.summaryCard}>
                <span>{label}</span>
                <strong>{formatValue(key, analysis.summary[key])}</strong>
              </article>
            ))}
          </section>

          <section className={styles.grid}>
            <article className={styles.panel}>
              <h2>Priority learners for dialogue</h2>
              {analysis.flaggedLearners.length === 0 ? (
                <p className={styles.emptyState}>No flagged learners in the selected filters.</p>
              ) : (
                <div className={styles.recordList}>
                  {analysis.flaggedLearners.map((record) => (
                    <div key={record.id} className={styles.recordCard}>
                      <div className={styles.recordHeader}>
                        <div>
                          <h3>{record.name}</h3>
                          <p>
                            {record.stage || "Unstaged"} · {record.teacher || "Teacher not provided"}
                          </p>
                        </div>
                        <span className={styles.riskScore}>Risk {record.riskScore}</span>
                      </div>
                      <div className={styles.flagList}>
                        {record.flags.map((flag) => (
                          <span key={flag} className={styles.flag}>
                            {flag}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </article>

            <article className={styles.panel}>
              <h2>Whole-school trend view</h2>
              {analysis.groupInsights.length === 0 ? (
                <p className={styles.emptyState}>No grouped trend information is available yet.</p>
              ) : (
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Group</th>
                        <th>Learners</th>
                        <th>Concern rate</th>
                        <th>Avg gap</th>
                        <th>Attendance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analysis.groupInsights.map((group) => (
                        <tr key={group.name}>
                          <td>{group.name}</td>
                          <td>{group.count}</td>
                          <td>{group.concernRate.toFixed(1)}%</td>
                          <td>{group.averageGap === null ? "—" : `${group.averageGap.toFixed(1)}%`}</td>
                          <td>
                            {group.averageAttendance === null
                              ? "—"
                              : `${group.averageAttendance.toFixed(1)}%`}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </article>
          </section>
        </>
      )}
    </main>
  );
}
