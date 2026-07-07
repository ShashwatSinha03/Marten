import { Types } from "mongoose";
import {
  InvestigationEvent,
  type IInvestigationEvent,
  type IInvestigationEventDocument,
} from "@/lib/mongoose";

// ─── Types ───────────────────────────────────────────────────────────────────

interface CreateEventInput {
  investigationId: string;
  sequence: number;
  eventType: string;
  data: Record<string, unknown>;
}

/**
 * Repository for InvestigationEvent documents.
 *
 * Events are append-only logs that track real-time investigation progress.
 * They are streamed to clients via SSE and are auto-expired via TTL index.
 */
export class EventRepository {
  // ── Helpers ────────────────────────────────────────────────────────────────

  private toObjectId(id: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(id)) {
      throw new Error(`Invalid ObjectId: ${id}`);
    }
    return new Types.ObjectId(id);
  }

  // ── Create ─────────────────────────────────────────────────────────────────

  async create(
    data: CreateEventInput
  ): Promise<IInvestigationEventDocument> {
    const doc = new InvestigationEvent({
      investigationId: this.toObjectId(data.investigationId),
      sequence: data.sequence,
      eventType: data.eventType,
      data: data.data,
    });

    return doc.save();
  }

  // ── Reads ──────────────────────────────────────────────────────────────────

  /**
   * Returns all events for an investigation with sequence greater than
   * `lastSequence`, sorted ascending by sequence.
   *
   * Used by SSE reconnection to replay missed events.
   */
  async findAfterSequence(
    investigationId: string,
    lastSequence: number
  ): Promise<IInvestigationEvent[]> {
    if (!Types.ObjectId.isValid(investigationId)) {
      return [];
    }

    return InvestigationEvent.find({
      investigationId: this.toObjectId(investigationId),
      sequence: { $gt: lastSequence },
    })
      .sort({ sequence: 1 })
      .lean()
      .exec() as Promise<IInvestigationEvent[]>;
  }

  /**
   * Returns the maximum sequence number for an investigation.
   * Returns 0 if no events exist.
   */
  async getMaxSequence(investigationId: string): Promise<number> {
    if (!Types.ObjectId.isValid(investigationId)) {
      return 0;
    }

    const result = await InvestigationEvent.findOne({
      investigationId: this.toObjectId(investigationId),
    })
      .sort({ sequence: -1 })
      .select({ sequence: 1 })
      .lean()
      .exec();

    return (result?.sequence as number) ?? 0;
  }
}

// ─── Singleton ───────────────────────────────────────────────────────────────

export const eventRepo = new EventRepository();
