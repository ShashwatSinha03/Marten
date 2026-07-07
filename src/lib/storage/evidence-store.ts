import { evidenceRepo } from "@/lib/repositories/evidence.repository";
import { storage } from "./index";
import { logger } from "@/lib/logger";
import type { EvidenceType } from "@/lib/mongoose/models/EvidenceRecord";

const EVIDENCE_KEY_PATTERN = "investigations/{investigationId}/{type}/{sequence}-{name}";

let sequenceCounter = 0;
function nextSequence(): number {
  sequenceCounter += 1;
  return sequenceCounter;
}

/**
 * EvidenceStore manages the lifecycle of investigation evidence:
 * screenshots, DOM snapshots, network logs, and console logs.
 *
 * Storage and persistence are best-effort — if the backend (S3 or local)
 * or database is unavailable, failures are logged but do not crash the
 * pipeline. This allows development without a cloud infrastructure.
 */
export class EvidenceStore {
  /**
   * Save a screenshot (full-page or viewport).
   */
  async saveScreenshot(
    investigationId: string,
    buffer: Buffer,
    metadata?: Record<string, unknown>,
  ) {
    const seq = nextSequence();
    const name = `screenshot-${Date.now()}.png`;
    const key = this.#buildKey(investigationId, "screenshot", seq, name);

    await this.#safeUpload(key, buffer, "image/png");
    return this.#safeCreateRecord(investigationId, "screenshot", key, "image/png", buffer.length, metadata);
  }

  /**
   * Save a DOM snapshot (serialized HTML string).
   */
  async saveDomSnapshot(
    investigationId: string,
    html: string,
    metadata?: Record<string, unknown>,
  ) {
    const seq = nextSequence();
    const name = `dom-snapshot-${Date.now()}.html`;
    const key = this.#buildKey(investigationId, "dom_snapshot", seq, name);

    const body = Buffer.from(html, "utf-8");
    await this.#safeUpload(key, body, "text/html");
    return this.#safeCreateRecord(investigationId, "dom_snapshot", key, "text/html", body.length, metadata);
  }

  /**
   * Save network request/response log entries.
   */
  async saveNetworkLog(
    investigationId: string,
    entries: unknown[],
    metadata?: Record<string, unknown>,
  ) {
    const seq = nextSequence();
    const name = `network-log-${Date.now()}.json`;
    const key = this.#buildKey(investigationId, "network_log", seq, name);

    const body = Buffer.from(JSON.stringify(entries, null, 2), "utf-8");
    await this.#safeUpload(key, body, "application/json");
    return this.#safeCreateRecord(investigationId, "network_log", key, "application/json", body.length, metadata);
  }

  /**
   * Save console log entries.
   */
  async saveConsoleLog(
    investigationId: string,
    entries: unknown[],
    metadata?: Record<string, unknown>,
  ) {
    const seq = nextSequence();
    const name = `console-log-${Date.now()}.json`;
    const key = this.#buildKey(investigationId, "console_log", seq, name);

    const body = Buffer.from(JSON.stringify(entries, null, 2), "utf-8");
    await this.#safeUpload(key, body, "application/json");
    return this.#safeCreateRecord(investigationId, "console_log", key, "application/json", body.length, metadata);
  }

  /**
   * Get a signed URL or public URL for an evidence record.
   */
  async getEvidenceUrl(evidenceRecordId: string): Promise<string> {
    try {
      const record = await evidenceRepo.findById(evidenceRecordId);

      if (!record) {
        throw new Error(`Evidence record not found: ${evidenceRecordId}`);
      }

      return storage.getSignedUrl(record.storageKey, 3600);
    } catch (err) {
      logger.error({ err, evidenceRecordId }, "Failed to get evidence URL");
      throw err;
    }
  }

  // ── Private helpers ─────────────────────────────────────────────

  #buildKey(
    investigationId: string,
    type: string,
    sequence: number,
    name: string,
  ): string {
    return EVIDENCE_KEY_PATTERN
      .replace("{investigationId}", investigationId)
      .replace("{type}", type)
      .replace("{sequence}", String(sequence).padStart(4, "0"))
      .replace("{name}", name);
  }

  /**
   * Upload to storage backend — logs and swallows errors so the
   * pipeline isn't derailed by a transient storage failure.
   */
  async #safeUpload(
    key: string,
    body: Buffer | Uint8Array | string,
    mimeType: string,
  ): Promise<void> {
    try {
      await storage.upload(key, body, mimeType);
    } catch (err) {
      logger.warn("Storage upload failed — continuing without persistence", {
        err: err instanceof Error ? err.message : String(err),
        key,
      });
    }
  }

  /**
   * Create an evidence DB record — logs and swallows errors.
   * Returns a best-effort object that matches the shape callers
   * (e.g. #toEvidenceItem) expect.
   */
  async #safeCreateRecord(
    investigationId: string,
    type: EvidenceType,
    storageKey: string,
    mimeType: string,
    size: number,
    metadata?: Record<string, unknown>,
  ): Promise<{
    id: string;
    type: EvidenceType;
    storageKey: string;
    mimeType: string;
    size: number;
    metadata: Record<string, unknown>;
    createdAt: Date;
  }> {
    try {
      const record = await evidenceRepo.create({
        investigationId,
        type,
        storageKey,
        mimeType,
        size,
        metadata: metadata ?? {},
      });

      logger.debug("Evidence record created", {
        id: record._id.toString(),
        type,
        investigationId,
        size,
      });

      return {
        id: record._id.toString(),
        type,
        storageKey,
        mimeType,
        size,
        metadata: metadata ?? {},
        createdAt: record.createdAt ?? new Date(),
      };
    } catch (err) {
      logger.warn("Evidence record creation failed — continuing without persistence", {
        err: err instanceof Error ? err.message : String(err),
        type,
        investigationId,
      });

      return {
        id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        type,
        storageKey,
        mimeType,
        size,
        metadata: metadata ?? {},
        createdAt: new Date(),
      };
    }
  }
}

// Singleton.
export const evidenceStore = new EvidenceStore();
