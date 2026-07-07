import { emitter } from "@/lib/sse/emitter";
import { SseEventType } from "@/lib/sse/types";
import type { GraphNode, GraphEdge } from "@/types";

/**
 * Emit a progress update during graph building with a human-readable message.
 */
export function emitGraphProgress(
  investigationId: string,
  message: string,
  progress: number,
): void {
  emitter.emit(investigationId, {
    type: SseEventType.ProgressUpdate,
    data: { message, progress, status: "building_graph" },
  });
}

/**
 * Emit when a new graph node is added.
 */
export function emitGraphNodeAdded(
  investigationId: string,
  node: GraphNode,
): void {
  emitter.emit(investigationId, {
    type: SseEventType.GraphNodeAdded,
    data: { node },
  });
}

/**
 * Emit when a new graph edge is added.
 */
export function emitGraphEdgeAdded(
  investigationId: string,
  edge: GraphEdge,
): void {
  emitter.emit(investigationId, {
    type: SseEventType.GraphEdgeAdded,
    data: { edge },
  });
}

/**
 * Emit when graph building is complete.
 */
export function emitGraphBuildComplete(
  investigationId: string,
  nodeCount: number,
  edgeCount: number,
): void {
  emitter.emit(investigationId, {
    type: SseEventType.GraphBuildComplete,
    data: { nodeCount, edgeCount, quality: 1, truncated: false },
  });
}
