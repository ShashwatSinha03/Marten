"use client";

import { useEffect, useRef, useState } from "react";
import { authClient } from "../lib/auth-client";
import {
  client,
  apiConfigured,
  FIXTURE_URL,
  type Investigation,
} from "../lib/client";
import { Workspace, ReportView } from "./workspace";
import { MartenMascot } from "./marten-mascot";
import { useSlowRequest } from "../lib/use-slow-request";
import { sampleReport } from "../lib/sample";

export function Icon({
  name,
  size = 18,
}: {
  name: "arrow" | "plus" | "back" | "external" | "check";
  size?: number;
}) {
  const paths = {
    arrow: "M4 12h16m-6-6 6 6-6 6",
    plus: "M12 5v14M5 12h14",
    back: "M20 12H4m6-6-6 6 6 6",
    external: "M14 4h6v6m0-6L10 14M10 4H4v16h16v-6",
    check: "m5 12 4 4L19 6",
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  );
}
const errorText = (error: unknown) =>
  error instanceof Error
    ? error.message
    : "Something went wrong. Please try again.";

export function MartenApp({ authConfigured }: { authConfigured: boolean }) {
  const authState = authClient.useSession();
  const session = authConfigured && !authState.error ? authState.data : null;
  const configured = authConfigured && apiConfigured;
  const [view, setView] = useState<
    "home" | "start" | "sample" | "history" | "run"
  >("home");
  const [url, setUrl] = useState("");
  const [brief, setBrief] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<Investigation[]>([]);
  const [run, setRun] = useState<Investigation | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState(false);
  const [authPending, setAuthPending] = useState(false);
  const slow = useSlowRequest(busy || historyLoading || authPending);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const account = useRef<string | null>(null);
  const navigation = useRef(0);
  const titleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    let draft: string | null = null;
    try {
      draft = sessionStorage.getItem("marten-draft");
      sessionStorage.removeItem("marten-draft");
    } catch {
      /* Storage can be disabled. */
    }
    if (draft) {
      try {
        const data = JSON.parse(draft);
        setUrl(typeof data.url === "string" ? data.url : "");
        setBrief(typeof data.brief === "string" ? data.brief : "");
        setView("start");
      } catch {
        /* discard invalid non-secret draft */
      }
    }
  }, []);

  useEffect(() => {
    if (authConfigured && authState.error) setError("Sign-in could not be checked. Check your connection and try again.");
  }, [authConfigured, authState.error]);

  const userId = session?.user.id ?? null;
  useEffect(() => {
    if (account.current !== userId) {
      const previous = account.current;
      account.current = userId;
      navigation.current++;
      setRun(null);
      setHistory([]);
      setApiKey("");
      setBusy(false);
      setHistoryLoading(false);
      if (previous && !userId) setView("start");
    }
  }, [userId]);

  function navigate(next: typeof view) {
    navigation.current++;
    setError("");
    setView(next);
    setApiKey("");
    setBusy(false);
    setHistoryLoading(false);
    window.scrollTo({ top: 0 });
  }
  async function signIn(provider: "github" | "google") {
    setApiKey("");
    if (!authConfigured) {
      setError(
        "Sign-in is not configured on this deployment. You can explore the sample report below.",
      );
      return;
    }
    try {
      sessionStorage.setItem("marten-draft", JSON.stringify({ url, brief }));
    } catch {
      /* Sign-in still works without draft storage. */
    }
    setAuthPending(true);
    try {
      const { error } = await authClient.signIn.social({
        provider,
        callbackURL: `${window.location.origin}/auth/callback`,
      });
      if (error) throw error;
    } catch {
      setError("Sign-in could not start. Check your connection and try again.");
    } finally {
      setAuthPending(false);
    }
  }
  async function loadHistory() {
    navigate("history");
    if (!session) return;
    setHistoryLoading(true);
    setHistoryError(false);
    const ticket = navigation.current;
    try {
      const items = await client.list();
      if (ticket === navigation.current) setHistory(items);
    } catch (e) {
      if (ticket === navigation.current) { setError(errorText(e)); setHistoryError(true); }
    } finally {
      if (ticket === navigation.current) setHistoryLoading(false);
    }
  }
  async function start(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (url.trim() !== FIXTURE_URL) {
      setError(
        `Public website investigations are not enabled yet. Use ${FIXTURE_URL} to investigate the controlled fixture.`,
      );
      return;
    }
    if (!apiKey.trim()) {
      setError("Enter your Gemini API key for this investigation.");
      return;
    }
    if (busy) return;
    const ticket = navigation.current;
    setBusy(true);
    const transientKey = apiKey.trim();
    setApiKey("");
    try {
      const created = await client.create({
        targetUrl: url.trim(),
        brief,
        apiKey: transientKey,
        mode: "fixture",
      });
      if (ticket === navigation.current) {
        setRun(created);
        setView("run");
      }
    } catch (e) {
      if (ticket === navigation.current) setError(errorText(e));
    } finally {
      if (ticket === navigation.current) setBusy(false);
    }
  }
  async function openRun(id: string) {
    const ticket = navigation.current;
    setBusy(true);
    try {
      const next = await client.get(id);
      if (ticket === navigation.current) {
        setRun(next);
        navigate("run");
      }
    } catch (e) {
      if (ticket === navigation.current) setError(errorText(e));
    } finally {
      if (ticket === navigation.current) setBusy(false);
    }
  }
  async function removeRun(id: string) {
    const ticket = navigation.current;
    setBusy(true);
    try {
      await client.remove(id);
      if (ticket !== navigation.current) return;
      setHistory((items) => items.filter((item) => item.id !== id));
      setDeleteId(null);
    } catch (e) {
      if (ticket === navigation.current) setError(errorText(e));
    } finally {
      if (ticket === navigation.current) setBusy(false);
    }
  }

  return (
    <div className="site-shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="header">
        <button
          className="wordmark"
          onClick={() => navigate("home")}
          aria-label="Marten home"
        >
          marten
          <span className="brand-dot" />
        </button>
        <nav aria-label="Main navigation">
          <button
            className={view === "sample" ? "nav-link active" : "nav-link"}
            onClick={() => navigate("sample")}
          >
            Sample report
          </button>
          <button
            className={view === "history" ? "nav-link active" : "nav-link"}
            onClick={loadHistory}
          >
            Investigations
          </button>
          {session ? (
            <button
              className="button subtle small"
              onClick={async () => {
                setApiKey("");
                try {
                  const result = await authClient.signOut();
                  if (result?.error) throw result.error;
                  navigate("home");
                } catch {
                  setError("Sign-out failed. Check your connection and try again.");
                }
              }}
            >
              Sign out
            </button>
          ) : (
            <button
              className="button subtle small"
              onClick={() => navigate("start")}
            >
              Sign in <Icon name="arrow" size={15} />
            </button>
          )}
        </nav>
      </header>
      <main id="main">
        {slow && <p className="notice" role="status">This is taking longer than usual. The service may be waking up; please keep this page open while we wait.</p>}
        {error && (
          <div className="error-banner" role="alert">
            {error}
            <button onClick={() => setError("")} aria-label="Dismiss error">
              Dismiss
            </button>
          </div>
        )}
        {view === "home" && (
          <>
            <section className="hero">
              <div className="hero-copy">
                <h1 ref={titleRef}>
                  A closer look.
                  <br />
                  <span>A clearer picture.</span>
                </h1>
                <p className="hero-description">
                  Meet Marten. Your quietly curious investigator for the things
                  hiding in plain sight.
                </p>
                <p className="hero-detail">
                  Give it a website. Follow the evidence. Understand what needs
                  your attention.
                </p>
                <form
                  className="url-entry"
                  onSubmit={(event) => {
                    event.preventDefault();
                    navigate("start");
                  }}
                >
                  <label className="sr-only" htmlFor="hero-url">
                    Website URL
                  </label>
                  <input
                    id="hero-url"
                    type="url"
                    placeholder="https://your-product.com"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                  />
                  <button className="button primary" type="submit">
                    Take a closer look <Icon name="arrow" />
                  </button>
                </form>
                <div className="entry-notes">
                  <span className="status-dot" />
                  Early preview · Controlled fixture investigations
                </div>
                <button
                  className="text-link sample-link"
                  onClick={() => navigate("sample")}
                >
                  See what an investigation reveals{" "}
                  <Icon name="arrow" size={16} />
                </button>
              </div>
              <div className="mascot-wrap">
                <MartenMascot pose="observe" className="hero-mascot" />
                <div className="mascot-note">
                  <span className="tiny-line" />
                  Naturally observant.
                </div>
              </div>
            </section>
            <section className="approach" aria-labelledby="approach-title">
              <div>
                <h2 id="approach-title">
                  Less guesswork.
                  <br />
                  More evidence.
                </h2>
                <p>A report you can trace back to what actually happened.</p>
              </div>
              <div className="approach-list">
                <article>
                  <h3>Watch the exploration</h3>
                  <p>
                    Follow real activity and captured pages as the browser
                    collects evidence.
                  </p>
                </article>
                <article>
                  <h3>Understand the finding</h3>
                  <p>
                    See observations, their likely impact, and a practical next
                    step—kept clearly separate.
                  </p>
                </article>
                <article>
                  <h3>Know the limits</h3>
                  <p>
                    Every report tells you what was inspected and what remains
                    untested.
                  </p>
                </article>
              </div>
            </section>
          </>
        )}
        {view === "start" && (
          <section className="start-layout">
            <div className="start-intro">
              <button className="text-link" onClick={() => navigate("home")}>
                <Icon name="back" size={16} /> Back
              </button>
              <h1>
                Good questions
                <br />
                start here.
              </h1>
              <p>
                One URL. An optional brief.
                <br />A trail of evidence you can follow.
              </p>
              <MartenMascot pose={busy ? "think" : "ready"} className="small-mascot" />
            </div>
            <div className="start-panel">
              <h2>Start an investigation</h2>
              <p className="muted">
                Controlled preview · up to three fixture pages
              </p>
              <div className="notice">
                <strong>Public website runs are coming next.</strong>
                <p>
                  This preview investigates our controlled fixture only. It
                  collects real screenshots and uses your Gemini key for
                  analysis.
                </p>
                <button
                  className="text-link"
                  onClick={() => setUrl(FIXTURE_URL)}
                >
                  Use the fixture URL <Icon name="arrow" size={16} />
                </button>
              </div>
              <form onSubmit={start}>
                <label htmlFor="target-url">Website URL</label>
                <input
                  id="target-url"
                  type="url"
                  required
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder={FIXTURE_URL}
                  aria-describedby="scope-note"
                />
                <p className="field-help" id="scope-note">
                  Only {FIXTURE_URL} is available in this preview.
                </p>
                <label htmlFor="brief">
                  Investigation brief <span className="muted">Optional</span>
                </label>
                <textarea
                  id="brief"
                  rows={3}
                  maxLength={1000}
                  value={brief}
                  onChange={(e) => setBrief(e.target.value)}
                  placeholder="Can a visitor find pricing and reach signup?"
                />
                <p className="field-help">
                  Leave blank for automatic exploration within the fixture.
                </p>
                {!session ? (
                  <div className="auth-section">
                    <h3>Sign in to keep the evidence.</h3>
                    <p>
                      Your investigations and reports belong to your account.
                    </p>
                    <div className="auth-buttons">
                      <button
                        type="button"
                        className="button subtle"
                        disabled={authPending}
                        onClick={() => signIn("github")}
                      >
                        Continue with GitHub
                      </button>
                      <button
                        type="button"
                        className="button subtle"
                        disabled={authPending}
                        onClick={() => signIn("google")}
                      >
                        Continue with Google
                      </button>
                    </div>
                    {!configured && (
                      <p className="config-note">
                        Workspace setup is pending. Sign-in and investigations
                        become available when authentication and the backend are
                        connected.{" "}
                        <button
                          type="button"
                          className="text-link"
                          onClick={() => navigate("sample")}
                        >
                          Explore the sample report
                        </button>
                      </p>
                    )}
                  </div>
                ) : (
                  <>
                    <label htmlFor="api-key">
                      Gemini API key{" "}
                      <a
                        href="https://aistudio.google.com/apikey"
                        target="_blank"
                        rel="noreferrer"
                      >
                        Get a key <Icon name="external" size={12} />
                      </a>
                    </label>
                    <input
                      id="api-key"
                      type="password"
                      required
                      autoComplete="off"
                      spellCheck={false}
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="Enter a key for this run"
                    />
                    <p className="field-help">
                      Used for this run only. Never saved in your report,
                      database, or browser storage. Your provider’s quotas
                      apply.
                    </p>
                    <p className="field-help">
                      Page evidence is sent to Google for analysis. Free-tier
                      data may be used to improve Google products.{" "}
                      <a
                        href="https://ai.google.dev/gemini-api/terms"
                        target="_blank"
                        rel="noreferrer"
                      >
                        Read the terms
                      </a>
                      .
                    </p>
                    <button
                      className="button primary full"
                      disabled={busy || !configured}
                      type="submit"
                    >
                      {busy ? "Starting investigation…" : "Investigate fixture"}
                      <Icon name="arrow" />
                    </button>
                    {!configured && (
                      <p className="config-note">
                        The backend URL is not configured. Investigations are
                        unavailable until setup is complete.
                      </p>
                    )}
                  </>
                )}
              </form>
            </div>
          </section>
        )}
        {view === "sample" && (
          <section className="report-page">
            <div className="page-heading">
              <div>
                <div className="mascot-heading"><MartenMascot pose="report" className="workspace-mascot" /><h1>A report, with the receipts.</h1></div>
                <p>
                  Explore how Marten connects a finding to the evidence behind
                  it.
                </p>
              </div>
              <button
                className="button subtle"
                onClick={() => navigate("start")}
              >
                Start your own <Icon name="arrow" />
              </button>
            </div>
            <div className="notice sample-notice">
              <strong>Sample report</strong>
              <p>
                This is illustrative content for a fictional website. No live
                investigation has been performed.
              </p>
            </div>
            <ReportView report={sampleReport} sample />
            <div className="sample-evidence" id="sample-evidence">
              <h2>The evidence trail</h2>
              <p>
                In a real investigation, these references open private
                screenshots and captured page text.
              </p>
              <div className="evidence-table">
                <div>
                  <span>sample-home</span>
                  <strong>Homepage</strong>
                  <span>“Start your 14-day trial”</span>
                </div>
                <div>
                  <span>sample-pricing</span>
                  <strong>Pricing</strong>
                  <span>“Try it free for 7 days”</span>
                </div>
                <div>
                  <span>sample-signup</span>
                  <strong>Signup destination</strong>
                  <span>HTTP 404 · Page not found</span>
                </div>
              </div>
            </div>
          </section>
        )}
        {view === "history" && (
          <section className="history-page">
            <div className="page-heading">
              <div>
                <h1>Your investigations</h1>
                <p>
                  A place for every question, and the evidence it uncovered.
                </p>
              </div>
              <button
                className="button primary"
                onClick={() => navigate("start")}
              >
                <Icon name="plus" />
                New investigation
              </button>
            </div>
            {!session ? (
              <div className="empty-state">
                <MartenMascot pose="rest" className="empty-mascot" />
                <h2>Your evidence has a home.</h2>
                <p>
                  Sign in to start an investigation and return to its findings
                  later.
                </p>
                <button
                  className="button subtle"
                  onClick={() => navigate("start")}
                >
                  Sign in <Icon name="arrow" />
                </button>
              </div>
            ) : historyLoading ? (
              <div className="mascot-loading"><MartenMascot pose="think" className="workspace-mascot" /><p role="status">Loading investigations…</p></div>
            ) : historyError ? (
              <div className="notice" role="status">
                <p>Your investigations could not be refreshed. Retry to retrieve the latest saved evidence.</p>
                <button className="text-link" onClick={loadHistory}>Retry investigations</button>
              </div>
            ) : history.length === 0 ? (
              <div className="empty-state">
                <MartenMascot pose="rest" className="empty-mascot" />
                <h2>No investigations yet.</h2>
                <p>
                  Start with the controlled fixture to collect your first trail
                  of evidence.
                </p>
                <button className="text-link" onClick={() => navigate("start")}>
                  Start an investigation <Icon name="arrow" />
                </button>
              </div>
            ) : (
              <div className="history-list">
                {history.map((item) => (
                  <article key={item.id}>
                    <button
                      className="history-open"
                      onClick={() => openRun(item.id)}
                      disabled={busy}
                    >
                      <strong>{item.targetUrl}</strong>
                      <span>
                        {new Date(item.createdAt).toLocaleDateString()} ·{" "}
                        {item.evidence.length} captured pages
                      </span>
                      <span>Available until {new Date(item.expiresAt).toLocaleString()} (your local time)</span>
                    </button>
                    <span className="status-label">{item.status}</span>
                    {deleteId === item.id ? (
                      <div className="delete-confirm">
                        <span>Delete this run and evidence?</span>
                        <button
                          className="text-link danger"
                          disabled={busy}
                          onClick={() => removeRun(item.id)}
                        >
                          Delete
                        </button>
                        <button
                          className="text-link"
                          onClick={() => setDeleteId(null)}
                        >
                          Keep
                        </button>
                      </div>
                    ) : (
                      <button
                        className="text-link muted"
                        onClick={() => setDeleteId(item.id)}
                      >
                        Delete
                      </button>
                    )}
                  </article>
                ))}
              </div>
            )}
            <p className="retention-note">
              Reports and evidence are available for seven days. Expired runs are
              not shown.
            </p>
          </section>
        )}
        {view === "run" && run && session && (
          <Workspace key={run.id} initial={run} onBack={loadHistory} />
        )}
      </main>
      <footer>
        <span className="footer-brand">marten</span>
        <span>Curiosity, backed by evidence.</span>
        <span>Early preview</span>
      </footer>
    </div>
  );
}
