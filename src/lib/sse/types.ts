/**
 * Server-Sent Event type definitions for the Marten investigation pipeline.
 */

export enum SseEventType {
  PhaseChange = "phase_change",
  ProgressUpdate = "progress_update",
  EvidenceCollected = "evidence_collected",
  GraphNodeAdded = "graph_node_added",
  GraphEdgeAdded = "graph_edge_added",
  GraphBuildComplete = "graph_build_complete",
  FindingDiscovered = "finding_discovered",
  HeuristicResult = "heuristic_result",
  LlmToken = "llm_token",
  LlmProgress = "llm_progress",
  Error = "error",
  Complete = "complete",
  Heartbeat = "heartbeat",
}

export interface SseEvent {
  type: SseEventType;
  id: number;
  data: Record<string, unknown>;
}

export interface SseEventPayload {
  investigationId: string;
  sequence: number;
  eventType: SseEventType;
  data: Record<string, unknown>;
}
