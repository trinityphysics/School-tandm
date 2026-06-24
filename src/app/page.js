"use client";

import { useMemo, useState } from "react";
import readXlsxFile from "read-excel-file/browser";
import styles from "./page.module.css";
import {
  DEMO_DATA_CSV,
  analyzeRecords,
  createManualRecord,
  parseCsvText,
  parseWorksheetRows,
} from "../lib/tracking.mjs";

const summaryCardOrder = [
  ["Learners tracked", "totalLearners"],
  ["Priority concerns", "flaggedLearners"],
  ["Off track", "offTrackLearners"],
  ["On track", "onTrackLearners"],
  ["Exceeding expectations", "exceedingLearners"],
  ["Average gap", "averageGap"],
  ["Average attendance", "averageAttendance"],
];
const templateCsvPlaceholder =
  "First,Surname,Class,Practical Section,TG,Cohort,Homework Ratio,T1 Reports\nMia,Stewart,S2,Science,TG2,Blue,95%,Off track";

function formatValue(key, value) {
  if (value === null || value === undefined) {
    return "—";
  }

  if (
    key === "totalLearners" ||
    key === "flaggedLearners" ||
    key === "offTrackLearners" ||
    key === "onTrackLearners" ||
    key === "exceedingLearners"
  ) {
    return String(value);
  }

  return `${value.toFixed(1)}%`;
}

export default function Home() {
  const [records, setRecords] = useState(() => parseCsvText(DEMO_DATA_CSV, "Demo dataset"));
  const [csvText, setCsvText] = useState("");
  const [sheetUrl, setSheetUrl] = useState("");
  const [status, setStatus] = useState("Loaded demo data so the dashboard is ready to explore.");
  const [manualFirstName, setManualFirstName] = useState("");
  const [manualSurname, setManualSurname] = useState("");
  const [manualClass, setManualClass] = useState("");
  const [manualSection, setManualSection] = useState("");
  const [manualCohort, setManualCohort] = useState("");
  const [manualTrackingStatus, setManualTrackingStatus] = useState("On track");
  const [manualAttendance, setManualAttendance] = useState("");

  const analytics = useMemo(() => analyzeRecords(records), [records]);

  const importRecords = (nextRecords, message) => {
    setRecords(nextRecords);
    setStatus(message);
  };

  const handleLoadDemo = () => {
    importRecords(parseCsvText(DEMO_DATA_CSV, "Demo dataset"), "Reloaded the demo tracking dataset.");
  };

  const handleCsvImport = () => {
    try {
      const nextRecords = parseCsvText(csvText, "Manual CSV");
      importRecords(nextRecords, `Imported ${nextRecords.length} learner records from pasted CSV.`);
    } catch (error) {
      setStatus(error.message);
    }
  };

  const handleFileUpload = async (event) => {
    const [file] = event.target.files || [];

    if (!file) {
      return;
    }

    try {
      let nextRecords;

      if (file.name.toLowerCase().endsWith(".csv")) {
        nextRecords = parseCsvText(await file.text(), file.name);
      } else {
        const rows = await readXlsxFile(file);
        nextRecords = parseWorksheetRows(rows, file.name);
      }

      importRecords(nextRecords, `Imported ${nextRecords.length} learner records from ${file.name}.`);
    } catch (error) {
      setStatus(error.message || "Unable to import that file.");
    } finally {
      event.target.value = "";
    }
  };

  const handleGoogleSheetImport = async () => {
    try {
      const response = await fetch("/api/google-sheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: sheetUrl }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Unable to import Google Sheets data.");
      }

      importRecords(
        payload.records,
        `Imported ${payload.records.length} learner records from Google Sheets.`,
      );
    } catch (error) {
      setStatus(error.message);
    }
  };

  const handleManualEntry = () => {
    try {
      const nextRecord = createManualRecord({
        First: manualFirstName,
        Surname: manualSurname,
        Class: manualClass,
        "Practical Section": manualSection,
        Cohort: manualCohort,
        "T1 Reports": manualTrackingStatus,
        Attendance: manualAttendance,
      });
      const nextRecords = [...records, nextRecord];
      importRecords(nextRecords, `Added ${nextRecord.name} from manual input.`);
      setManualFirstName("");
      setManualSurname("");
      setManualClass("");
      setManualSection("");
      setManualCohort("");
      setManualTrackingStatus("On track");
      setManualAttendance("");
    } catch (error) {
      setStatus(error.message);
    }
  };

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>Broad General Education</span>
          <h1>Tracking and monitoring that drives action, not bureaucracy.</h1>
          <p>
            Import SEEMiS, parent portal and spreadsheet exports, review learner trends, and
            surface the attainment gaps or wellbeing concerns that need professional dialogue and
            timely intervention.
          </p>
        </div>
        <div className={styles.heroActions}>
          <button type="button" className={styles.primaryButton} onClick={handleLoadDemo}>
            Load demo dataset
          </button>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={() => {
              setRecords([]);
              setStatus("Dashboard cleared. Import a dataset to begin.");
            }}
          >
            Clear dashboard
          </button>
        </div>
      </section>

      <section className={styles.grid}>
        <article className={styles.panel}>
          <h2>Import learner evidence</h2>
          <p className={styles.panelIntro}>
            Manual entry is the primary workflow for continuous S1-S3 (Broad General Education
            years) tracking; uploads remain an additional way to convert existing exports into the
            shared template.
          </p>

          <div className={styles.importStack}>
            <label className={styles.fieldLabel}>
              First name
              <input
                className={styles.input}
                value={manualFirstName}
                onChange={(event) => setManualFirstName(event.target.value)}
              />
            </label>
            <label className={styles.fieldLabel}>
              Surname
              <input
                className={styles.input}
                value={manualSurname}
                onChange={(event) => setManualSurname(event.target.value)}
              />
            </label>
            <label className={styles.fieldLabel}>
              Class (S1-S3)
              <input
                className={styles.input}
                value={manualClass}
                onChange={(event) => setManualClass(event.target.value)}
                placeholder="S1 / S2 / S3"
              />
            </label>
            <label className={styles.fieldLabel}>
              Practical section / subject
              <input
                className={styles.input}
                value={manualSection}
                onChange={(event) => setManualSection(event.target.value)}
              />
            </label>
            <label className={styles.fieldLabel}>
              Cohort
              <input
                className={styles.input}
                value={manualCohort}
                onChange={(event) => setManualCohort(event.target.value)}
              />
            </label>
            <label className={styles.fieldLabel}>
              Tracking status
              <select
                className={styles.input}
                value={manualTrackingStatus}
                onChange={(event) => setManualTrackingStatus(event.target.value)}
              >
                <option>Off track</option>
                <option>On track</option>
                <option>Exceeding expectations</option>
              </select>
            </label>
            <label className={styles.fieldLabel}>
              Attendance %
              <input
                className={styles.input}
                value={manualAttendance}
                onChange={(event) => setManualAttendance(event.target.value)}
              />
            </label>
            <button type="button" className={styles.primaryButton} onClick={handleManualEntry}>
              Add learner
            </button>

            <label className={styles.fieldLabel}>
              Paste CSV
              <textarea
                className={styles.textarea}
                value={csvText}
                onChange={(event) => setCsvText(event.target.value)}
                placeholder={templateCsvPlaceholder}
              />
            </label>
            <button type="button" className={styles.secondaryButton} onClick={handleCsvImport}>
              Import pasted CSV
            </button>

            <label className={styles.fieldLabel}>
              Published Google Sheets URL
              <input
                className={styles.input}
                value={sheetUrl}
                onChange={(event) => setSheetUrl(event.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/.../edit"
              />
            </label>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={handleGoogleSheetImport}
            >
              Import Google Sheet
            </button>

            <label className={styles.uploadLabel}>
              Additional upload (CSV / XLSX export)
              <input type="file" accept=".csv,.xlsx,.xls" onChange={handleFileUpload} />
            </label>
          </div>

          <div className={styles.hintList}>
            <h3>Suggested columns</h3>
            <ul>
              <li>First, Surname, Class, Practical Section, TG, Cohort, Homework Ratio</li>
              <li>Tracking points through the year: T1 Reports, T2 Reports, T3 Reports</li>
              <li>Attainment status values: Off track, On track, Exceeding expectations</li>
              <li>Use the same learner profile from S1 to S3 across all subjects</li>
            </ul>
          </div>
        </article>

        <article className={styles.panel}>
          <h2>What the dashboard prioritises</h2>
          <div className={styles.principles}>
            <div>
              <h3>Meaningful evidence</h3>
              <p>Focus on progress, breadth, challenge and application rather than checkbox data.</p>
            </div>
            <div>
              <h3>Professional judgement</h3>
              <p>Use summary signals to trigger moderation, dialogue and review of learner needs.</p>
            </div>
            <div>
              <h3>Timely intervention</h3>
              <p>Surface gaps early so support, challenge and next steps can be agreed quickly.</p>
            </div>
          </div>
          <p className={styles.status}>{status}</p>
        </article>
      </section>

      <section className={styles.summaryGrid}>
        {summaryCardOrder.map(([label, key]) => (
          <article key={key} className={styles.summaryCard}>
            <span>{label}</span>
            <strong>{formatValue(key, analytics.summary[key])}</strong>
          </article>
        ))}
      </section>

      <section className={styles.grid}>
        <article className={styles.panel}>
          <h2>Priority learners for dialogue</h2>
          {analytics.flaggedLearners.length === 0 ? (
            <p className={styles.emptyState}>Import data to generate learner-level concerns.</p>
          ) : (
            <div className={styles.recordList}>
              {analytics.flaggedLearners.map((record) => (
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
                  <p className={styles.recordMeta}>
                    {record.significantAspect || "Significant aspect not provided"}
                    {record.notes ? ` · ${record.notes}` : ""}
                  </p>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className={styles.panel}>
          <h2>Whole-school trend view</h2>
          {analytics.groupInsights.length === 0 ? (
            <p className={styles.emptyState}>No grouped trend information is available yet.</p>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Group</th>
                    <th>Learners</th>
                    <th>Concern rate</th>
                    <th>Off-track rate</th>
                    <th>Avg gap</th>
                    <th>Attendance</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.groupInsights.map((group) => (
                    <tr key={group.name}>
                      <td>{group.name}</td>
                      <td>{group.count}</td>
                      <td>{group.concernRate.toFixed(1)}%</td>
                      <td>{group.offTrackRate.toFixed(1)}%</td>
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

      <section className={styles.grid}>
        <article className={styles.panel}>
          <h2>Suggested intervention themes</h2>
          <div className={styles.priorityList}>
            {analytics.priorityThemes.map((theme) => (
              <div key={theme.label} className={styles.priorityCard}>
                <div>
                  <strong>{theme.label}</strong>
                  <p>{theme.guidance}</p>
                </div>
                <span>{theme.count}</span>
              </div>
            ))}
          </div>
        </article>

        <article className={styles.panel}>
          <h2>Data preview</h2>
          {analytics.preview.length === 0 ? (
            <p className={styles.emptyState}>No learner records loaded.</p>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Stage</th>
                    <th>Attainment status</th>
                    <th>Gap</th>
                    <th>Attendance</th>
                    <th>Source</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.preview.map((record) => (
                    <tr key={record.id}>
                      <td>{record.name}</td>
                      <td>{record.stage || "—"}</td>
                      <td>{record.attainmentStatus || "—"}</td>
                      <td>
                        {record.attainmentGap === null
                          ? "—"
                          : `${record.attainmentGap.toFixed(1)}%`}
                      </td>
                      <td>{record.attendance === null ? "—" : `${record.attendance}%`}</td>
                      <td>{record.source}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>
      </section>
    </main>
  );
}
