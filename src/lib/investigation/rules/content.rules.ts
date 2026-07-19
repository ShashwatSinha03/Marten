import { ruleRegistry } from "../rule-registry";
import type { Rule, InvestigationContext, RuleMatch } from "../types";

const PLACEHOLDER_PATTERNS = [
  /lorem\s+ipsum/i,
  /coming\s+soon/i,
  /placeholder/i,
  /sample\s+text/i,
  /insert\s+(text|content)/i,
  /todo/i,
  /tbd/i,
];

// ── empty-section ───────────────────────────────────────────────────

const emptySectionRule: Rule = {
  identifier: "content/empty-section",
  description: "Section or ARIA region with minimal or no text content",
  category: "content",
  defaultSeverity: "medium",
  documentation:
    "Detects content sections that appear to be empty or have very little text.",
  execute(ctx: InvestigationContext): RuleMatch[] {
    const dom = ctx.structuredDom;
    if (!dom) return [];

    const results: RuleMatch[] = [];
    const wordCount = dom.textContent.wordCount;
    const paragraphs = dom.textContent.paragraphs;

    if (wordCount < 10 && paragraphs < 2) {
      results.push({
        fingerprint: `content/empty-section:${wordCount}:${paragraphs}`,
        title: "Empty or minimal content section",
        description:
          "The page has very little text content. Sections or regions may be empty, providing no useful information to users.",
        severity: "medium",
        evidenceIds: [],
        graphNodeIds: [],
        graphEdgeIds: [],
        recommendationPlaceholder:
          "Ensure all content sections have meaningful text content. Remove or fill empty sections.",
      });
    }
    return results;
  },
};

// ── placeholder-text ────────────────────────────────────────────────

const placeholderTextRule: Rule = {
  identifier: "content/placeholder-text",
  description: "Text matching placeholder patterns like lorem ipsum",
  category: "content",
  defaultSeverity: "medium",
  documentation:
    "Detects placeholder or template text that should be replaced with real content.",
  execute(ctx: InvestigationContext): RuleMatch[] {
    const dom = ctx.structuredDom;
    if (!dom) return [];

    // Check heading texts for placeholder patterns
    const results: RuleMatch[] = [];
    const allTexts = [
      dom.title,
      ...dom.headings.map((h) => h.text),
      ...dom.buttons.map((b) => b.text),
    ];

    for (const text of allTexts) {
      for (const pattern of PLACEHOLDER_PATTERNS) {
        if (pattern.test(text)) {
          results.push({
            fingerprint: `content/placeholder-text:${text.slice(0, 60)}`,
            title: "Placeholder text detected",
            description: `Found placeholder text: "${text}". Placeholder content should be replaced with real copy before launch.`,
            severity: "medium",
            evidenceIds: [],
            graphNodeIds: [],
            graphEdgeIds: [],
            recommendationPlaceholder:
              "Replace placeholder text with final, meaningful content that accurately describes the product or feature.",
          });
          break;
        }
      }
    }
    return results;
  },
};

// ── duplicated-heading ──────────────────────────────────────────────

const duplicatedHeadingRule: Rule = {
  identifier: "content/duplicated-heading",
  description: "Same heading text appearing multiple times",
  category: "content",
  defaultSeverity: "low",
  documentation:
    "Detects duplicate heading text, which may indicate copy-paste errors or redundant sections.",
  execute(ctx: InvestigationContext): RuleMatch[] {
    const dom = ctx.structuredDom;
    if (!dom) return [];

    const headingTexts = dom.headings.map((h) => h.text.toLowerCase().trim()).filter(Boolean);
    const counts = new Map<string, number>();
    for (const text of headingTexts) {
      counts.set(text, (counts.get(text) ?? 0) + 1);
    }

    const results: RuleMatch[] = [];
    for (const [text, count] of counts) {
      if (count > 1) {
        results.push({
          fingerprint: `content/duplicated-heading:${text}`,
          title: "Duplicate heading text",
          description: `The heading "${text}" appears ${count} times. Duplicate headings can confuse users and may indicate redundant sections.`,
          severity: "low",
          evidenceIds: [],
          graphNodeIds: [],
          graphEdgeIds: [],
          recommendationPlaceholder:
            "Review duplicate headings and differentiate them or consolidate the sections.",
        });
      }
    }
    return results;
  },
};

// ── missing-title ───────────────────────────────────────────────────

const missingTitleRule: Rule = {
  identifier: "content/missing-title",
  description: "No title tag or empty title in the document",
  category: "content",
  defaultSeverity: "high",
  documentation:
    "Detects pages with missing or empty title elements.",
  execute(ctx: InvestigationContext): RuleMatch[] {
    const dom = ctx.structuredDom;
    if (!dom) return [];

    const results: RuleMatch[] = [];
    if (!dom.title || dom.title.trim().length === 0) {
      results.push({
        fingerprint: "content/missing-title",
        title: "Missing or empty page title",
        description:
          "The page has no <title> tag or the title is empty. The title is critical for SEO, browser tabs, and accessibility.",
        severity: "high",
        evidenceIds: [],
        graphNodeIds: [],
        graphEdgeIds: [],
        recommendationPlaceholder:
          "Add a descriptive <title> tag in the <head> section that summarizes the page content.",
      });
    }
    return results;
  },
};

// ── missing-description ─────────────────────────────────────────────

const missingDescriptionRule: Rule = {
  identifier: "content/missing-description",
  description: "No meta name=description tag",
  category: "content",
  defaultSeverity: "medium",
  documentation:
    "Detects pages without a meta description for SEO.",
  execute(ctx: InvestigationContext): RuleMatch[] {
    const dom = ctx.structuredDom;
    if (!dom) return [];

    const results: RuleMatch[] = [];
    if (!dom.metaDescription || dom.metaDescription.trim().length === 0) {
      results.push({
        fingerprint: "content/missing-description",
        title: "Missing meta description",
        description:
          "The page has no <meta name=\"description\"> tag. Meta descriptions are important for SEO and social sharing snippets.",
        severity: "medium",
        evidenceIds: [],
        graphNodeIds: [],
        graphEdgeIds: [],
        recommendationPlaceholder:
          'Add a <meta name="description" content="..."> tag with a concise summary of the page content (150-160 characters).',
      });
    }
    return results;
  },
};

// ── oversized-text ──────────────────────────────────────────────────

const oversizedTextRule: Rule = {
  identifier: "content/oversized-text",
  description: "Text block exceeding 500 words",
  category: "content",
  defaultSeverity: "info",
  documentation:
    "Detects very long text blocks that may overwhelm readers.",
  execute(ctx: InvestigationContext): RuleMatch[] {
    const dom = ctx.structuredDom;
    if (!dom) return [];

    const results: RuleMatch[] = [];
    if (dom.textContent.wordCount > 500) {
      results.push({
        fingerprint: `content/oversized-text:${dom.textContent.wordCount}`,
        title: "Oversized text block",
        description: `The page contains approximately ${dom.textContent.wordCount} words. Large blocks of text can overwhelm readers and reduce content scannability.`,
        severity: "info",
        evidenceIds: [],
        graphNodeIds: [],
        graphEdgeIds: [],
        recommendationPlaceholder:
          "Break long text into shorter paragraphs, use subheadings, and consider using visual elements like images or lists to improve scannability.",
      });
    }
    return results;
  },
};

// ── Register ────────────────────────────────────────────────────────

ruleRegistry.register(emptySectionRule);
ruleRegistry.register(placeholderTextRule);
ruleRegistry.register(duplicatedHeadingRule);
ruleRegistry.register(missingTitleRule);
ruleRegistry.register(missingDescriptionRule);
ruleRegistry.register(oversizedTextRule);

export {
  emptySectionRule,
  placeholderTextRule,
  duplicatedHeadingRule,
  missingTitleRule,
  missingDescriptionRule,
  oversizedTextRule,
};
