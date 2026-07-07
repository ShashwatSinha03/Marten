import mongoose, { Schema, Document, Model, Types } from "mongoose";

// ─── Interface ───────────────────────────────────────────────────────────────

export interface IInvestigationEvent {
  investigationId: Types.ObjectId;
  sequence: number;
  eventType: string;
  data: Record<string, unknown>;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IInvestigationEventDocument
  extends IInvestigationEvent,
    Document {
  _id: Types.ObjectId;
}

// ─── Schema ──────────────────────────────────────────────────────────────────

const investigationEventSchema = new Schema<IInvestigationEventDocument>(
  {
    investigationId: {
      type: Schema.Types.ObjectId,
      ref: "Investigation",
      required: true,
    },
    sequence: {
      type: Number,
      required: true,
    },
    eventType: {
      type: String,
      required: true,
    },
    data: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    collection: "events",
  }
);

// ─── Indexes ─────────────────────────────────────────────────────────────────

// Unique index per investigation + sequence (for dedup / at-least-once delivery)
investigationEventSchema.index(
  { investigationId: 1, sequence: 1 },
  { unique: true }
);

// TTL: automatically remove events after 7 days
investigationEventSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 7 * 24 * 60 * 60 }
);

// ─── Model Export ────────────────────────────────────────────────────────────

export const InvestigationEvent: Model<IInvestigationEventDocument> =
  (mongoose.models.InvestigationEvent as Model<IInvestigationEventDocument>) ||
  mongoose.model<IInvestigationEventDocument>(
    "InvestigationEvent",
    investigationEventSchema
  );
