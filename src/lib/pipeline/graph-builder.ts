import { investigationRepo } from "@/lib/repositories/investigation.repository";
import { emitter } from "@/lib/sse/emitter";
import { SseEventType } from "@/lib/sse/types";
import { logger } from "@/lib/logger";
import config from "@/lib/config";
import type {
  GraphNode,
  GraphEdge,
  ProductGraphData,
  GraphNodeType,
  GraphEdgeType,
} from "@/types";
import type { EvidenceBundle } from "./types";

/**
 * ProductGraphBuilder extracts a structured component graph from
 * captured evidence using purely heuristic analysis — no LLM calls.
 *
 * Pipeline:
 *  1. Parse HTML → extract elements with tag, id, classes, attributes
 *  2. Identify components (landmarks > interactive > media > content > composite)
 *  3. Map network requests to components
 *  4. Map console logs to components
 *  5. Identify interaction points (links, form controls, etc.)
 *  6. Build edges (contains, triggers, fetches, etc.)
 */
export class ProductGraphBuilder {
  private nodeCounter = 0;
  private edgeCounter = 0;

  /**
   * Build a ProductGraph from the evidence bundle.
   */
  async build(
    investigationId: string,
    evidence: EvidenceBundle,
  ): Promise<ProductGraphData> {
    this.nodeCounter = 0;
    this.edgeCounter = 0;

    const startTime = Date.now();
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];

    // Get the HTML from the first DOM snapshot.
    const domSnapshot = evidence.domSnapshots[0];
    const html = domSnapshot?.metadata?.html as string ?? "<html><body></body></html>";

    // Stage 1: Parse HTML into structured elements.
    const elements = this.#parseHtml(html);

    // Stage 2: Identify components (score + rank).
    const components = this.#identifyComponents(elements);
    for (const comp of components) {
      const node = this.#makeNode(comp);
      nodes.push(node);

      emitter.emit(investigationId, {
        type: SseEventType.GraphNodeAdded,
        data: { node },
      });
    }

    // Stage 3: Build structural "contains" edges from nesting.
    this.#buildStructuralEdges(nodes, edges, elements);

    // Stage 4: Map network requests to components (URL matching).
    if (evidence.networkLogs.length > 0) {
      this.#mapNetworkToComponents(
        evidence.networkLogs[0],
        nodes,
        edges,
      );
    }

    // Stage 5: Map console logs to components.
    if (evidence.consoleLogs.length > 0) {
      this.#mapConsoleToComponents(
        evidence.consoleLogs[0],
        nodes,
        edges,
      );
    }

    // Stage 6: Identify interaction points.
    this.#identifyInteractionPoints(elements, nodes, edges);

    // Validate — cyclic edge removal.
    this.#removeCyclicEdges(nodes, edges);

    // Size management.
    const maxNodes = config.limits.graphMaxNodes;
    let truncated = false;

    if (nodes.length > maxNodes) {
      nodes.sort((a, b) => a.priority - b.priority);
      nodes.splice(maxNodes);
      truncated = true;

      const nodeIds = new Set(nodes.map((n) => n.id));
      for (let i = edges.length - 1; i >= 0; i--) {
        if (!nodeIds.has(edges[i].source) || !nodeIds.has(edges[i].target)) {
          edges.splice(i, 1);
        }
      }
    }

    // Detect and remove orphan nodes (nodes with no edges and low priority).
    this.#removeOrphans(nodes, edges);

    const quality = this.#calculateQuality(nodes, edges, elements.length);

    const graphData: ProductGraphData = {
      nodes,
      edges,
      quality,
      truncated,
      metadata: {
        url: (domSnapshot?.metadata as Record<string, unknown>)?.url as string ?? "",
        depth: ((domSnapshot?.metadata as Record<string, unknown>)?.depth as "quick" | "standard") ?? "quick",
        nodeCount: nodes.length,
        edgeCount: edges.length,
        builtAt: new Date().toISOString(),
        version: "1.0.0",
      },
    };

    emitter.emit(investigationId, {
      type: SseEventType.GraphBuildComplete,
      data: {
        nodeCount: nodes.length,
        edgeCount: edges.length,
        quality,
        truncated,
      },
    });

    await investigationRepo.saveGraph(investigationId, {
      nodes,
      edges,
      quality,
      truncated,
      metadata: graphData.metadata,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const duration = Date.now() - startTime;
    logger.info("Product graph built", {
      investigationId,
      nodes: nodes.length,
      edges: edges.length,
      quality,
      truncated,
      duration,
    });

    return graphData;
  }

  // ── Stage 1: HTML Parsing ──────────────────────────────────────

  private parsedElementCache: ParsedElement[] = [];

  #parseHtml(html: string): ParsedElement[] {
    const elements: ParsedElement[] = [];
    const selfClosing = new Set([
      "area", "base", "br", "col", "embed", "hr", "img", "input",
      "link", "meta", "param", "source", "track", "wbr",
    ]);

    // Match opening tags with attributes.
    const tagPattern = /<([a-zA-Z][a-zA-Z0-9]*)((?:\s+[^>]*?)?)\s*(\/?)>/g;
    const stack: ParsedElement[] = [];
    let match: RegExpExecArray | null;

    while ((match = tagPattern.exec(html)) !== null) {
      const tagName = match[1].toLowerCase();
      const attrStr = match[2];
      const isSelfClosing = match[3] === "/" || selfClosing.has(tagName);

      if (["script", "style", "noscript", "meta", "link", "head"].includes(tagName)) {
        if (!isSelfClosing) {
          // Find the closing tag and skip past it.
          const closePattern = new RegExp(`</${tagName}\\s*>`, "i");
          const closeMatch = closePattern.exec(html.slice(tagPattern.lastIndex));
          if (closeMatch) {
            tagPattern.lastIndex += closeMatch.index + closeMatch[0].length;
          }
        }
        continue;
      }

      const attributes = this.#parseAttributes(attrStr);
      const id = attributes.id ?? "";
      const classes = (attributes.class ?? "").split(/\s+/).filter(Boolean);
      const text = this.#extractTextAround(html, tagPattern.lastIndex, tagName);

      const interactive = this.#isInteractive(tagName, attributes);

      const el: ParsedElement = {
        tagName,
        id,
        classes,
        attributes,
        text,
        depth: stack.length,
        interactive,
        visible: attributes.hidden === undefined && attributes["aria-hidden"] !== "true",
        startOffset: tagPattern.lastIndex - match[0].length,
        endOffset: tagPattern.lastIndex,
        children: [],
      };

      if (!isSelfClosing) {
        stack.push(el);
      }

      elements.push(el);

      // Update parent-children relationships.
      if (stack.length > 1) {
        const parent = stack[stack.length - 2];
        parent.children.push(el);
      }
    }

    this.parsedElementCache = elements;
    return elements;
  }

  #parseAttributes(attrStr: string): Record<string, string> {
    const attrs: Record<string, string> = {};
    const attrPattern = /([a-zA-Z_:][a-zA-Z0-9_:.-]*)\s*(?:=\s*(?:"([^"]*)"|'([^']*)'|(\S+)))?/g;
    let match: RegExpExecArray | null;
    while ((match = attrPattern.exec(attrStr)) !== null) {
      const key = match[1].toLowerCase();
      const value = match[2] ?? match[3] ?? match[4] ?? "";
      attrs[key] = value;
    }
    return attrs;
  }

  #extractTextAround(html: string, fromIndex: number, tagName: string): string {
    if (["img", "input", "br", "hr", "link", "meta"].includes(tagName)) return "";
    const endPattern = new RegExp(`</${tagName}\\s*>`, "i");
    const endMatch = endPattern.exec(html.slice(fromIndex));
    if (!endMatch) return "";
    const inner = html.slice(fromIndex, fromIndex + endMatch.index);
    // Strip inner HTML tags to get text.
    return inner.replace(/<[^>]*>/g, "").trim().slice(0, 200);
  }

  // ── Stage 2: Component Identification ──────────────────────────

  #identifyComponents(elements: ParsedElement[]): ParsedElement[] {
    const scored = elements.map((el) => ({
      el,
      score: this.#componentScore(el),
    }));

    scored.sort((a, b) => b.score - a.score);

    const maxComponents = Math.min(scored.length, 200);
    return scored.slice(0, maxComponents).map((s) => s.el);
  }

  #componentScore(el: ParsedElement): number {
    let score = 0;
    const tag = el.tagName;
    const cls = el.classes.join(" ").toLowerCase();

    // Structural landmarks.
    if (["header", "footer", "nav", "main", "aside", "section", "article"].includes(tag)) {
      score += 10;
    }

    // Interactive elements.
    if (el.interactive) score += 8;

    // Media elements.
    if (["img", "video", "audio", "picture", "canvas"].includes(tag)) {
      score += 6;
      if (tag === "img" && el.attributes.alt) score += 2;
    }

    // Content containers.
    if (["p", "h1", "h2", "h3", "h4", "h5", "h6", "li", "td", "th", "blockquote"].includes(tag)) {
      score += 4;
      if (el.text.length > 20) score += 2;
    }

    // Form elements.
    if (["form", "input", "select", "textarea", "button", "label", "fieldset"].includes(tag)) {
      score += 7;
    }

    // Composite patterns (class-based).
    if (/(card|container|wrapper|panel|modal|dialog|tab|accordion|sidebar|widget|box|row|col)/i.test(cls)) {
      score += 5;
    }

    // Visibility bonus.
    if (el.visible) score += 3;

    // Depth penalty.
    score -= el.depth * 0.5;

    return Math.max(score, 0);
  }

  // ── Stage 3: Structural Edges ──────────────────────────────────

  #buildStructuralEdges(
    nodes: GraphNode[],
    edges: GraphEdge[],
    elements: ParsedElement[],
  ): void {
    const nodeMap = new Map<string, ParsedElement>();
    for (let i = 0; i < nodes.length; i++) {
      nodeMap.set(nodes[i].id, elements[i] ?? elements[0]);
    }

    // Build parent-child "contains" edges based on HTML nesting from the parsed elements.
    for (let i = 0; i < elements.length && i < nodes.length; i++) {
      const parentEl = elements[i];
      const parentNode = nodes[i];
      if (!parentNode) continue;

      for (const childEl of parentEl.children) {
        const childIdx = elements.indexOf(childEl);
        if (childIdx >= 0 && childIdx < nodes.length) {
          const childNode = nodes[childIdx];
          edges.push(this.#makeEdge(parentNode.id, childNode.id, "contains"));
          this.#emitEdge(parentNode.id, childNode.id, "contains");
        }
      }
    }
  }

  // ── Stage 4: Network Mapping ──────────────────────────────────

  #mapNetworkToComponents(
    networkLog: { id: string; metadata: unknown },
    nodes: GraphNode[],
    edges: GraphEdge[],
  ): void {
    const entries = ((networkLog.metadata as Record<string, unknown>)?.entries ?? []) as Array<{
      url: string;
      status: number;
    }>;

    for (const entry of entries) {
      for (const node of nodes) {
        const src = node.metadata?.attributes?.src ?? "";
        const href = node.metadata?.attributes?.href ?? "";
        if (src && entry.url.includes(src)) {
          edges.push(this.#makeEdge(
            node.id,
            `net_${entry.url.slice(0, 30).replace(/[^a-zA-Z0-9]/g, "_")}`,
            "fetches",
            { url: entry.url, status: entry.status },
          ));
          break;
        }
      }
    }
  }

  // ── Stage 5: Console Log Mapping ──────────────────────────────

  #mapConsoleToComponents(
    consoleLog: { id: string; metadata: unknown },
    nodes: GraphNode[],
    edges: GraphEdge[],
  ): void {
    const entries = ((consoleLog.metadata as Record<string, unknown>)?.entries ?? []) as Array<{
      message: string;
      source: string;
      level: string;
    }>;

    for (const entry of entries) {
      const sourceUrl = entry.source?.toLowerCase() ?? "";
      for (const node of nodes) {
        const src = node.metadata?.attributes?.src?.toLowerCase() ?? "";
        if (src && sourceUrl.includes(src)) {
          edges.push(this.#makeEdge(
            `log_${entry.source.slice(0, 20).replace(/[^a-zA-Z0-9]/g, "_")}`,
            node.id,
            "logs",
            { message: entry.message.slice(0, 100), level: entry.level },
          ));
          break;
        }
      }
    }
  }

  // ── Stage 6: Interaction Points ────────────────────────────────

  #identifyInteractionPoints(
    elements: ParsedElement[],
    nodes: GraphNode[],
    edges: GraphEdge[],
  ): void {
    for (let i = 0; i < elements.length && i < nodes.length; i++) {
      const el = elements[i];
      const node = nodes[i];

      if (!el.interactive) continue;

      const href = el.attributes.href;
      const formAction = el.attributes.action;
      const elFor = el.attributes.for;

      // Navigates to (links).
      if (href && href !== "#" && !href.startsWith("javascript:")) {
        // Find target node by id reference.
        const targetId = href.replace("#", "");
        const targetNode = nodes.find(
          (n) => n.metadata?.attributes?.id === targetId,
        );
        if (targetNode) {
          edges.push(this.#makeEdge(node.id, targetNode.id, "navigates_to", { url: href }));
          this.#emitEdge(node.id, targetNode.id, "navigates_to");
        }
      }

      // Triggers (labels for inputs).
      if (elFor) {
        const targetNode = nodes.find(
          (n) => n.metadata?.attributes?.id === elFor,
        );
        if (targetNode) {
          edges.push(this.#makeEdge(node.id, targetNode.id, "triggers", { event: "focus" }));
          this.#emitEdge(node.id, targetNode.id, "triggers");
        }
      }

      // Form submission.
      if (formAction) {
        edges.push(this.#makeEdge(node.id, `action_${formAction.slice(0, 30).replace(/[^a-zA-Z0-9]/g, "_")}`, "triggers", {
          event: "submit",
          url: formAction,
        }));
      }
    }
  }

  // ── Graph Validation ──────────────────────────────────────────

  #removeCyclicEdges(nodes: GraphNode[], edges: GraphEdge[]): void {
    const adjacency = new Map<string, string[]>();
    for (const node of nodes) {
      adjacency.set(node.id, []);
    }
    for (const edge of edges) {
      if (edge.type === "contains" && adjacency.has(edge.source)) {
        adjacency.get(edge.source)!.push(edge.target);
      }
    }

    // DFS cycle detection.
    const visited = new Set<string>();
    const inStack = new Set<string>();

    const dfs = (nodeId: string): boolean => {
      if (inStack.has(nodeId)) return true;
      if (visited.has(nodeId)) return false;
      visited.add(nodeId);
      inStack.add(nodeId);

      for (const neighbor of adjacency.get(nodeId) ?? []) {
        if (dfs(neighbor)) return true;
      }

      inStack.delete(nodeId);
      return false;
    };

    for (const node of nodes) {
      if (dfs(node.id)) {
        // Remove "contains" edges involved in cycles.
        for (let i = edges.length - 1; i >= 0; i--) {
          if (
            edges[i].type === "contains" &&
            inStack.has(edges[i].source) &&
            inStack.has(edges[i].target)
          ) {
            edges.splice(i, 1);
          }
        }
      }
    }
  }

  #removeOrphans(nodes: GraphNode[], edges: GraphEdge[]): void {
    const connected = new Set<string>();
    for (const edge of edges) {
      connected.add(edge.source);
      connected.add(edge.target);
    }

    // Remove low-priority orphans.
    for (let i = nodes.length - 1; i >= 0; i--) {
      if (!connected.has(nodes[i].id) && nodes[i].priority >= 4) {
        nodes.splice(i, 1);
      }
    }
  }

  // ── Helpers ─────────────────────────────────────────────────────

  #makeNode(el: ParsedElement): GraphNode {
    this.nodeCounter++;
    const nodeType = this.#inferNodeType(el);
    const label =
      (el.attributes?.["aria-label"] ??
      el.attributes?.title ??
      el.attributes?.placeholder ??
      el.text.slice(0, 60)) ||
      `${el.tagName}${el.id ? `#${el.id}` : ""}`;

    return {
      id: `n_${this.nodeCounter}`,
      type: nodeType,
      label: label.slice(0, 100),
      metadata: {
        tagName: el.tagName,
        selector: this.#buildSelector(el),
        visibility: el.visible ? "visible" : "hidden",
        interactive: el.interactive,
        textContent: el.text.slice(0, 200),
        attributes: el.attributes,
      },
      priority: Math.max(1, Math.min(5, Math.round(6 - this.#componentScore(el) / 3))),
    };
  }

  #makeEdge(
    source: string,
    target: string,
    type: GraphEdgeType,
    metadata?: Record<string, unknown>,
  ): GraphEdge {
    this.edgeCounter++;
    return {
      id: `e_${this.edgeCounter}`,
      source,
      target,
      type,
      metadata: metadata as GraphEdge["metadata"],
    };
  }

  #inferNodeType(el: ParsedElement): GraphNodeType {
    if (["html", "body", "div", "main", "section", "article", "header", "footer", "nav", "aside"].includes(el.tagName)) {
      return "screen";
    }
    if (el.interactive || ["a", "button", "input", "select", "textarea", "details", "summary"].includes(el.tagName)) {
      return "interaction";
    }
    if (["img", "video", "audio", "canvas", "svg", "picture"].includes(el.tagName)) {
      return "effect";
    }
    return "component";
  }

  #isInteractive(tag: string, attributes: Record<string, string>): boolean {
    const interactiveTags = ["a", "button", "input", "select", "textarea", "details", "summary"];
    if (interactiveTags.includes(tag)) return true;
    const role = attributes.role;
    if (role && ["button", "link", "checkbox", "radio", "tab", "menuitem", "switch"].includes(role)) {
      return true;
    }
    const tabindex = attributes.tabindex;
    if (tabindex !== undefined && tabindex !== "-1") return true;
    return false;
  }

  #buildSelector(el: ParsedElement): string {
    if (el.id) return `#${el.id}`;
    const parts = [el.tagName];
    if (el.classes.length > 0) {
      parts.push(el.classes.slice(0, 3).map((c) => `.${c}`).join(""));
    }
    return parts.join("");
  }

  #calculateQuality(nodes: GraphNode[], edges: GraphEdge[], totalElements: number): number {
    if (nodes.length === 0) return 0;
    const coverage = Math.min(nodes.length / Math.max(totalElements, 1), 1);
    const edgeRatio = edges.length / Math.max(nodes.length, 1);
    const edgeScore = Math.min(edgeRatio / 2, 1);
    return Math.round((coverage * 0.5 + edgeScore * 0.5) * 100) / 100;
  }

  #emitEdge(source: string, target: string, type: string): void {
    // SSE emission is handled by the orchestrator at the graph-build-complete level.
  }
}

interface ParsedElement {
  tagName: string;
  id: string;
  classes: string[];
  attributes: Record<string, string>;
  text: string;
  depth: number;
  interactive: boolean;
  visible: boolean;
  startOffset: number;
  endOffset: number;
  children: ParsedElement[];
}
