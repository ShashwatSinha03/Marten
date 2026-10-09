import { createClient } from "@supabase/supabase-js";
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
export class RequestError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
  }
}
async function request(path: string, init: RequestInit = {}) {
  if (!supabase || !api)
    throw new RequestError(
      "NOT_CONFIGURED",
      "The workspace is not connected yet. Configure Supabase and the API to start investigations.",
    );
  const { data } = await supabase.auth.getSession();
  if (!data.session)
    throw new RequestError(
      "UNAUTHORIZED",
      "Your session has expired. Sign in again to continue.",
    );
  const response = await fetch(`${api}/v1/investigations${path}`, {
    ...init,
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
      body?.error?.code ?? "REQUEST_FAILED",
      body?.error?.message ?? "The request could not be completed. Try again.",
    );
  }
  return response;
}
export const client = {
  list: async (): Promise<Investigation[]> =>
    (await (await request("")).json()).investigations,
  create: async (body: CreateInvestigation): Promise<Investigation> =>
    (
      await (
        await request("", { method: "POST", body: JSON.stringify(body) })
      ).json()
    ).investigation,
  get: async (id: string): Promise<Investigation> =>
    (await (await request(`/${encodeURIComponent(id)}`)).json()).investigation,
  events: async (id: string, after: number): Promise<InvestigationEvent[]> =>
    (
      await (
        await request(`/${encodeURIComponent(id)}/events?after=${after}`)
      ).json()
    ).events,
  cancel: async (id: string): Promise<Investigation> =>
    (
      await (
        await request(`/${encodeURIComponent(id)}/cancel`, { method: "POST" })
      ).json()
    ).investigation,
  remove: async (id: string): Promise<void> => {
    await request(`/${encodeURIComponent(id)}`, { method: "DELETE" });
  },
  screenshot: async (id: string, evidenceId: string): Promise<Blob> =>
    (
      await request(
        `/${encodeURIComponent(id)}/evidence/${encodeURIComponent(evidenceId)}`,
      )
    ).blob(),
};
