// ─── Investigation ─────────────────────────────────────────────

export type InvestigationStatus =
  | "pending"
  | "url_validating"
  | "collecting_evidence"
  | "building_graph"
  | "investigating"
  | "generating_report"
  | "complete"
  | "failed"
  | "aborted";

export type InvestigationDepth = "quick" | "standard";

export interface StartInvestigationInput {
  url: string;
  depth: InvestigationDepth;
}

export interface StartInvestigationResponse {
  investigationId: string;
  streamUrl: string;
}

// ─── Evidence ──────────────────────────────────────────────────

export type EvidenceType =
  | "screenshot"
  | "dom_snapshot"
  | "network_log"
  | "console_log";

export interface EvidenceItem {
  id: string;
  type: EvidenceType;
  storageKey: string;
  mimeType: string;
  size: number;
  metadata: Record<string, unknown>;
  createdAt: string;
}

// ─── Product Graph ─────────────────────────────────────────────

export type GraphNodeType = "screen" | "component" | "interaction" | "effect";

export interface GraphNode {
  id: string;
  type: GraphNodeType;
  label: string;
  metadata: {
    html?: string;
    selector?: string;
    boundingBox?: { x: number; y: number; w: number; h: number };
    visibility?: "visible" | "hidden" | "partial";
    interactive?: boolean;
    textContent?: string;
    tagName?: string;
    attributes?: Record<string, string>;
  };
  priority: number; // 1 (highest) - 5 (lowest)
}

export type GraphEdgeType =
  | "contains"
  | "triggers"
  | "fetches"
  | "shows"
  | "navigates_to"
  | "logs";

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: GraphEdgeType;
  metadata?: {
    event?: string;
    url?: string;
    selector?: string;
  };
}

export interface ProductGraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  quality: number;
  truncated: boolean;
  metadata: {
    url: string;
    depth: InvestigationDepth;
    nodeCount: number;
    edgeCount: number;
    builtAt: string;
    version: string;
  };
}

// ─── Findings ──────────────────────────────────────────────────

export type FindingSeverity =
  | "critical"
  | "high"
  | "medium"
  | "low"
  | "info";

export type FindingCategory =
  | "console_error"
  | "accessibility"
  | "dom_structure"
  | "network"
  | "visual"
  | "behavioral"
  | "functional";

export type FindingSource = "heuristic" | "llm" | "both";

export interface EvidenceRef {
  type: string;
  id: string;
  key?: string;
}

export interface Finding {
  id: string;
  investigationId: string;
  title: string;
  description: string;
  severity: FindingSeverity;
  category: FindingCategory;
  confidence: number; // 0.0 – 1.0
  source: FindingSource;
  evidenceRefs: EvidenceRef[];
  metadata?: Record<string, unknown>;
  isLowConfidence: boolean;
  fingerprint?: string;
  recommendation?: string;
  createdAt: string;
}

// ─── SSE Events ────────────────────────────────────────────────

export type SseEventType =
  | "phase_change"
  | "progress_update"
  | "evidence_collected"
  | "graph_node_added"
  | "graph_edge_added"
  | "graph_build_complete"
  | "finding_discovered"
  | "heuristic_result"
  | "llm_token"
  | "llm_progress"
  | "error"
  | "complete"
  | "heartbeat";

export interface SseEvent {
  type: SseEventType;
  id: number;
  data: Record<string, unknown>;
}

// ─── Report ────────────────────────────────────────────────────

export interface ReportData {
  id: string;
  investigationId: string;
  summary: string;
  overallScore: number | null;
  findingCount: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  infoCount: number;
  findings: Finding[];
  metadata: {
    url: string;
    depth: InvestigationDepth;
    duration: number;
    completedAt: string;
  };
}

// ─── LLM ────────────────────────────────────────────────────────

export interface LlmFinding {
  title: string;
  description: string;
  severity: FindingSeverity;
  category: FindingCategory;
  evidence_refs: string[];
  confidence: "high" | "medium" | "low";
  recommendation: string;
}

export interface LlmResponse {
  findings: LlmFinding[];
  summary: {
    total_findings: number;
    critical_count: number;
    high_count: number;
    medium_count: number;
    low_count: number;
    info_count: number;
    categories_covered: string[];
  };
  analysis_quality: {
    graph_completeness: "adequate" | "limited" | "insufficient";
    evidence_sufficiency: "adequate" | "limited" | "insufficient";
    notes?: string;
  };
}

// ─── API ────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  meta?: Record<string, unknown>;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  meta: {
    total: number;
    page: number;
    pageSize: number;
    hasMore: boolean;
  };
}
