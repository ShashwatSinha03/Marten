"use client";
import { useEffect, useRef, useState } from "react";
import {
  client,
  RequestError,
  type Investigation,
  type InvestigationEvent,
  type Report,
} from "../lib/client";
import { Icon } from "./marten-app";
const active = (status: string) =>
  status === "collecting" || status === "analyzing";
const eventName = (event: InvestigationEvent) =>
  ({
    page_started: "Opening page",
    page_captured: "Captured page",
    page_failed: "Page capture failed",
    run_started: "Collection started",
    run_finished: "Collection finished",
    cancelled: "Cancellation confirmed",
    analyzing: "Analyzing evidence",
    report_completed: "Report ready",
  })[event.type] ?? event.type.replaceAll("_", " ");

export function ReportView({
  report,
  onEvidence,
  sample = false,
}: {
  report: Report;
  onEvidence?: (id: string) => void;
  sample?: boolean;
}) {
  return (
    <div className="report-content">
      <div className="report-summary">
        <h2>What Marten found</h2>
        <p>{report.summary}</p>
      </div>
      <div className="findings">
        {report.findings.length === 0 ? (
          <p>
            No supported issues were found within the inspected scope. Review
            the coverage and limitations below.
          </p>
        ) : (
          report.findings.map((finding) => (
            <article className="finding" key={finding.id}>
              <div className="finding-heading">
                <span className={`severity ${finding.severity}`}>
                  {finding.severity} impact
                </span>
                <span className="finding-kind">
                  {finding.kind === "observed" ? "Observed" : "Interpretation"}
                </span>
              </div>
              <h3>{finding.title}</h3>
              <dl>
                <dt>Observation</dt>
                <dd>{finding.observation}</dd>
                <dt>Why it matters</dt>
                <dd>{finding.impact}</dd>
                <dt>Next step</dt>
                <dd>{finding.recommendation}</dd>
              </dl>
              <div className="citations">
                <span>Evidence</span>
                {finding.evidenceIds.map((id) =>
                  sample ? (
                    <a href="#sample-evidence" key={id}>
                      {id}
                    </a>
                  ) : (
                    <button
                      className="evidence-link"
                      key={id}
                      onClick={() => onEvidence?.(id)}
                    >
                      {id}
                      <Icon name="arrow" size={12} />
                    </button>
                  ),
                )}
              </div>
            </article>
          ))
        )}
      </div>
      <section className="limitations">
        <h3>What this report doesn’t cover</h3>
        <ul>
          {report.limitations.map((limit, index) => (
            <li key={index}>{limit}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export function Workspace({
  initial,
  onBack,
}: {
  initial: Investigation;
  onBack: () => void;
}) {
  const [run, setRun] = useState(initial);
  const [events, setEvents] = useState<InvestigationEvent[]>([]);
  const [selected, setSelected] = useState<string | null>(
    initial.evidence[0]?.id ?? null,
  );
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [imageError, setImageError] = useState("");
  const [connectionError, setConnectionError] = useState("");
  const [cancelPending, setCancelPending] = useState(false);
  const [tab, setTab] = useState<"activity" | "evidence">("activity");
  const [zoom, setZoom] = useState(false);
  const sequence = useRef(0);
  const viewer = useRef<HTMLDivElement>(null);
  const evidence = run.evidence.find((item) => item.id === selected);
  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      try {
        // Read events after status: a terminal snapshot means its final events
        // are persisted, so stopping polling cannot omit the last activity.
        const nextRun = await client.get(initial.id);
        if (stopped) return;
        const nextEvents = await client.events(initial.id, sequence.current);
        if (stopped) return;
        setRun(nextRun);
        setConnectionError("");
        if (!active(nextRun.status)) setCancelPending(false);
        if (nextEvents.length) {
          sequence.current = Math.max(
            sequence.current,
            ...nextEvents.map((event) => event.sequence),
          );
          setEvents((existing) => [
            ...existing,
            ...nextEvents.filter(
              (event) =>
                !existing.some((item) => item.sequence === event.sequence),
            ),
          ]);
        }
        setSelected((existing) => existing ?? nextRun.evidence[0]?.id ?? null);
        if (active(nextRun.status)) timer = setTimeout(poll, 2500);
      } catch (error) {
        if (!stopped) {
          if (
            error instanceof RequestError &&
            ["UNAUTHORIZED", "NOT_FOUND"].includes(error.code)
          ) {
            setConnectionError(
              error.code === "UNAUTHORIZED"
                ? "Your session expired. Sign in again to view this investigation."
                : "This investigation is unavailable or has expired. Return to your investigations.",
            );
            return;
          }
          setConnectionError(
            "Updates are disconnected. Reconnecting… The investigation may still be running.",
          );
          timer = setTimeout(poll, 5000);
        }
      }
    }
    void poll();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [initial.id]);
  useEffect(() => {
    setScreenshot(null);
    setImageError("");
    setZoom(false);
    if (!selected) return;
    let stopped = false;
    let objectUrl: string | undefined;
    void client
      .screenshot(initial.id, selected)
      .then((blob) => {
        if (stopped) return;
        objectUrl = URL.createObjectURL(blob);
        setScreenshot(objectUrl);
      })
      .catch(() => {
        if (!stopped)
          setImageError(
            "Screenshot unavailable. Captured page text remains available below.",
          );
      });
    return () => {
      stopped = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [initial.id, selected]);
  function selectEvidence(id: string) {
    if (!run.evidence.some((item) => item.id === id)) return;
    setSelected(id);
    setTab("evidence");
    viewer.current?.scrollIntoView({ behavior: "auto", block: "start" });
  }
  async function cancel() {
    setCancelPending(true);
    try {
      const next = await client.cancel(run.id);
      setRun(next);
      if (!active(next.status)) setCancelPending(false);
    } catch {
      setConnectionError("Cancellation could not be requested. Try again.");
      setCancelPending(false);
    }
  }
  return (
    <section className="workspace">
      <button className="text-link" onClick={onBack}>
        <Icon name="back" size={15} /> All investigations
      </button>
      <div className="page-heading">
        <div>
          <h1>Following the evidence.</h1>
          <p className="run-url">{run.targetUrl}</p>
          {run.brief && <p>{run.brief}</p>}
        </div>
        <div className="run-actions">
          <span className="status-label" role="status">
            {run.status}
          </span>
          {active(run.status) && (
            <button
              className="button subtle small"
              disabled={cancelPending}
              onClick={cancel}
            >
              {cancelPending ? "Stopping…" : "Stop investigation"}
            </button>
          )}
        </div>
      </div>
      <div className="run-metadata">
        <span>Controlled fixture</span>
        <span>{run.evidence.length} pages captured</span>
        <span>Expires {new Date(run.expiresAt).toLocaleDateString()}</span>
      </div>
      {connectionError && (
        <p className="notice" role="status">
          {connectionError}
        </p>
      )}
      {run.errorCode && (
        <div className="notice">
          <strong>
            Investigation incomplete ·{" "}
            {run.errorCode.replaceAll("_", " ").toLowerCase()}
          </strong>
          <p>
            {run.errorCode.startsWith("PROVIDER_")
              ? "Collected evidence is preserved. Check your provider key and quota before starting a new run."
              : "Collected evidence is preserved. The investigation could not finish; start a new run to try again."}
          </p>
        </div>
      )}
      <div className="mobile-tabs" role="group" aria-label="Workspace panel">
        <button
          aria-pressed={tab === "activity"}
          onClick={() => setTab("activity")}
        >
          Activity
        </button>
        <button
          aria-pressed={tab === "evidence"}
          onClick={() => setTab("evidence")}
        >
          Evidence
        </button>
      </div>
      <div className="workspace-grid">
        <aside
          className={`activity-panel ${tab === "activity" ? "mobile-visible" : ""}`}
        >
          <h2>Activity</h2>
          {events.length === 0 ? (
            <p className="muted">Waiting for recorded activity…</p>
          ) : (
            <ol className="event-list">
              {events.map((event) => (
                <li key={event.sequence}>
                  <span className="event-marker" />
                  <div>
                    {event.pageId &&
                    run.evidence.some((item) => item.id === event.pageId) ? (
                      <button
                        className={
                          selected === event.pageId
                            ? "event-button selected"
                            : "event-button"
                        }
                        onClick={() => selectEvidence(event.pageId!)}
                      >
                        {eventName(event)}
                      </button>
                    ) : (
                      <strong>{eventName(event)}</strong>
                    )}
                    {event.url && <p className="event-url">{event.url}</p>}
                    <time dateTime={event.at}>
                      {new Date(event.at).toLocaleTimeString()}
                    </time>
                  </div>
                </li>
              ))}
            </ol>
          )}
          <div className="coverage">
            <h3>Captured pages</h3>
            {run.evidence.map((item) => (
              <button
                className={
                  selected === item.id
                    ? "coverage-link selected"
                    : "coverage-link"
                }
                key={item.id}
                onClick={() => selectEvidence(item.id)}
              >
                <span>{item.url}</span>
                <span>{item.status ?? "—"}</span>
              </button>
            ))}
          </div>
        </aside>
        <div
          ref={viewer}
          className={`evidence-panel ${tab === "evidence" ? "mobile-visible" : ""}`}
        >
          <div className="evidence-header">
            <h2>Evidence</h2>
            {screenshot && (
              <button
                className="text-link"
                onClick={() => setZoom((value) => !value)}
              >
                {zoom ? "Fit screenshot" : "Zoom screenshot"}
              </button>
            )}
          </div>
          {evidence ? (
            <>
              <div className="capture-meta">
                <span>{evidence.url}</span>
                <span>
                  HTTP {evidence.status ?? "unknown"} ·{" "}
                  {new Date(evidence.capturedAt).toLocaleTimeString()}
                </span>
              </div>
              <div
                className={`screenshot-frame ${zoom ? "zoomed" : ""}`}
                tabIndex={0}
                aria-label="Captured screenshot"
              >
                {screenshot ? (
                  <img
                    src={screenshot}
                    alt={`Captured page at ${evidence.url}`}
                  />
                ) : (
                  <p>{imageError || "Loading private screenshot…"}</p>
                )}
              </div>
              <details className="captured-text">
                <summary>Read captured page text</summary>
                <p>{evidence.text || "No visible text was captured."}</p>
              </details>
              <p className="field-help">
                A captured snapshot, not a live browser view.
              </p>
            </>
          ) : (
            <div className="evidence-empty">
              <h3>The trail starts here.</h3>
              <p>
                Captured screenshots will appear as the browser explores. You
                can inspect any page without losing your place.
              </p>
            </div>
          )}
        </div>
      </div>
      {run.report && (
        <ReportView report={run.report} onEvidence={selectEvidence} />
      )}
      {!run.report && !active(run.status) && (
        <div className="notice">
          <h2>No report was produced.</h2>
          <p>
            Review the evidence above. Start a new investigation after resolving
            the reported issue; previous runs are not resumed.
          </p>
        </div>
      )}
    </section>
  );
}
