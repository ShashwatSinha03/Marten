import type {
  InvestigationStatus,
  EvidenceItem,
  ProductGraphData,
  Finding,
  ReportData,
} from "@/types";
import type { SseEventType } from "@/lib/sse/types";

/**
 * Context passed through every step of the investigation pipeline.
 */
export interface PipelineContext {
  investigationId: string;
  url: string;
  depth: "quick" | "standard";
  status: InvestigationStatus;
  progress: number;
  evidence?: EvidenceBundle;
  graph?: ProductGraphData;
  findings?: Finding[];
  report?: ReportData;
  startedAt: Date;
  errors: PipelineError[];
}

export interface PipelineError {
  step: string;
  message: string;
  code?: string;
  recoverable: boolean;
  timestamp: Date;
}

export interface EvidenceBundle {
  screenshots: EvidenceItem[];
  domSnapshots: EvidenceItem[];
  networkLogs: EvidenceItem[];
  consoleLogs: EvidenceItem[];
}

export interface StepResult {
  success: boolean;
  errors?: PipelineError[];
  progress?: number;
  eventType?: SseEventType;
  eventData?: Record<string, unknown>;
}

/**
 * Interface every pipeline step must implement.
 */
export interface PipelineStep {
  readonly name: string;
  execute(ctx: PipelineContext): Promise<StepResult>;
}

export type StateTransition =
  | "pending"
  | "url_validating"
  | "collecting_evidence"
  | "building_graph"
  | "investigating"
  | "generating_report"
  | "complete"
  | "failed"
  | "aborted";

export const STATE_ORDER: StateTransition[] = [
  "pending",
  "url_validating",
  "collecting_evidence",
  "building_graph",
  "investigating",
  "generating_report",
  "complete",
];
