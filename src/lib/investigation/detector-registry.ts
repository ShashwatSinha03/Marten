import type { Detector, DetectorResult, InvestigationContext } from "./types";
import type { Finding, FindingCategory } from "@/types";

export class DetectorRegistry {
  private detectors = new Map<string, Detector>();

  register(detector: Detector): void {
    this.detectors.set(detector.id, detector);
  }

  registerAll(detectors: Detector[]): void {
    for (const d of detectors) this.register(d);
  }

  get(id: string): Detector | undefined {
    return this.detectors.get(id);
  }

  getAll(): Detector[] {
    return [...this.detectors.values()];
  }

  async execute(
    detectorId: string,
    ctx: InvestigationContext,
  ): Promise<DetectorResult> {
    const detector = this.detectors.get(detectorId);
    if (!detector) {
      return {
        detectorId,
        title: detectorId,
        category: "functional" as FindingCategory,
        findings: [],
        durationMs: 0,
      };
    }
    const start = performance.now();
    try {
      const findings = detector.execute(ctx);
      return {
        detectorId: detector.id,
        title: detector.title,
        category: detector.category,
        findings,
        durationMs: Math.round(performance.now() - start),
      };
    } catch {
      return {
        detectorId: detector.id,
        title: detector.title,
        category: detector.category,
        findings: [],
        durationMs: Math.round(performance.now() - start),
      };
    }
  }

  async executeAll(ctx: InvestigationContext): Promise<DetectorResult[]> {
    const results: DetectorResult[] = [];
    for (const [, detector] of this.detectors) {
      const result = await this.execute(detector.id, ctx);
      results.push(result);
    }
    return results;
  }
}

export const detectorRegistry = new DetectorRegistry();
