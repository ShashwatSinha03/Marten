import type {
  Investigation,
  InvestigationEvent,
} from "../../../packages/contracts/src/index.js";
export interface StoredRun extends Investigation {
  ownerId: string;
  events: InvestigationEvent[];
}
export interface Repository {
  charge(): Promise<boolean>;
  list(): Promise<StoredRun[]>;
  listExpired(before: string, limit: number): Promise<string[]>;
  put(run: StoredRun): Promise<void>;
  remove(id: string): Promise<void>;
  upload(id: string, page: string, bytes: Buffer): Promise<void>;
  download(id: string, page: string): Promise<Buffer>;
}
export function supabaseConfiguration() {
  const url = process.env.SUPABASE_URL,
    key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return undefined;
  const base = new URL(url);
  if (
    base.protocol !== "https:" ||
    base.pathname !== "/" ||
    base.search ||
    base.hash
  )
    throw new Error("Invalid Supabase configuration");
  async function request(path: string, init: RequestInit = {}) {
    const response = await fetch(base.origin + path, {
      ...init,
      headers: {
        apikey: key!,
        ...(key!.startsWith("eyJ") ? { Authorization: `Bearer ${key}` } : {}),
        ...init.headers,
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error("STORAGE_UNAVAILABLE");
    return response;
  }
  const repository: Repository = {
    async charge() {
      return (
        (await (
          await request("/rest/v1/rpc/marten_charge", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: "{}",
          })
        ).json()) === true
      );
    },
    async list() {
      return (
        await (
          await request(
            "/rest/v1/marten_runs?select=data&order=created_at.desc&limit=1000",
          )
        ).json()
      ).map((row: { data: StoredRun }) => row.data);
    },
    async listExpired(before, limit) {
      const query = new URLSearchParams({
        select: "id",
        expires_at: `lte.${before}`,
        order: "expires_at.asc,id.asc",
        limit: String(Math.max(1, Math.min(25, Math.floor(limit)))),
      });
      const rows = await (await request(`/rest/v1/marten_runs?${query}`)).json();
      return rows.map((row: { id: string }) => row.id);
    },
    async put(run) {
      await request("/rest/v1/marten_runs?on_conflict=id", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Prefer: "resolution=merge-duplicates",
        },
        body: JSON.stringify({
          id: run.id,
          owner_id: run.ownerId,
          created_at: run.createdAt,
          expires_at: run.expiresAt,
          data: run,
        }),
      });
    },
    async upload(id, page, bytes) {
      await request(`/storage/v1/object/marten-evidence/${id}/${page}.png`, {
        method: "POST",
        headers: { "Content-Type": "image/png" },
        body: new Uint8Array(bytes),
      });
    },
    async download(id, page) {
      return Buffer.from(
        await (
          await request(`/storage/v1/object/marten-evidence/${id}/${page}.png`)
        ).arrayBuffer(),
      );
    },
    async remove(id) {
      await request("/storage/v1/object/marten-evidence", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prefixes: [
            `${id}/page-1.png`,
            `${id}/page-2.png`,
            `${id}/page-3.png`,
          ],
        }),
      });
      await request(`/rest/v1/marten_runs?id=eq.${id}`, { method: "DELETE" });
    },
  };
  return {
    repository,
    authenticate: async (token: string) => {
      const response = await fetch(base.origin + "/auth/v1/user", {
        headers: { apikey: key, Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) return null;
      const user = await response.json();
      return typeof user.id === "string" ? user.id : null;
    },
  };
}
