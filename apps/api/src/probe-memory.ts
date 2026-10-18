import { readFile } from "node:fs/promises";

/** Optional cgroup-v2 counters; no shell execution or arbitrary filesystem paths. */
export async function readProbeMemory(
  read: (path: string) => Promise<string> = path => readFile(path, "utf8"),
) {
  const values = await Promise.all(["current", "peak", "max"].map(async name => {
    try {
      const raw = (await read(`/sys/fs/cgroup/memory.${name}`)).trim();
      if (raw === "max") return "max";
      if (!/^\d{1,16}$/.test(raw)) return null;
      const value = Number(raw);
      return Number.isSafeInteger(value) ? value : null;
    } catch { return null; }
  }));
  const [current, peak, limit] = values;
  return {
    currentBytes: typeof current === "number" ? current : null,
    peakBytes: typeof peak === "number" ? peak : null,
    limitBytes: typeof limit === "number" ? limit : null,
    limit: limit === "max" ? "unlimited" : typeof limit === "number" ? "bounded" : "unavailable",
    measurement: "cgroup v2 root counters when available; peak covers cgroup lifetime, not only this probe; includes other processes in the same cgroup.",
  };
}
