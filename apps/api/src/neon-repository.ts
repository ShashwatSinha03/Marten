import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import type { Repository, StoredRun } from "./repository.js";
interface Database { query(sql: string, values?: unknown[]): Promise<{ rows: Record<string, any>[] }> }
interface Objects { send(command: any, options?: { abortSignal: AbortSignal }): Promise<any> }
const maximumBytes = 5 * 1024 * 1024;
export function createNeonRepository(database: Database, objects: Objects, bucket: string): Repository {
  async function query(sql: string, values?: unknown[]) {
    try { return await database.query(sql, values); }
    catch { throw new Error("STORAGE_UNAVAILABLE"); }
  }
  async function send(command: any) {
    try { return await objects.send(command, { abortSignal: AbortSignal.timeout(10000) }); }
    catch { throw new Error("STORAGE_UNAVAILABLE"); }
  }
  return {
    async charge() {
      const result = await query(`insert into public.marten_daily_usage(day, attempts)
        values ((now() at time zone 'UTC')::date, 1)
        on conflict (day) do update set attempts = public.marten_daily_usage.attempts + 1
        where public.marten_daily_usage.attempts < 5 returning attempts`);
      return result.rows.length === 1;
    },
    async list() {
      const result = await query("select data, owner_id, created_at, expires_at from public.marten_runs order by created_at desc limit 1000");
      return result.rows.map(row => ({ ...row.data, ownerId: row.owner_id,
        createdAt: new Date(row.created_at).toISOString(),
        expiresAt: new Date(row.expires_at).toISOString(),
      } as StoredRun));
    },
    async listExpired(before, limit) {
      const size = Number.isFinite(limit) ? Math.max(1, Math.min(25, Math.floor(limit))) : 25;
      return (await query("select id from public.marten_runs where expires_at <= $1 order by expires_at asc, id asc limit $2", [before, size])).rows.map(row => row.id);
    },
    async put(run) {
      const { ownerId, ...data } = run;
      // Updates cannot restore/reassign an owner cleared by account deletion.
      await query(`insert into public.marten_runs(id, owner_id, created_at, expires_at, data)
        values ($1, $2, $3, $4, $5) on conflict (id) do update set data = excluded.data`,
        [run.id, ownerId, run.createdAt, run.expiresAt, JSON.stringify(data)]);
    },
    async upload(id, page, bytes) {
      if (bytes.byteLength > maximumBytes) throw new Error("STORAGE_UNAVAILABLE");
      await send(new PutObjectCommand({ Bucket: bucket, Key: `${id}/${page}.png`, Body: bytes, ContentType: "image/png" }));
    },
    async download(id, page) {
      try {
        const controller = AbortSignal.timeout(10000);
        const result = await objects.send(new GetObjectCommand({ Bucket: bucket, Key: `${id}/${page}.png` }), { abortSignal: controller });
        if (!result.Body || (result.ContentLength ?? 0) > maximumBytes) throw new Error();
        const chunks: Buffer[] = [];
        let length = 0;
        for await (const chunk of result.Body) {
          length += chunk.length;
          if (length > maximumBytes || controller.aborted) { result.Body.destroy?.(); throw new Error(); }
          chunks.push(Buffer.from(chunk));
        }
        return Buffer.concat(chunks);
      } catch { throw new Error("STORAGE_UNAVAILABLE"); }
    },
    async remove(id) {
      // Individual deletes are idempotent, including retry after a partial deletion.
      for (const page of ["page-1", "page-2", "page-3"]) {
        await send(new DeleteObjectCommand({ Bucket: bucket, Key: `${id}/${page}.png` }));
      }
      await query("delete from public.marten_runs where id = $1", [id]);
    },
  };
}
