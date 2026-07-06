import type { Finding, FindingSeverity, FindingCategory } from "@/types";
import type { EvidenceBundle } from "@/lib/pipeline/types";
import type { ProductGraphData } from "@/types";

export interface DetectorContext {
  evidence: EvidenceBundle;
  graph?: ProductGraphData;
}

export interface DetectorResult {
  detectorId: string;
  detectorName: string;
  findings: Finding[];
}

export interface HeuristicDetector {
  id: string;
  name: string;
  detect(ctx: DetectorContext): Promise<Finding[]> | Finding[];
}
