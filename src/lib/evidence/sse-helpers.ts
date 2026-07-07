import { emitter } from "@/lib/sse/emitter";
import { SseEventType } from "@/lib/sse/types";
import type { EvidencePipelinePhase } from "./types";
import type { EvidenceItem } from "@/types";

/**
 * Emit a phase change event.
 */
export function emitPhaseChange(
  investigationId: string,
  phase: EvidencePipelinePhase,
  progress: number,
  extra?: Record<string, unknown>,
): void {
  emitter.emit(investigationId, {
    type: SseEventType.PhaseChange,
    data: { status: phase, progress, ...extra },
  });
}

/**
 * Emit a progress update event with a human-readable message.
 */
export function emitProgress(
  investigationId: string,
  progress: number,
  phase: EvidencePipelinePhase,
  message: string,
): void {
  emitter.emit(investigationId, {
    type: SseEventType.ProgressUpdate,
    data: { progress, status: phase, message },
  });
}

/**
 * Emit an evidence collected event.
 * The data shape matches what the frontend EvidenceItem reducer expects.
 */
export function emitEvidenceCollected(
  investigationId: string,
  evidence: EvidenceItem,
): void {
  emitter.emit(investigationId, {
    type: SseEventType.EvidenceCollected,
    data: evidence as unknown as Record<string, unknown>,
  });
}

/**
 * Emit a complete event.
 */
export function emitComplete(
  investigationId: string,
): void {
  emitter.emit(investigationId, {
    type: SseEventType.Complete,
    data: { investigationId },
  });
}

/**
 * Emit an error event.
 */
export function emitError(
  investigationId: string,
  message: string,
  code?: string,
): void {
  emitter.emit(investigationId, {
    type: SseEventType.Error,
    data: { message, code },
  });
}

/**
 * Build evidence description strings based on type and metadata.
 */
export function buildEvidenceDescription(
  type: string,
  extra?: Record<string, unknown>,
): string {
  switch (type) {
    case "screenshot":
      return "Screenshot captured";
    case "dom_snapshot":
      return "DOM snapshot captured";
    case "network_log":
      return `Network activity captured (${extra?.count ?? 0} requests)`;
    case "console_log":
      return `Console entries captured (${extra?.count ?? 0} entries)`;
    default:
      return `${type.replace(/_/g, " ")} captured`;
  }
}
