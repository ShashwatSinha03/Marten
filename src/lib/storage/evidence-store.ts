import { storage } from "./s3";
import prisma from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { logger } from "@/lib/logger";

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
 * Each piece of evidence is uploaded to S3 and a corresponding
 * EvidenceRecord is created in the database.
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

    await storage.upload(key, buffer, "image/png");
    return this.#createRecord(investigationId, "screenshot", key, "image/png", buffer.length, metadata);
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
    await storage.upload(key, body, "text/html");
    return this.#createRecord(investigationId, "dom_snapshot", key, "text/html", body.length, metadata);
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
    await storage.upload(key, body, "application/json");
    return this.#createRecord(investigationId, "network_log", key, "application/json", body.length, metadata);
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
    await storage.upload(key, body, "application/json");
    return this.#createRecord(investigationId, "console_log", key, "application/json", body.length, metadata);
  }

  /**
   * Get a signed URL or public URL for an evidence record.
   */
  async getEvidenceUrl(evidenceRecordId: string): Promise<string> {
    const record = await prisma.evidenceRecord.findUnique({
      where: { id: evidenceRecordId },
    });

    if (!record) {
      throw new Error(`Evidence record not found: ${evidenceRecordId}`);
    }

    return storage.getSignedUrl(record.storageKey, 3600);
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

  async #createRecord(
    investigationId: string,
    type: string,
    storageKey: string,
    mimeType: string,
    size: number,
    metadata?: Record<string, unknown>,
  ) {
    const record = await prisma.evidenceRecord.create({
      data: {
        investigationId,
        type,
        storageKey,
        mimeType,
        size,
        metadata: (metadata ?? {}) as Prisma.InputJsonValue,
      },
    });

    logger.debug("Evidence record created", {
      id: record.id,
      type,
      investigationId,
      size,
    });

    return record;
  }
}

// Singleton.
export const evidenceStore = new EvidenceStore();
