import mongoose, { Schema, Document, Model, Types } from "mongoose";

// ─── Type Aliases ────────────────────────────────────────────────────────────

export type InvestigationStatus =
  | "pending"
  | "running"
  | "url_validating"
  | "collecting_evidence"
  | "building_graph"
  | "investigating"
  | "generating_report"
  | "complete"
  | "failed"
  | "aborted";

export type InvestigationDepth = "quick" | "standard";

export type GraphNodeType = "screen" | "component" | "interaction" | "effect";

export type GraphEdgeType =
  | "contains"
  | "triggers"
  | "fetches"
  | "shows"
  | "navigates_to"
  | "logs";

export type EvidenceType =
  | "screenshot"
  | "dom_snapshot"
  | "network_log"
  | "console_log";

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

// ─── Interfaces ──────────────────────────────────────────────────────────────

export interface IGraphNode {
  id: string;
  type: GraphNodeType;
  label: string;
  metadata: Record<string, unknown>;
  priority: number; // 1 (highest) – 5 (lowest)
}

export interface IGraphEdge {
  id: string;
  source: string;
  target: string;
  type: GraphEdgeType;
  metadata: Record<string, unknown>;
}

export interface IProductGraph {
  nodes: IGraphNode[];
  edges: IGraphEdge[];
  quality: number;
  truncated: boolean;
  metadata: Record<string, unknown>;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IEvidenceRef {
  type: string;
  id: string;
  key?: string;
}

export interface IFinding {
  findingId: string; // UUID
  title: string;
  description: string;
  severity: FindingSeverity;
  category: FindingCategory;
  confidence: number; // 0.0 – 1.0
  source: FindingSource;
  evidenceRefs: IEvidenceRef[];
  metadata: Record<string, unknown>;
  isLowConfidence: boolean;
  fingerprint?: string;
  recommendation?: string;
  createdAt: Date;
}

export interface IShareLink {
  token: string;
  isActive: boolean;
  expiresAt?: Date;
  createdAt: Date;
}

export interface IReport {
  reportId: string; // UUID
  summary: string;
  overallScore: number | null;
  findingCount: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  infoCount: number;
  metadata: Record<string, unknown>;
  findings: IFinding[];
  shareLinks: IShareLink[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IInvestigation {
  _id?: Types.ObjectId;
  url: string;
  normalizedUrl: string;
  depth: InvestigationDepth;
  status: InvestigationStatus;
  progress: number;
  error?: string;
  errorCode?: string;
  userId: Types.ObjectId | string;
  metadata: Record<string, unknown>;
  graph?: IProductGraph;
  report?: IReport;
  startedAt?: Date;
  heartbeatAt?: Date;
  completedAt?: Date;
  cleanupAt?: Date; // TTL: set for terminal-state documents
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IInvestigationDocument
  extends IInvestigation,
    Document {
  _id: Types.ObjectId;
  id: string;
}

// ─── Sub-schemas ─────────────────────────────────────────────────────────────

const graphNodeSchema = new Schema<IGraphNode>(
  {
    id: { type: String, required: true },
    type: {
      type: String,
      required: true,
      enum: ["screen", "component", "interaction", "effect"],
    },
    label: { type: String, required: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
    priority: { type: Number, required: true, min: 1, max: 5 },
  },
  { _id: false }
);

const graphEdgeSchema = new Schema<IGraphEdge>(
  {
    id: { type: String, required: true },
    source: { type: String, required: true },
    target: { type: String, required: true },
    type: {
      type: String,
      required: true,
      enum: [
        "contains",
        "triggers",
        "fetches",
        "shows",
        "navigates_to",
        "logs",
      ],
    },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { _id: false }
);

const productGraphSchema = new Schema<IProductGraph>(
  {
    nodes: { type: [graphNodeSchema], default: [] },
    edges: { type: [graphEdgeSchema], default: [] },
    quality: { type: Number, default: 0 },
    truncated: { type: Boolean, default: false },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { _id: false, timestamps: true }
);

const evidenceRefSchema = new Schema<IEvidenceRef>(
  {
    type: { type: String, required: true },
    id: { type: String, required: true },
    key: { type: String },
  },
  { _id: false }
);

const findingSchema = new Schema<IFinding>(
  {
    findingId: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    severity: {
      type: String,
      required: true,
      enum: ["critical", "high", "medium", "low", "info"],
    },
    category: {
      type: String,
      required: true,
      enum: [
        "console_error",
        "accessibility",
        "dom_structure",
        "network",
        "visual",
        "behavioral",
        "functional",
      ],
    },
    confidence: { type: Number, required: true, min: 0, max: 1 },
    source: {
      type: String,
      required: true,
      enum: ["heuristic", "llm", "both"],
    },
    evidenceRefs: { type: [evidenceRefSchema], default: [] },
    metadata: { type: Schema.Types.Mixed, default: {} },
    isLowConfidence: { type: Boolean, default: false },
    fingerprint: { type: String },
    recommendation: { type: String },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const shareLinkSchema = new Schema<IShareLink>(
  {
    token: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    expiresAt: { type: Date },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const reportSchema = new Schema<IReport>(
  {
    reportId: { type: String, required: true },
    summary: { type: String, default: "" },
    overallScore: { type: Number, default: null },
    findingCount: { type: Number, default: 0 },
    criticalCount: { type: Number, default: 0 },
    highCount: { type: Number, default: 0 },
    mediumCount: { type: Number, default: 0 },
    lowCount: { type: Number, default: 0 },
    infoCount: { type: Number, default: 0 },
    metadata: { type: Schema.Types.Mixed, default: {} },
    findings: { type: [findingSchema], default: [] },
    shareLinks: { type: [shareLinkSchema], default: [] },
  },
  { _id: false, timestamps: true }
);

// ─── Main Schema ─────────────────────────────────────────────────────────────

const investigationSchema = new Schema<IInvestigationDocument>(
  {
    url: { type: String, required: true },
    normalizedUrl: { type: String, required: true },
    depth: {
      type: String,
      required: true,
      enum: ["quick", "standard"],
    },
    status: {
      type: String,
      required: true,
      default: "pending",
      enum: [
        "pending",
        "running",
        "url_validating",
        "collecting_evidence",
        "building_graph",
        "investigating",
        "generating_report",
        "complete",
        "failed",
        "aborted",
      ],
    },
    progress: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
      max: 1,
    },
    error: { type: String },
    errorCode: { type: String },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    metadata: { type: Schema.Types.Mixed, default: {} },
    graph: { type: productGraphSchema },
    report: { type: reportSchema },
    startedAt: { type: Date },
    heartbeatAt: { type: Date },
    completedAt: { type: Date },
    cleanupAt: { type: Date },
  },
  {
    timestamps: true,
    collection: "investigations",
  }
);

// ─── Indexes ─────────────────────────────────────────────────────────────────

// 1. Dashboard listing by user, newest first
investigationSchema.index({ userId: 1, createdAt: -1 });

// 2. Worker polling — pending investigations
investigationSchema.index(
  { status: 1, createdAt: 1 },
  {
    partialFilterExpression: { status: "pending" },
  }
);

// 3. Worker reclaim — stale running / pending investigations
investigationSchema.index(
  { status: 1, heartbeatAt: 1 },
  {
    partialFilterExpression: {
      status: { $in: ["running", "pending"] },
    },
  }
);

// 4. Report page lookup by reportId
investigationSchema.index(
  { "report.reportId": 1 },
  { unique: true, sparse: true }
);

// 5. Shared report lookup by share token
investigationSchema.index(
  { "report.shareLinks.token": 1 },
  { unique: true, sparse: true }
);

// 6. Dedup findings by fingerprint
investigationSchema.index(
  { "report.findings.fingerprint": 1 },
  { sparse: true }
);

// 7. URL lookup
investigationSchema.index({ normalizedUrl: 1, createdAt: -1 });

// 8. TTL cleanup — automatically remove terminal-state investigations
// after the configured retention period.
// Uses `cleanupAt` which is set only for terminal states (complete, failed, aborted).
investigationSchema.index(
  { cleanupAt: 1 },
  {
    expireAfterSeconds: 0,
    partialFilterExpression: {
      status: { $in: ["complete", "failed", "aborted"] },
    },
  }
);

// ─── Model Export ────────────────────────────────────────────────────────────

export const Investigation: Model<IInvestigationDocument> =
  (mongoose.models.Investigation as Model<IInvestigationDocument>) ||
  mongoose.model<IInvestigationDocument>("Investigation", investigationSchema);
