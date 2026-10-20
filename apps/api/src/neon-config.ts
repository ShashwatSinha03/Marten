import { Pool } from "pg";
import { S3Client } from "@aws-sdk/client-s3";
import { createRemoteJWKSet } from "jose";
import { createAuthenticator } from "./neon-auth.js";
import { createNeonRepository } from "./neon-repository.js";

export function neonConfiguration() {
  const names = ["DATABASE_URL", "NEON_AUTH_BASE_URL", "NEON_STORAGE_ENDPOINT", "NEON_STORAGE_REGION", "NEON_STORAGE_BUCKET", "NEON_STORAGE_ACCESS_KEY_ID", "NEON_STORAGE_SECRET_ACCESS_KEY"] as const;
  const values = names.map(name => process.env[name]);
  if (values.some(value => !value)) return undefined;
  function https(value: string) {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) throw new Error();
    return url;
  }
  try {
    const [databaseUrl, authUrl, endpoint, region, bucket, accessKeyId, secretAccessKey] = values as string[];
    const connectionString = databaseConnectionString(databaseUrl);
    const auth = https(authUrl);
    const storage = https(endpoint);
    if (storage.pathname !== "/") throw new Error();
    const jwksUrl = new URL(auth.href.replace(/\/$/, "") + "/.well-known/jwks.json");
    const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: true }, max: 3,
      connectionTimeoutMillis: 10000, idleTimeoutMillis: 10000, query_timeout: 10000, statement_timeout: 10000 });
    // Idle connection failures are retried by later requests; never log credential-bearing errors.
    pool.on("error", () => {});
    const objects = new S3Client({ endpoint: storage.origin, region, forcePathStyle: true, maxAttempts: 1,
      credentials: { accessKeyId, secretAccessKey } });
    return {
      repository: createNeonRepository(pool, objects, bucket),
      authenticate: createAuthenticator(createRemoteJWKSet(jwksUrl, { timeoutDuration: 10000 }), auth.origin, auth.origin),
      close: async () => { objects.destroy(); await pool.end(); },
    };
  } catch { throw new Error("Invalid Neon configuration"); }
}

/** Strip driver URL flags so connectionString cannot override verified TLS. */
export function databaseConnectionString(value: string) {
  const database = new URL(value);
  if (!["postgres:", "postgresql:"].includes(database.protocol)) throw new Error("Invalid Neon configuration");
  for (const key of [...database.searchParams.keys()]) {
    if (key.toLowerCase().startsWith("ssl") || key === "uselibpqcompat") database.searchParams.delete(key);
  }
  return database.href;
}
