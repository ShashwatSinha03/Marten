import { Types, type PipelineStage } from "mongoose";
import {
  LlmTokenUsage,
  type ILlmTokenUsage,
  type ILlmTokenUsageDocument,
} from "@/lib/mongoose";

// ─── Types ───────────────────────────────────────────────────────────────────

interface CreateLlmUsageInput {
  investigationId: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costUsd: number | null;
  durationMs: number;
}

interface LlmUsageTotals {
  totalPromptTokens: number;
  totalCompletionTokens: number;
  totalTokens: number;
  totalCostUsd: number;
  totalDurationMs: number;
  count: number;
}

/**
 * Repository for LlmTokenUsage documents.
 *
 * Tracks token consumption and cost per investigation across LLM calls.
 * Records are auto-expired via TTL index (90 days).
 */
export class LlmUsageRepository {
  // ── Helpers ────────────────────────────────────────────────────────────────

  private toObjectId(id: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(id)) {
      throw new Error(`Invalid ObjectId: ${id}`);
    }
    return new Types.ObjectId(id);
  }

  // ── Create ─────────────────────────────────────────────────────────────────

  async create(
    data: CreateLlmUsageInput
  ): Promise<ILlmTokenUsageDocument> {
    const doc = new LlmTokenUsage({
      investigationId: this.toObjectId(data.investigationId),
      model: data.model,
      promptTokens: data.promptTokens,
      completionTokens: data.completionTokens,
      totalTokens: data.totalTokens,
      costUsd: data.costUsd,
      durationMs: data.durationMs,
    });

    return doc.save();
  }

  // ── Reads ──────────────────────────────────────────────────────────────────

  /**
   * Returns aggregated token usage for an investigation.
   */
  async getTotalForInvestigation(
    investigationId: string
  ): Promise<LlmUsageTotals | null> {
    if (!Types.ObjectId.isValid(investigationId)) {
      return null;
    }

    const pipeline: PipelineStage[] = [
      {
        $match: {
          investigationId: this.toObjectId(investigationId),
        },
      },
      {
        $group: {
          _id: null,
          totalPromptTokens: { $sum: "$promptTokens" },
          totalCompletionTokens: { $sum: "$completionTokens" },
          totalTokens: { $sum: "$totalTokens" },
          totalCostUsd: { $sum: { $ifNull: ["$costUsd", 0] } },
          totalDurationMs: { $sum: "$durationMs" },
          count: { $sum: 1 },
        },
      },
    ];

    const results = await LlmTokenUsage.aggregate(pipeline).exec();

    if (results.length === 0) {
      return null;
    }

    const r = results[0];
    return {
      totalPromptTokens: r.totalPromptTokens,
      totalCompletionTokens: r.totalCompletionTokens,
      totalTokens: r.totalTokens,
      totalCostUsd: r.totalCostUsd,
      totalDurationMs: r.totalDurationMs,
      count: r.count,
    };
  }
}

// ─── Singleton ───────────────────────────────────────────────────────────────

export const llmUsageRepo = new LlmUsageRepository();
