// ─── Connection ──────────────────────────────────────────────────────────────

export { connectMongoose, getMongoClient, disconnect } from "./connection";

// ─── Investigation Models & Types ────────────────────────────────────────────

export {
  Investigation,
  type IInvestigation,
  type IInvestigationDocument,
  type InvestigationStatus,
  type InvestigationDepth,
  type IProductGraph,
  type IGraphNode,
  type IGraphEdge,
  type IEvidenceRef,
  type IFinding,
  type IShareLink,
  type IReport,
  type GraphNodeType,
  type GraphEdgeType,
  type FindingSeverity,
  type FindingCategory,
  type FindingSource,
  type EvidenceType,
} from "./models/Investigation";

// ─── Investigation Event ─────────────────────────────────────────────────────

export {
  InvestigationEvent,
  type IInvestigationEvent,
  type IInvestigationEventDocument,
} from "./models/InvestigationEvent";

// ─── Evidence Record ─────────────────────────────────────────────────────────

export {
  EvidenceRecord,
  type IEvidenceRecord,
  type IEvidenceRecordDocument,
} from "./models/EvidenceRecord";

// ─── LLM Token Usage ─────────────────────────────────────────────────────────

export {
  LlmTokenUsage,
  type ILlmTokenUsage,
  type ILlmTokenUsageDocument,
} from "./models/LlmTokenUsage";
