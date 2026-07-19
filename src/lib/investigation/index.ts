// Import all detectors to trigger auto-registration
import "./detectors";

export { ruleRegistry } from "./rule-registry";
export { detectorRegistry } from "./detector-registry";
export { emitInvestigationProgress } from "./sse-helpers";
export { getDomHtml } from "./utils";
export type {
  Rule,
  RuleMatch,
  Detector,
  InvestigationContext,
  DetectorResult,
} from "./types";
