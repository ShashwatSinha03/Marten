import { test } from "node:test";
import assert from "node:assert/strict";
import { databaseConnectionString } from "../src/neon-config.js";

test("database URL cannot override verified TLS via SSL parameters", () => {
  const url = new URL(databaseConnectionString("postgresql://user:secret@db.example/neondb?ssl=0&sslmode=disable&sslcert=bad&sslkey=bad&sslrootcert=bad&application_name=marten"));
  for (const key of ["ssl", "sslmode", "sslcert", "sslkey", "sslrootcert"]) assert.equal(url.searchParams.has(key), false);
  assert.equal(url.searchParams.get("application_name"), "marten");
});
