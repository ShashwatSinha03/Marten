import "server-only";
import { createNeonAuth } from "@neondatabase/auth/next/server";
import { readAuthConfig } from "./auth-config";
let instance: ReturnType<typeof createNeonAuth> | undefined;
export function getAuth() {
  const config = readAuthConfig(process.env);
  if (!config) return null;
  return instance ??= createNeonAuth({ baseUrl: config.baseUrl, cookies: { secret: config.secret } });
}
