import { Types } from "mongoose";
import {
  Investigation,
  type IInvestigation,
  type IInvestigationDocument,
  type InvestigationStatus,
  type IProductGraph,
  type IReport,
} from "@/lib/mongoose";

// ─── Types ───────────────────────────────────────────────────────────────────

interface CreateInvestigationInput {
  url: string;
  normalizedUrl: string;
  depth: "quick" | "standard";
  userId: string;
  status?: InvestigationStatus;
  progress?: number;
  metadata?: Record<string, unknown>;
}

interface UpdateStatusInput {
  status: InvestigationStatus;
  progress?: number;
  error?: string;
  errorCode?: string;
}

interface DashboardQuery {
  page: number;
  pageSize: number;
  status?: InvestigationStatus;
}

interface DashboardResult {
  data: Array<Record<string, unknown>>;
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

const STALE_RUNNING_TIMEOUT_MS = 120_000; // 2 minutes
const HEARTBEAT_STALE_MS = 15_000; // 15 seconds

/**
 * Repository for Investigation documents.
 *
 * All read queries use `.lean()` for minimal overhead.
 * ObjectId validation is applied on every document-lookup parameter.
 */
export class InvestigationRepository {
  // ── Helpers ────────────────────────────────────────────────────────────────

  private toObjectId(id: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(id)) {
      throw new Error(`Invalid ObjectId: ${id}`);
    }
    return new Types.ObjectId(id);
  }

  // ── Create ─────────────────────────────────────────────────────────────────

  async create(
    data: CreateInvestigationInput
  ): Promise<IInvestigationDocument> {
    const doc = new Investigation({
      url: data.url,
      normalizedUrl: data.normalizedUrl,
      depth: data.depth,
      status: data.status ?? "pending",
      progress: data.progress ?? 0,
      userId: this.toObjectId(data.userId),
      metadata: data.metadata ?? {},
    });

    return doc.save();
  }

  // ── Reads ──────────────────────────────────────────────────────────────────

  async findById(id: string): Promise<IInvestigation | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }

    const doc = await Investigation.findById(id).lean().exec();
    return doc as IInvestigation | null;
  }

  async findByReportId(reportId: string): Promise<IInvestigation | null> {
    const doc = await Investigation.findOne({ "report.reportId": reportId })
      .lean()
      .exec();
    return doc as IInvestigation | null;
  }

  async findByShareToken(token: string): Promise<IInvestigation | null> {
    const doc = await Investigation.findOne({
      "report.shareLinks.token": token,
    })
      .lean()
      .exec();
    return doc as IInvestigation | null;
  }

  async findByUserId(
    userId: string,
    query: DashboardQuery
  ): Promise<DashboardResult> {
    if (!Types.ObjectId.isValid(userId)) {
      return {
        data: [],
        total: 0,
        page: query.page,
        pageSize: query.pageSize,
        hasMore: false,
      };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: Record<string, any> = {
      userId: new Types.ObjectId(userId),
    };

    if (query.status) {
      filter.status = query.status;
    }

    const skip = (query.page - 1) * query.pageSize;

    const [documents, total] = await Promise.all([
      Investigation.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(query.pageSize)
        .select({
          url: 1,
          normalizedUrl: 1,
          depth: 1,
          status: 1,
          progress: 1,
          error: 1,
          errorCode: 1,
          createdAt: 1,
          updatedAt: 1,
          completedAt: 1,
          "report.reportId": 1,
          "report.overallScore": 1,
          "report.summary": 1,
          "report.findingCount": 1,
        })
        .lean()
        .exec(),
      Investigation.countDocuments(filter).exec(),
    ]);

    const hasMore = skip + query.pageSize < total;

    return {
      data: documents as unknown as Array<Record<string, unknown>>,
      total,
      page: query.page,
      pageSize: query.pageSize,
      hasMore,
    };
  }

  async findExistingFingerprint(fingerprint: string): Promise<number> {
    return Investigation.countDocuments({
      "report.findings.fingerprint": fingerprint,
    }).exec();
  }

  // ── Writes ─────────────────────────────────────────────────────────────────

  async updateStatus(id: string, input: UpdateStatusInput): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new Error(`Invalid ObjectId: ${id}`);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const $set: Record<string, any> = {
      status: input.status,
    };

    if (input.progress !== undefined) {
      $set.progress = input.progress;
    }

    if (input.error !== undefined) {
      $set.error = input.error;
    }

    if (input.errorCode !== undefined) {
      $set.errorCode = input.errorCode;
    }

    // If transitioning to a terminal state, set cleanupAt for TTL.
    if (isTerminalState(input.status)) {
      $set.cleanupAt = new Date();
    }

    await Investigation.updateOne(
      { _id: this.toObjectId(id) },
      { $set }
    ).exec();
  }

  async saveGraph(id: string, graph: IProductGraph): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new Error(`Invalid ObjectId: ${id}`);
    }

    await Investigation.updateOne(
      { _id: this.toObjectId(id) },
      { $set: { graph } }
    ).exec();
  }

  async saveReport(id: string, report: IReport): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new Error(`Invalid ObjectId: ${id}`);
    }

    await Investigation.updateOne(
      { _id: this.toObjectId(id) },
      { $set: { report } }
    ).exec();
  }

  async markComplete(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new Error(`Invalid ObjectId: ${id}`);
    }

    const now = new Date();

    await Investigation.updateOne(
      { _id: this.toObjectId(id) },
      {
        $set: {
          status: "complete",
          progress: 1.0,
          completedAt: now,
          cleanupAt: now,
        },
      }
    ).exec();
  }

  // ── Worker Operations ──────────────────────────────────────────────────────

  /**
   * Claims up to `batchSize` investigations for processing.
   *
   * 1. Claims pending investigations (never started) using optimistic locking.
   * 2. Reclaims stale running investigations (worker crashed, no heartbeat).
   *
   * Returns the IDs of successfully claimed investigations.
   */
  async claimBatch(batchSize: number): Promise<string[]> {
    const claimed: string[] = [];
    const now = new Date();

    // 1. Claim pending investigations.
    const pending = await Investigation.find(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { status: "pending" as any }
    )
      .sort({ createdAt: 1 })
      .limit(batchSize)
      .select({ _id: 1 })
      .lean()
      .exec();

    for (const inv of pending) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (Investigation as any)
        .findOneAndUpdate(
          {
            _id: inv._id,
            status: "pending",
          },
          {
            $set: {
              status: "running",
              heartbeatAt: now,
              startedAt: now,
            },
          },
          { new: false }
        )
        .exec();

      if (result) {
        claimed.push(inv._id.toString());
      }
      // If result is null, another worker claimed it — skip silently.
    }

    // 2. Reclaim stale running investigations (worker crashed).
    const remainingSlots = batchSize - claimed.length;
    if (remainingSlots <= 0) {
      return claimed;
    }

    const staleThreshold = new Date(now.getTime() - STALE_RUNNING_TIMEOUT_MS);

    const stale = await Investigation.find(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { status: "running" as any, heartbeatAt: { $lt: staleThreshold } }
    )
      .sort({ createdAt: 1 })
      .limit(remainingSlots)
      .select({ _id: 1 })
      .lean()
      .exec();

    for (const inv of stale) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (Investigation as any)
        .findOneAndUpdate(
          {
            _id: inv._id,
            status: "running",
            heartbeatAt: { $lt: staleThreshold },
          },
          {
            $set: {
              heartbeatAt: now,
            },
          },
          { new: false }
        )
        .exec();

      if (result) {
        claimed.push(inv._id.toString());
      }
    }

    return claimed;
  }

  /**
   * Sends heartbeats for all active running investigations.
   *
   * Only updates records where heartbeat is older than 15 seconds to
   * avoid unnecessary writes.
   */
  async sendHeartbeats(): Promise<number> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (Investigation as any).updateMany(
      {
        status: "running",
        heartbeatAt: {
          $lt: new Date(Date.now() - HEARTBEAT_STALE_MS),
        },
      },
      {
        $set: { heartbeatAt: new Date() },
      }
    ).exec();

    return result.modifiedCount;
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isTerminalState(status: InvestigationStatus): boolean {
  return status === "complete" || status === "failed" || status === "aborted";
}

// ─── Singleton ───────────────────────────────────────────────────────────────

export const investigationRepo = new InvestigationRepository();
