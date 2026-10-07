import { runFixtureProbe } from "./collector.js";
const controller = new AbortController();
process.once("SIGINT", () => controller.abort());
process.once("SIGTERM", () => controller.abort());
const result = await runFixtureProbe({ signal: controller.signal });
console.log(JSON.stringify(result, null, 2));
if (
  result.state !== "partial" ||
  result.pages.length !== 2 ||
  result.pages[0].status !== 200 ||
  result.pages[1].status !== 404
)
  process.exitCode = 1;
