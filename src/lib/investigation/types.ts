import type { EvidenceBundle } from "@/lib/pipeline/types";
import type {
  ProductGraphData,
  FindingSeverity,
  FindingCategory,
  EvidenceItem,
  Finding,
} from "@/types";
import type {
  StructuredDom,
  NetworkSummary,
  NavigationHistory,
} from "@/lib/evidence/types";
import type {
  RouteGraph,
  ComponentMap,
  NavigationGraphData,
  FlowGraphData,
} from "@/lib/understanding/types";

export interface RuleMatch {
  fingerprint: string;
  title: string;
  description: string;
  severity: FindingSeverity;
  evidenceIds: string[];
  graphNodeIds: string[];
  graphEdgeIds: string[];
  recommendationPlaceholder: string;
  metadata?: Record<string, unknown>;
}

export interface Rule {
  identifier: string;
  description: string;
  category: FindingCategory;
  defaultSeverity: FindingSeverity;
  documentation: string;
  execute: (ctx: InvestigationContext) => RuleMatch[];
}

export interface Detector {
  id: string;
  category: FindingCategory;
  title: string;
  description: string;
  defaultSeverity: FindingSeverity;
  documentation: string;
  ruleIds: string[];
  execute: (ctx: InvestigationContext) => Finding[];
}

export interface InvestigationContext {
  investigationId: string;
  evidence: EvidenceBundle;
  graph?: ProductGraphData;
  structuredDom?: StructuredDom;
  networkSummary?: NetworkSummary;
  navigationHistory?: NavigationHistory;
  routeGraph?: RouteGraph;
  componentMap?: ComponentMap;
  navigationGraph?: NavigationGraphData;
  flows?: FlowGraphData;
  url: string;
  depth: "quick" | "standard";
}

export interface DetectorResult {
  detectorId: string;
  title: string;
  category: FindingCategory;
  findings: Finding[];
  durationMs: number;
}
