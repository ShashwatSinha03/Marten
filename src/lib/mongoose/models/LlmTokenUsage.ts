import mongoose, { Schema, Document, Model, Types } from "mongoose";

// ─── Interface ───────────────────────────────────────────────────────────────

export interface ILlmTokenUsage {
  investigationId: Types.ObjectId;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costUsd: number | null;
  durationMs: number;
  createdAt?: Date;
  updatedAt?: Date;
}

// Note: Omit<Document, 'model'> avoids conflict between ILlmTokenUsage.model
// (string) and Document.model() (method).
export interface ILlmTokenUsageDocument
  extends Omit<Document, "model">,
    ILlmTokenUsage {
  _id: Types.ObjectId;
}

// ─── Schema ──────────────────────────────────────────────────────────────────

const llmTokenUsageSchema = new Schema<ILlmTokenUsageDocument>(
  {
    investigationId: {
      type: Schema.Types.ObjectId,
      ref: "Investigation",
      required: true,
    },
    model: {
      type: String,
      required: true,
    },
    promptTokens: {
      type: Number,
      default: 0,
    },
    completionTokens: {
      type: Number,
      default: 0,
    },
    totalTokens: {
      type: Number,
      default: 0,
    },
    costUsd: {
      type: Number,
      default: null,
    },
    durationMs: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    collection: "llmtokenusages",
  }
);

// ─── Indexes ─────────────────────────────────────────────────────────────────

llmTokenUsageSchema.index({ investigationId: 1 });

// TTL: automatically remove token usage records after 90 days
llmTokenUsageSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 90 * 24 * 60 * 60 }
);

// ─── Model Export ────────────────────────────────────────────────────────────

export const LlmTokenUsage: Model<ILlmTokenUsageDocument> =
  (mongoose.models.LlmTokenUsage as Model<ILlmTokenUsageDocument>) ||
  mongoose.model<ILlmTokenUsageDocument>("LlmTokenUsage", llmTokenUsageSchema);
