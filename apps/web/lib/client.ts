import { createClient } from "@supabase/supabase-js";
import { boundedRequest, RequestError } from "./request";
export { RequestError } from "./request";
import type {
  Investigation,
  InvestigationEvent,
  CreateInvestigation,
} from "../../../packages/contracts/src/index";
export type {
  Investigation,
  InvestigationEvent,
  Evidence,
  Report,
  Finding,
} from "../../../packages/contracts/src/index";
export { FIXTURE_URL } from "../../../packages/contracts/src/index";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
export const supabase =
  url && key ? createClient(url, key, { auth: { flowType: "pkce" } }) : null;
const api = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
export const configured = Boolean(supabase && api);
async function request<T>(path: string, init: RequestInit = {}, format: "json" | "blob" | "empty" = "json"): Promise<T> {
  if (!supabase || !api)
    throw new RequestError(
      "NOT_CONFIGURED",
      "The workspace is not connected yet. Configure Supabase and the API to start investigations.",
    );
  const auth = supabase.auth;
  return boundedRequest(async (signal) => {
    const { data } = await auth.getSession();
    if (!data.session)
      throw new RequestError(
        "UNAUTHORIZED",
        "Your session has expired. Sign in again to continue.",
      );
    const response = await fetch(`${api}/v1/investigations${path}`, {
      ...init,
      signal,
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${data.session.access_token}`,
        ...init.headers,
      },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new RequestError(
      body?.error?.code ?? (response.status === 401 ? "UNAUTHORIZED" : response.status === 404 ? "NOT_FOUND" : "REQUEST_FAILED"),
      body?.error?.message ?? "The request could not be completed. Try again.",
    );
  }
  if (format === "empty") return undefined as T;
  return (format === "blob" ? await response.blob() : await response.json()) as T;
  });
}
export const client = {
  list: async (): Promise<Investigation[]> => (await request<{ investigations: Investigation[] }>("")).investigations,
  create: async (body: CreateInvestigation): Promise<Investigation> => {
    try {
      return (await request<{ investigation: Investigation }>("", { method: "POST", body: JSON.stringify(body) })).investigation;
    } catch (error) {
      if (error instanceof RequestError && ["TIMEOUT", "NETWORK_ERROR"].includes(error.code)) {
        throw new RequestError(error.code, "The start request could not be confirmed. The investigation may have started. Check Your investigations before starting another run.");
      }
      throw error;
    }
  },
  get: async (id: string): Promise<Investigation> => (await request<{ investigation: Investigation }>(`/${encodeURIComponent(id)}`)).investigation,
  events: async (id: string, after: number): Promise<InvestigationEvent[]> => (await request<{ events: InvestigationEvent[] }>(`/${encodeURIComponent(id)}/events?after=${after}`)).events,
  cancel: async (id: string): Promise<Investigation> => (await request<{ investigation: Investigation }>(`/${encodeURIComponent(id)}/cancel`, { method: "POST" })).investigation,
  remove: async (id: string): Promise<void> => request<void>(`/${encodeURIComponent(id)}`, { method: "DELETE" }, "empty"),
  screenshot: async (id: string, evidenceId: string): Promise<Blob> => request<Blob>(`/${encodeURIComponent(id)}/evidence/${encodeURIComponent(evidenceId)}`, {}, "blob"),
};
