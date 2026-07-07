import OpenAI from "openai";
import type {
  Finding,
  ProductGraphData,
  LlmFinding,
  LlmResponse,
  EvidenceRef,
} from "@/types";
import type { EvidenceBundle } from "./types";
import { llmUsageRepo } from "@/lib/repositories/llm-usage.repository";
import { emitter } from "@/lib/sse/emitter";
import { SseEventType } from "@/lib/sse/types";
import { logger } from "@/lib/logger";
import config from "@/lib/config";

/**
 * LlmEvaluation runs the LLM-based analysis pipeline for standard-depth
 * investigations. It assembles context within a 50K token budget, calls
 * gpt-4o-mini, and extracts structured findings with hallucination
 * safeguards.
 */
export class LlmEvaluation {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: config.llm.apiKey,
      timeout: config.llm.timeoutMs,
      maxRetries: 3,
    });
  }

  /**
   * Run LLM-based evaluation on the investigation data.
   *
   * @param investigationId  - The current investigation.
   * @param productGraph     - The built product graph.
   * @param evidence         - Collected evidence bundle.
   * @param heuristicFindings - Findings from heuristic detectors (for cross-reference).
   * @returns Array of LLM-derived findings.
   */
  async evaluate(
    investigationId: string,
    productGraph: ProductGraphData,
    evidence: EvidenceBundle,
    heuristicFindings: Finding[],
  ): Promise<Finding[]> {
    const startTime = Date.now();

    // Stage 1: Context assembly (50K token budget).
    const context = this.#assembleContext(
      productGraph,
      evidence,
      heuristicFindings,
    );

    // Stage 2: Prompt assembly.
    const systemPrompt = this.#buildSystemPrompt();
    const userPrompt = this.#buildUserPrompt(context, productGraph);

    // Stage 3: LLM call.
    let llmResponse: LlmResponse;
    try {
      llmResponse = await this.#callLlm(systemPrompt, userPrompt, investigationId);
    } catch (err) {
      logger.error({ err, investigationId }, "LLM evaluation failed");
      return [];
    }

    // Stage 4: Response parsing and validation.
    const llmFindings = this.#extractFindings(
      llmResponse,
      investigationId,
      evidence,
    );

    // Track token usage.
    // Note: In production, capture usage from the API response.
    await llmUsageRepo.create({
      investigationId,
      model: config.llm.model,
      promptTokens: 0, // Requires response.usage
      completionTokens: 0,
      totalTokens: 0,
      costUsd: null,
      durationMs: Date.now() - startTime,
    });

    const duration = Date.now() - startTime;
    logger.info("LLM evaluation completed", {
      investigationId,
      findings: llmFindings.length,
      duration,
    });

    return llmFindings;
  }

  // ── Stage 1: Context Assembly ──────────────────────────────────

  #assembleContext(
    graph: ProductGraphData,
    evidence: EvidenceBundle,
    heuristicFindings: Finding[],
  ): string {
    const parts: string[] = [];
    let budget = config.llm.maxTokens; // 50K

    // Graph summary (highest priority).
    const graphSummary = this.#summarizeGraph(graph);
    parts.push(graphSummary);
    budget -= this.#estimateTokens(graphSummary);

    // Console errors (high priority).
    for (const log of evidence.consoleLogs.slice(0, 5)) {
      const entries = (log.metadata as { entries?: unknown[] })?.entries;
      const entry = `[Console log: ${entries?.length ?? 0} entries]`;
      parts.push(entry);
      budget -= this.#estimateTokens(entry);
    }

    // Network issues (high priority).
    for (const net of evidence.networkLogs.slice(0, 3)) {
      const entries = (net.metadata as { entries?: unknown[] })?.entries;
      const entry = `[Network log: ${entries?.length ?? 0} entries]`;
      parts.push(entry);
      budget -= this.#estimateTokens(entry);
    }

    // Heuristic findings (medium priority).
    if (budget > 1000 && heuristicFindings.length > 0) {
      const findingsSummary = heuristicFindings
        .slice(0, 30)
        .map((f) => `- [${f.severity}] ${f.title} (${f.category})`)
        .join("\n");
      parts.push("## Heuristic Findings\n" + findingsSummary);
      budget -= this.#estimateTokens(findingsSummary);
    }

    // Screenshot descriptions (low priority).
    if (budget > 500) {
      const screenshotInfo = evidence.screenshots
        .map((s) => `[Screenshot: ${s.metadata?.type ?? "unknown"}, ${s.size} bytes]`)
        .join("\n");
      parts.push(screenshotInfo);
      budget -= this.#estimateTokens(screenshotInfo);
    }

    // DOM structure analysis (lowest priority).
    if (budget > 500 && evidence.domSnapshots.length > 0) {
      const domInfo = `[DOM snapshot available: ${evidence.domSnapshots.length} capture(s)]`;
      parts.push(domInfo);
    }

    return parts.join("\n\n");
  }

  #summarizeGraph(graph: ProductGraphData): string {
    const nodesByType = new Map<string, number>();
    for (const node of graph.nodes) {
      nodesByType.set(node.type, (nodesByType.get(node.type) ?? 0) + 1);
    }

    const edgesByType = new Map<string, number>();
    for (const edge of graph.edges) {
      edgesByType.set(edge.type, (edgesByType.get(edge.type) ?? 0) + 1);
    }

    const topNodes = graph.nodes
      .sort((a, b) => a.priority - b.priority)
      .slice(0, 20)
      .map(
        (n) =>
          `- [${n.type}] ${n.label} (${n.metadata?.tagName ?? "unknown"}, priority ${n.priority})`,
      )
      .join("\n");

    return [
      `## Product Graph Summary`,
      `Nodes: ${graph.nodes.length}, Edges: ${graph.edges.length}`,
      `Quality: ${graph.quality}, Truncated: ${graph.truncated}`,
      ``,
      `### Node Types`,
      ...[...nodesByType.entries()].map(([t, c]) => `- ${t}: ${c}`),
      ``,
      `### Top Components`,
      topNodes,
      ``,
      `### Edge Types`,
      ...[...edgesByType.entries()].map(([t, c]) => `- ${t}: ${c}`),
    ].join("\n");
  }

  // ── Stage 2: Prompt Assembly ───────────────────────────────────

  #buildSystemPrompt(): string {
    return `You are an expert UI/UX auditor analyzing an AI-generated user interface. Your task is to identify issues, anti-patterns, and improvements in the investigated interface.

Focus on:
1. **Functional issues**: Broken interactions, missing functionality, incorrect behavior
2. **Usability problems**: Confusing layouts, poor information hierarchy, accessibility gaps
3. **Visual inconsistencies**: Alignment issues, spacing problems, responsive design flaws
4. **Performance concerns**: Render-blocking resources, excessive DOM size, inefficient patterns
5. **Security observations**: Mixed content, exposed sensitive data, missing security headers

For each finding:
- Provide a clear, specific title
- Write a detailed description with context
- Assign appropriate severity (critical/high/medium/low/info)
- Assign a category (behavioral/functional/accessibility/visual/network/dom_structure)
- Rate your confidence (high/medium/low)
- Reference specific evidence (graph nodes, console logs, network entries)
- Provide actionable recommendations

IMPORTANT RULES:
- Only report issues you have direct evidence for
- If evidence is insufficient, flag the finding as low confidence
- Do not guess or make assumptions without supporting evidence
- Cross-reference with heuristic findings when applicable
- Return findings as structured JSON following the specified schema`;
  }

  #buildUserPrompt(
    context: string,
    graph: ProductGraphData,
  ): string {
    return `Analyze the following UI investigation data and identify issues.

## Investigation Context
URL: ${graph.metadata.url}
Depth: ${graph.metadata.depth}
Investigation completed at: ${new Date().toISOString()}

${context}

## Analysis Requirements
Analyze this interface and return findings as a JSON object with the following schema:

\`\`\`json
{
  "findings": [
    {
      "title": "string - Clear, specific issue title",
      "description": "string - Detailed description with context",
      "severity": "critical | high | medium | low | info",
      "category": "behavioral | functional | accessibility | visual | network | dom_structure",
      "evidence_refs": ["string - References to specific evidence items"],
      "confidence": "high | medium | low",
      "recommendation": "string - Actionable fix recommendation"
    }
  ],
  "summary": {
    "total_findings": "number",
    "critical_count": "number",
    "high_count": "number",
    "medium_count": "number",
    "low_count": "number",
    "info_count": "number",
    "categories_covered": ["string array of covered categories"]
  },
  "analysis_quality": {
    "graph_completeness": "adequate | limited | insufficient",
    "evidence_sufficiency": "adequate | limited | insufficient",
    "notes": "string - Any notes about analysis limitations"
  }
}
\`\`\`

Return ONLY valid JSON. Do not include any text outside the JSON object.`;
  }

  // ── Stage 3: LLM Call ──────────────────────────────────────────

  async #callLlm(
    systemPrompt: string,
    userPrompt: string,
    investigationId: string,
  ): Promise<LlmResponse> {
    const startTime = Date.now();

    const response = await this.openai.chat.completions.create({
      model: config.llm.model,
      temperature: config.llm.temperature,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("Empty LLM response");
    }

    // Emit token usage info for streaming UX.
    const usage = response.usage;
    if (usage) {
      emitter.emit(investigationId, {
        type: SseEventType.LlmProgress,
        data: {
          promptTokens: usage.prompt_tokens,
          completionTokens: usage.completion_tokens,
          totalTokens: usage.total_tokens,
          durationMs: Date.now() - startTime,
        },
      });
    }

    // Parse JSON response.
    try {
      const parsed = JSON.parse(content) as LlmResponse;
      return this.#validateResponse(parsed);
    } catch (err) {
      logger.error({ err, investigationId }, "Failed to parse LLM response");
      throw new Error("Invalid LLM response format");
    }
  }

  // ── Stage 4: Response Validation ───────────────────────────────

  #validateResponse(response: LlmResponse): LlmResponse {
    if (!Array.isArray(response.findings)) {
      throw new Error("LLM response missing findings array");
    }

    for (const finding of response.findings) {
      if (!finding.title || !finding.description) {
        throw new Error("LLM finding missing title or description");
      }
      if (!["critical", "high", "medium", "low", "info"].includes(finding.severity)) {
        finding.severity = "medium";
      }
      if (!["behavioral", "functional", "accessibility", "visual", "network", "dom_structure"].includes(finding.category)) {
        finding.category = "functional";
      }
    }

    return response;
  }

  // ── Stage 5: Finding Extraction ─────────────────────────────────

  #extractFindings(
    response: LlmResponse,
    investigationId: string,
    evidence: EvidenceBundle,
  ): Finding[] {
    const findings: Finding[] = [];

    for (const lf of response.findings) {
      // Build evidence refs.
      const evidenceRefs: EvidenceRef[] = lf.evidence_refs.map((ref) => ({
        type: "llm_source",
        id: ref,
      }));

      // Cross-reference with available evidence.
      const hasDirectEvidence = this.#hasDirectEvidence(lf, evidence);

      const confidenceScore =
        lf.confidence === "high" ? 0.9
        : lf.confidence === "medium" ? 0.7
        : 0.4;

      // Hallucination safeguard: lower confidence if no direct evidence.
      const finalConfidence = hasDirectEvidence ? confidenceScore : confidenceScore * 0.5;
      const isLowConfidence = !hasDirectEvidence || lf.confidence === "low";

      findings.push({
        id: crypto.randomUUID(),
        investigationId,
        title: lf.title,
        description: lf.description,
        severity: lf.severity,
        category: lf.category,
        confidence: finalConfidence,
        source: "llm",
        evidenceRefs,
        isLowConfidence,
        recommendation: lf.recommendation,
        createdAt: new Date().toISOString(),
      });
    }

    return findings;
  }

  /**
   * Check whether an LLM finding has direct evidence support.
   * Looks for evidence refs that match actual collected evidence.
   */
  #hasDirectEvidence(finding: LlmFinding, evidence: EvidenceBundle): boolean {
    const evidenceText = [
      ...evidence.consoleLogs.map((l) => JSON.stringify(l.metadata)),
      ...evidence.networkLogs.map((l) => JSON.stringify(l.metadata)),
      ...evidence.domSnapshots.map((l) => JSON.stringify(l.metadata)),
    ].join(" ").toLowerCase();

    for (const ref of finding.evidence_refs) {
      if (evidenceText.includes(ref.toLowerCase())) return true;
    }

    // Even without explicit refs, if the finding is about console/network issues,
    // and we have those logs, consider it supported.
    if (
      finding.category === "network" &&
      evidence.networkLogs.length > 0
    ) {
      return true;
    }
    if (
      finding.category === "accessibility" &&
      evidence.domSnapshots.length > 0
    ) {
      return true;
    }
    if (
      finding.category === "behavioral" &&
      evidence.consoleLogs.length > 0
    ) {
      return true;
    }

    return false;
  }

  // ── Token estimation ───────────────────────────────────────────

  #estimateTokens(text: string): number {
    // Rough estimation: ~4 chars per token.
    return Math.ceil(text.length / 4);
  }
}
