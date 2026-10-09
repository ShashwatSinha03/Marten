export const FIXTURE_URL = "https://fixture.marten.test";
export type RunStatus =
  | "collecting"
  | "analyzing"
  | "completed"
  | "partial"
  | "failed"
  | "cancelled";
export interface Evidence {
  id: string;
  url: string;
  status: number | null;
  capturedAt: string;
  text: string;
  links: string[];
  screenshotSha256: string;
}
export interface InvestigationEvent {
  sequence: number;
  at: string;
  type: string;
  pageId?: string;
  state?: string;
  url?: string;
}
export interface Finding {
  id: string;
  title: string;
  observation: string;
  impact: string;
  recommendation: string;
  kind: "observed" | "interpretation";
  severity: "high" | "medium" | "low";
  evidenceIds: string[];
}
export interface Report {
  summary: string;
  findings: Finding[];
  limitations: string[];
}
export interface Investigation {
  model?: string;
  id: string;
  targetUrl: string;
  brief: string;
  mode: "fixture";
  status: RunStatus;
  createdAt: string;
  expiresAt: string;
  evidence: Evidence[];
  report: Report | null;
  errorCode: string | null;
}
export interface CreateInvestigation {
  targetUrl: string;
  brief?: string;
  apiKey: string;
  mode: "fixture";
}
export interface ApiError {
  error: {
    code: string;
    message: string;
  };
}
