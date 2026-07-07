// ── Route Discovery ──────────────────────────────────────────────

export interface DiscoveredRoute {
  /** Normalized URL (pathname only, no query/hash) */
  path: string;
  /** Full URL */
  url: string;
  /** Page title from document */
  title: string;
  /** Depth from root (0 = starting page) */
  depth: number;
  /** Is this an entry point into the application? */
  isEntryPoint: boolean;
  /** Is this an exit point (no outgoing internal links)? */
  isExitPoint: boolean;
  /** URLs that link to this route */
  incomingLinks: string[];
  /** URLs that this route links to */
  outgoingLinks: string[];
  /** How many times was this route visited during investigation */
  visitCount: number;
  /** Total navigation time in ms */
  totalTimingMs: number;
  /** HTTP status code */
  statusCode: number;
  /** Internal route paths discovered among outgoing links */
  internalRouteTargets: string[];
}

export interface RouteGraph {
  /** Keyed by normalized path */
  routes: Map<string, DiscoveredRoute>;
  /** Root path */
  rootPath: string;
  /** Total unique routes discovered */
  routeCount: number;
}

// ── Component Mapping ────────────────────────────────────────────

export type UiComponentKind =
  | "navbar" | "sidebar" | "footer" | "header" | "hero"
  | "card" | "table" | "form" | "dialog" | "modal"
  | "section" | "navigation_link_group" | "content_section"
  | "banner" | "carousel" | "tabs" | "accordion"
  | "list_group" | "stats_grid" | "pricing_card"
  | "search_bar" | "breadcrumb" | "pagination"
  | "unknown";

export type DetectionMethod =
  | "semantic_tag" | "aria_role" | "class_pattern"
  | "structural_heuristic" | "element_pattern" | "content_analysis";

export interface UiComponent {
  id: string;
  kind: UiComponentKind;
  detectedVia: DetectionMethod[];
  tagName: string;
  selector: string;
  textPreview: string;
  childCount: number;
  classes: string[];
  visible: boolean;
  parentId: string | null;
  childIds: string[];
  routePath: string;
  boundingBox: { x: number; y: number; w: number; h: number } | null;
}

export interface ComponentMap {
  components: UiComponent[];
  byKind: Map<UiComponentKind, UiComponent[]>;
  byRoute: Map<string, UiComponent[]>;
}

// ── Navigation Graph ─────────────────────────────────────────────

export interface NavigationNode {
  routePath: string;
  title: string;
  visitCount: number;
  entryOrder: number;
  isEntryPoint: boolean;
  isExitPoint: boolean;
  averageLoadTimeMs: number;
  statusCodes: number[];
}

export interface NavigationEdge {
  sourcePath: string;
  targetPath: string;
  frequency: number;
  sequenceOrder: number;
  linkText: string | null;
  meanTransitionMs: number;
}

export interface NavigationGraphData {
  nodes: NavigationNode[];
  edges: NavigationEdge[];
  navigationSequence: string[];
  rootPath: string;
}

// ── Flow Detection ───────────────────────────────────────────────

export interface AppFlow {
  id: string;
  name: string;
  paths: string[];
  entryPoint: string;
  exitPoint: string;
  isComplete: boolean;
  isLinear: boolean;
  branchingPaths: string[][];
  depth: number;
  totalDurationMs: number;
}

export interface FlowGraphData {
  flows: AppFlow[];
  mainFlow: AppFlow | null;
}

// ── Layout Data (for visualization) ──────────────────────────────

export type LayoutStrategy = "hierarchical" | "force-directed" | "layered";

export interface NodeLayout {
  nodeId: string;
  x: number;
  y: number;
  layer: number;
  group: string | null;
  subLayer: number;
}

// ── Engine result ────────────────────────────────────────────────

export interface UnderstandingResult {
  routeGraph: RouteGraph;
  componentMap: ComponentMap;
  navigationGraph: NavigationGraphData;
  flows: FlowGraphData;
}
