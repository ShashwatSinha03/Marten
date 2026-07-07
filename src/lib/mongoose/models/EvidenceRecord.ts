import mongoose, { Schema, Document, Model, Types } from "mongoose";

// ─── Type Alias ──────────────────────────────────────────────────────────────

export type EvidenceType =
  | "screenshot"
  | "dom_snapshot"
  | "network_log"
  | "console_log";

// ─── Interface ───────────────────────────────────────────────────────────────

export interface IEvidenceRecord {
  _id?: Types.ObjectId;
  investigationId: Types.ObjectId;
  type: EvidenceType;
  storageKey: string;
  mimeType: string;
  size: number;
  metadata: Record<string, unknown>;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IEvidenceRecordDocument extends IEvidenceRecord, Document {
  _id: Types.ObjectId;
  id: string;
}

// ─── Schema ──────────────────────────────────────────────────────────────────

const evidenceRecordSchema = new Schema<IEvidenceRecordDocument>(
  {
    investigationId: {
      type: Schema.Types.ObjectId,
      ref: "Investigation",
      required: true,
    },
    type: {
      type: String,
      required: true,
      enum: ["screenshot", "dom_snapshot", "network_log", "console_log"],
    },
    storageKey: {
      type: String,
      required: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
      default: 0,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    collection: "evidencerecords",
  }
);

// ─── Indexes ─────────────────────────────────────────────────────────────────

evidenceRecordSchema.index({ investigationId: 1 });

evidenceRecordSchema.index({ storageKey: 1 }, { unique: true });

// ─── Model Export ────────────────────────────────────────────────────────────

export const EvidenceRecord: Model<IEvidenceRecordDocument> =
  (mongoose.models.EvidenceRecord as Model<IEvidenceRecordDocument>) ||
  mongoose.model<IEvidenceRecordDocument>(
    "EvidenceRecord",
    evidenceRecordSchema
  );
