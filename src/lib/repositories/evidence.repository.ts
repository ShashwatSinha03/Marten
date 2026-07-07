import { Types } from "mongoose";
import {
  EvidenceRecord,
  type IEvidenceRecord,
  type IEvidenceRecordDocument,
} from "@/lib/mongoose";

// ─── Types ───────────────────────────────────────────────────────────────────

type EvidenceType =
  | "screenshot"
  | "dom_snapshot"
  | "network_log"
  | "console_log";

interface CreateEvidenceInput {
  investigationId: string;
  type: EvidenceType;
  storageKey: string;
  mimeType: string;
  size: number;
  metadata?: Record<string, unknown>;
}

/**
 * Repository for EvidenceRecord documents.
 *
 * Evidence records reference files stored in the S3-compatible storage layer.
 * There is a unique constraint on `storageKey` to prevent duplicates.
 */
export class EvidenceRepository {
  // ── Helpers ────────────────────────────────────────────────────────────────

  private toObjectId(id: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(id)) {
      throw new Error(`Invalid ObjectId: ${id}`);
    }
    return new Types.ObjectId(id);
  }

  // ── Create ─────────────────────────────────────────────────────────────────

  async create(
    data: CreateEvidenceInput
  ): Promise<IEvidenceRecordDocument> {
    const doc = new EvidenceRecord({
      investigationId: this.toObjectId(data.investigationId),
      type: data.type,
      storageKey: data.storageKey,
      mimeType: data.mimeType,
      size: data.size,
      metadata: data.metadata ?? {},
    });

    return doc.save();
  }

  // ── Reads ──────────────────────────────────────────────────────────────────

  async findById(id: string): Promise<IEvidenceRecord | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }

    return EvidenceRecord.findById(id)
      .lean()
      .exec() as Promise<IEvidenceRecord | null>;
  }

  async findByInvestigationId(
    investigationId: string
  ): Promise<IEvidenceRecord[]> {
    if (!Types.ObjectId.isValid(investigationId)) {
      return [];
    }

    return EvidenceRecord.find({
      investigationId: this.toObjectId(investigationId),
    })
      .lean()
      .exec() as Promise<IEvidenceRecord[]>;
  }
}

// ─── Singleton ───────────────────────────────────────────────────────────────

export const evidenceRepo = new EvidenceRepository();
