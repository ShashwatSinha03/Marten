import type { EvidenceItem } from "@/types";

/**
 * Structured DOM extraction — a machine-readable summary of page content.
 * This is NOT the raw HTML (which is already captured by EvidenceCollector),
 * but a structured representation for analysis.
 */
export interface StructuredDom {
  title: string;
  url: string;
  metaDescription: string;
  metaKeywords: string[];
  canonicalUrl: string | null;
  headings: Array<{ level: number; text: string; id?: string }>;
  links: Array<{ href: string; text: string; isInternal: boolean; isExternal: boolean }>;
  buttons: Array<{ text: string; type?: string; selector?: string }>;
  forms: Array<{ action: string; method: string; inputs: number; submits: number }>;
  inputs: Array<{ type: string; name: string; placeholder: string; required: boolean }>;
  images: Array<{ src: string; alt: string; width?: number; height?: number }>;
  scripts: Array<{ src: string | null; isInline: boolean }>;
  stylesheets: Array<{ href: string }>;
  textContent: {
    totalCharacters: number;
    wordCount: number;
    paragraphs: number;
  };
  performance: {
    domContentLoadedMs: number;
    loadEventMs: number;
    domNodes: number;
  };
}

/**
 * Network summary — aggregated statistics from network activity.
 */
export interface NetworkSummary {
  totalRequests: number;
  totalBytes: number;
  totalTimeMs: number;
  byType: Record<string, { count: number; bytes: number; timeMs: number }>;
  byStatusCode: Record<string, number>;
  slowestRequests: Array<{ url: string; timeMs: number; type: string }>;
  largestRequests: Array<{ url: string; bytes: number; type: string }>;
  failedRequests: Array<{ url: string; status: number; type: string }>;
  blockedRequests: Array<{ url: string; reason: string }>;
  thirdParty: {
    total: number;
    byDomain: Record<string, { count: number; bytes: number }>;
  };
}

/**
 * Navigation entry — a single visited URL during page investigation.
 */
export interface NavigationEntry {
  url: string;
  title: string;
  timestamp: number;
  durationMs: number;
  statusCode: number;
  loadEventMs: number;
}

/**
 * Navigation history — the full sequence of pages visited.
 */
export interface NavigationHistory {
  entries: NavigationEntry[];
  totalDurationMs: number;
  pageCount: number;
  redirectCount: number;
}

/**
 * Complete evidence collection result, extending the base EvidenceBundle
 * with structured DOM, network summary, and navigation history.
 */
export interface EvidenceCollectionResult {
  screenshots: EvidenceItem[];
  domSnapshots: EvidenceItem[];
  networkLogs: EvidenceItem[];
  consoleLogs: EvidenceItem[];
  structuredDom: StructuredDom;
  networkSummary: NetworkSummary;
  navigationHistory: NavigationHistory;
  durationMs: number;
  url: string;
  depth: "quick" | "standard";
}

/**
 * Phase/status for the lightweight evidence pipeline.
 * Only covers URL validation + evidence collection (no graph/AI/report).
 */
export type EvidencePipelinePhase =
  | "pending"
  | "url_validating"
  | "collecting_evidence"
  | "complete"
  | "failed";

/**
 * Progress update event payload for the evidence pipeline.
 */
export interface ProgressUpdate {
  progress: number; // 0.0 – 1.0
  phase: EvidencePipelinePhase;
  message: string; // Human-readable progress description
}

/**
 * Error detail for pipeline failures.
 */
export interface PipelineError {
  code: string;
  message: string;
  recoverable: boolean;
  details?: Record<string, unknown>;
}
