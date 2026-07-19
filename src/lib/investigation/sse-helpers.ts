import { emitter } from "@/lib/sse/emitter";
import { SseEventType } from "@/lib/sse/types";

export function emitInvestigationProgress(
  investigationId: string,
  message: string,
  progress: number,
): void {
  emitter.emit(investigationId, {
    type: SseEventType.ProgressUpdate,
    data: { message, progress, status: "investigating" },
  });
}
