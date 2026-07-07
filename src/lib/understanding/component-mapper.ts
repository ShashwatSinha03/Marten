import { DomAnalyzer } from "./dom-analyzer";
import type { StructuredDom } from "@/lib/evidence/types";
import type { UiComponent, UiComponentKind, DetectionMethod, ComponentMap } from "./types";

/**
 * ComponentMapper analyzes the structured DOM to identify reusable
 * UI components (navbar, sidebar, footer, hero, cards, forms, etc.)
 */
export class ComponentMapper {
  private analyzer = new DomAnalyzer();
  private componentCounter = 0;

  /**
   * Map structured DOM elements to identified UI components.
   * Returns a ComponentMap with components organized by kind and route.
   */
  mapComponents(
    structuredDom: StructuredDom,
    routePath: string,
  ): ComponentMap {
    this.componentCounter = 0;
    const components: UiComponent[] = [];

    // 1. Process each form as a component
    for (const form of structuredDom.forms) {
      components.push(this.#createComponent(
        "form",
        ["semantic_tag"],
        "form",
        `form[action="${form.action}"]`,
        `Form: ${form.action}`,
        form.inputs + form.submits,
        [],
        true,
        routePath,
      ));
    }

    // 2. Analyze buttons
    const buttonTexts = structuredDom.buttons.map(b => b.text.toLowerCase());
    const hasCTA = buttonTexts.some(t => /sign up|get started|subscribe|buy|learn more/i.test(t));

    // 3. Analyze link clusters for navigation elements
    const internalLinks = structuredDom.links.filter(l => l.isInternal);
    const navLinks = internalLinks.slice(0, 15); // cap at 15 for analysis

    if (navLinks.length >= 3) {
      // Check if links look like a navbar (short labels, at top of page)
      const allShort = navLinks.every(l => l.text.length < 30);
      if (allShort) {
        components.push(this.#createComponent(
          "navbar",
          ["structural_heuristic", "element_pattern"],
          "nav",
          "nav",
          "Main Navigation",
          navLinks.length,
          navLinks.map(l => l.text),
          true,
          routePath,
        ));
      }
    }

    // 4. Detect search bar (input with type="search" or search in placeholder)
    const searchInput = structuredDom.inputs.find(
      i => i.type === "search" || i.placeholder.toLowerCase().includes("search")
    );
    if (searchInput) {
      components.push(this.#createComponent(
        "search_bar",
        ["structural_heuristic"],
        "input",
        'input[type="search"]',
        "Search Bar",
        1,
        [searchInput.placeholder],
        true,
        routePath,
      ));
    }

    // 5. Analyze heading structure for content sections
    const h1Headings = structuredDom.headings.filter(h => h.level === 1);
    const h2Headings = structuredDom.headings.filter(h => h.level === 2);

    // Check for hero section: h1 + CTA button
    if (h1Headings.length > 0 && hasCTA) {
      components.push(this.#createComponent(
        "hero",
        ["structural_heuristic"],
        "section",
        "section.hero",
        `Hero: ${h1Headings[0].text.slice(0, 60)}`,
        structuredDom.buttons.length,
        h1Headings.map(h => h.text),
        true,
        routePath,
      ));
    }

    // 6. Content sections from h2 groupings
    for (const h2 of h2Headings.slice(0, 5)) {
      components.push(this.#createComponent(
        "content_section",
        ["structural_heuristic"],
        "section",
        "",
        h2.text.slice(0, 80),
        0,
        [],
        true,
        routePath,
      ));
    }

    // 7. Detect footer: last section or footer tag
    // (footer is inferred from structuredDom since we don't have raw HTML here)
    // We check if there are links that look like footer links (privacy, terms, etc.)
    const footerKeywords = ["privacy", "terms", "contact", "about", "copyright"];
    const footerLinks = internalLinks.filter(l =>
      footerKeywords.some(k => l.text.toLowerCase().includes(k))
    );
    if (footerLinks.length >= 2) {
      components.push(this.#createComponent(
        "footer",
        ["structural_heuristic"],
        "footer",
        "footer",
        "Footer",
        footerLinks.length,
        footerLinks.map(l => l.text),
        true,
        routePath,
      ));
    }

    // 8. Detect tables from the DOM snapshot metadata
    // Tables are detected at the structured level by checking forms+links patterns
    // (full table detection requires the raw DOM snapshot which the evidence pipeline provides)

    // 9. Detect pricing cards (multiple buttons with pricing-related labels)
    const pricingLabels = ["pricing", "plan", "/month", "/year", "free", "pro", "enterprise"];
    const pricingButtons = structuredDom.buttons.filter(b =>
      pricingLabels.some(pl => b.text.toLowerCase().includes(pl))
    );
    if (pricingButtons.length >= 2) {
      components.push(this.#createComponent(
        "pricing_card",
        ["structural_heuristic", "class_pattern"],
        "div",
        "",
        "Pricing Section",
        pricingButtons.length,
        pricingButtons.map(b => b.text),
        true,
        routePath,
      ));
    }

    // Build indexes
    const byKind = new Map<UiComponentKind, UiComponent[]>();
    const byRoute = new Map<string, UiComponent[]>();

    for (const comp of components) {
      // byKind
      const kindList = byKind.get(comp.kind) ?? [];
      kindList.push(comp);
      byKind.set(comp.kind, kindList);

      // byRoute
      const routeList = byRoute.get(comp.routePath) ?? [];
      routeList.push(comp);
      byRoute.set(comp.routePath, routeList);
    }

    return { components, byKind, byRoute };
  }

  #createComponent(
    kind: UiComponentKind,
    detectedVia: DetectionMethod[],
    tagName: string,
    selector: string,
    textPreview: string,
    childCount: number,
    classNames: string[],
    visible: boolean,
    routePath: string,
  ): UiComponent {
    this.componentCounter++;
    return {
      id: `comp_${this.componentCounter}`,
      kind,
      detectedVia,
      tagName,
      selector,
      textPreview: textPreview.slice(0, 200),
      childCount,
      classes: [...new Set(classNames)].sort(),
      visible,
      parentId: null,
      childIds: [],
      routePath,
      boundingBox: null,
    };
  }
}
