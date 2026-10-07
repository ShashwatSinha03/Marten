import { buildApp } from "./app.js";
import { runFixtureProbe } from "./collector.js";
const app = buildApp();
const controller = new AbortController();
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    controller.abort();
    void app.close();
  });
}
await app.listen({ host: "0.0.0.0", port: Number(process.env.PORT ?? 3001) });
if (process.env.MARTEN_STARTUP_PROBE === "true") {
  const result = await runFixtureProbe({ signal: controller.signal });
  app.log.info(
    { probe: result },
    "Controlled fixture feasibility result; not a public-site isolation certification",
  );
}
