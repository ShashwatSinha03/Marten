import type { StructuredDom } from "@/lib/evidence/types";
import type { UiComponentKind, DetectionMethod } from "./types";

export interface ElementProfile {
  tagName: string;
  classes: string[];
  attributes: Record<string, string>;
  childCount: number;
  textLength: number;
  linksCount: number;
  buttonsCount: number;
  depth: number;
  headingsContext: Array<{ level: number; text: string }>;
}

/**
 * DomAnalyzer provides deterministic pattern matching utilities
 * for recognizing UI components from structured DOM data.
 * All methods are pure functions — no state, no side effects.
 */
export class DomAnalyzer {
  /**
   * Identify the UI component kind from an element's characteristics.
   */
  identifyComponentKind(profile: ElementProfile): {
    kind: UiComponentKind;
    detectedVia: DetectionMethod[];
  } {
    const { tagName, classes, attributes } = profile;
    const classStr = classes.join(" ").toLowerCase();

    // Priority 1: Semantic HTML5 tags (highest specificity)
    if (tagName === "nav") {
      return { kind: "navbar", detectedVia: ["semantic_tag"] };
    }
    if (tagName === "aside") {
      // Could be sidebar or complementary content — check class hint
      if (/sidebar/i.test(classStr)) {
        return { kind: "sidebar", detectedVia: ["semantic_tag", "class_pattern"] };
      }
      return { kind: "sidebar", detectedVia: ["semantic_tag"] };
    }
    if (tagName === "footer") {
      return { kind: "footer", detectedVia: ["semantic_tag"] };
    }
    if (tagName === "header" && !this.#isLikelyPageHeader(profile)) {
      return { kind: "header", detectedVia: ["semantic_tag"] };
    }
    if (tagName === "form") {
      return { kind: "form", detectedVia: ["semantic_tag"] };
    }
    if (tagName === "table") {
      return { kind: "table", detectedVia: ["semantic_tag"] };
    }
    if (tagName === "section") {
      // Could be hero, content section, or generic
      if (/hero/i.test(classStr)) {
        return { kind: "hero", detectedVia: ["semantic_tag", "class_pattern"] };
      }
      return { kind: "content_section", detectedVia: ["semantic_tag"] };
    }
    if (tagName === "article") {
      return { kind: "content_section", detectedVia: ["semantic_tag"] };
    }
    if (tagName === "main") {
      return { kind: "content_section", detectedVia: ["semantic_tag"] };
    }

    // Priority 2: ARIA roles
    const role = (attributes.role ?? "").toLowerCase();
    if (role === "navigation") {
      if (/breadcrumb/i.test(classStr) || attributes["aria-label"]?.toLowerCase().includes("breadcrumb")) {
        return { kind: "breadcrumb", detectedVia: ["aria_role", "class_pattern"] };
      }
      if (/pagination/i.test(classStr) || attributes["aria-label"]?.toLowerCase().includes("pagination")) {
        return { kind: "pagination", detectedVia: ["aria_role", "class_pattern"] };
      }
      if (/tab/i.test(classStr)) {
        return { kind: "tabs", detectedVia: ["aria_role", "class_pattern"] };
      }
      return { kind: "navbar", detectedVia: ["aria_role"] };
    }
    if (role === "banner") {
      return { kind: "banner", detectedVia: ["aria_role"] };
    }
    if (role === "complementary") {
      return { kind: "sidebar", detectedVia: ["aria_role"] };
    }
    if (role === "dialog" || role === "alertdialog" || attributes["aria-modal"] === "true") {
      return { kind: "dialog", detectedVia: ["aria_role"] };
    }
    if (role === "search" || attributes["aria-label"]?.toLowerCase().includes("search")) {
      return { kind: "search_bar", detectedVia: ["aria_role"] };
    }
    if (role === "tablist") {
      return { kind: "tabs", detectedVia: ["aria_role"] };
    }
    if (role === "region" && attributes["aria-roledescription"]?.toLowerCase() === "carousel") {
      return { kind: "carousel", detectedVia: ["aria_role"] };
    }

    // Priority 3: Class name patterns
    if (/nav(bar|igation|menu)/i.test(classStr)) {
      return { kind: "navbar", detectedVia: ["class_pattern"] };
    }
    if (/sidebar/i.test(classStr)) {
      return { kind: "sidebar", detectedVia: ["class_pattern"] };
    }
    if (/breadcrumb/i.test(classStr)) {
      return { kind: "breadcrumb", detectedVia: ["class_pattern"] };
    }
    if (/pagination/i.test(classStr)) {
      return { kind: "pagination", detectedVia: ["class_pattern"] };
    }
    if (/modal|dialog/i.test(classStr)) {
      return { kind: "dialog", detectedVia: ["class_pattern"] };
    }
    if (/search/i.test(classStr) && this.#isLikelySearchBar(profile)) {
      return { kind: "search_bar", detectedVia: ["class_pattern"] };
    }
    if (/hero/i.test(classStr)) {
      return { kind: "hero", detectedVia: ["class_pattern"] };
    }
    if (/card/i.test(classStr)) {
      return { kind: "card", detectedVia: ["class_pattern"] };
    }
    if (/pricing|plan|tier/i.test(classStr)) {
      return { kind: "pricing_card", detectedVia: ["class_pattern"] };
    }
    if (/tab/i.test(classStr) && profile.childCount >= 2) {
      return { kind: "tabs", detectedVia: ["class_pattern"] };
    }
    if (/accordion/i.test(classStr)) {
      return { kind: "accordion", detectedVia: ["class_pattern"] };
    }
    if (/stat|metric|counter/i.test(classStr)) {
      return { kind: "stats_grid", detectedVia: ["class_pattern"] };
    }
    if (/carousel|slider/i.test(classStr)) {
      return { kind: "carousel", detectedVia: ["class_pattern"] };
    }
    if (/footer/i.test(classStr)) {
      return { kind: "footer", detectedVia: ["class_pattern"] };
    }
    if (/header/i.test(classStr)) {
      return { kind: "header", detectedVia: ["class_pattern"] };
    }

    // Priority 4: Structural heuristics
    if (this.#isLikelyHero(profile)) {
      return { kind: "hero", detectedVia: ["structural_heuristic"] };
    }
    if (this.#isLikelyCard(profile)) {
      return { kind: "card", detectedVia: ["structural_heuristic"] };
    }

    return { kind: "unknown", detectedVia: [] };
  }

  // ── Private heuristics ──────────────────────────────────────────

  #isLikelyPageHeader(profile: ElementProfile): boolean {
    // A <header> directly in <body> with nav/brand content is a page header
    return profile.depth <= 2 && profile.linksCount > 0;
  }

  #isLikelySearchBar(profile: ElementProfile): boolean {
    // Has an input with type="search" or placeholder containing "search"
    return profile.buttonsCount > 0 || profile.textLength < 50;
  }

  #isLikelyHero(profile: ElementProfile): boolean {
    // Large section at top with h1 + CTA button
    const hasCTA = profile.buttonsCount >= 1;
    const hasHeading = profile.headingsContext.some(h => h.level <= 2);
    return hasCTA && hasHeading && profile.depth <= 2;
  }

  #isLikelyCard(profile: ElementProfile): boolean {
    // Container with img + heading + text + action, moderate depth
    const hasContent = profile.textLength > 20;
    const isContainer = ["div", "article", "li", "section"].includes(profile.tagName);
    return isContainer && hasContent && profile.childCount >= 2 && profile.depth >= 2;
  }
}
