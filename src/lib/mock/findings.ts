import type { Finding } from "@/types";

// ─── Domain finding templates ────────────────────────────────────

interface FindingTemplate {
  title: string;
  description: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  category: "console_error" | "accessibility" | "dom_structure" | "network" | "visual" | "behavioral" | "functional";
  confidence: number;
  recommendation: string;
}

const ECOMMERCE_FINDINGS: FindingTemplate[] = [
  {
    title: "Navigation structure may introduce unnecessary friction",
    description: "The primary navigation contains 8+ top-level items, which exceeds the recommended 5-7 items for optimal information processing. Users may experience decision fatigue when browsing categories.",
    severity: "medium",
    category: "behavioral",
    confidence: 0.82,
    recommendation: "Consider consolidating navigation categories into a maximum of 5-7 primary items with dropdown or mega-menu patterns for subcategories.",
  },
  {
    title: "Primary CTA competes with secondary actions",
    description: "The primary 'Add to Cart' button uses identical styling to secondary action buttons in the same viewport, reducing visual hierarchy and potentially decreasing conversion rates.",
    severity: "high",
    category: "visual",
    confidence: 0.88,
    recommendation: "Apply distinct visual weight to the primary CTA — use a filled, high-contrast style while secondary actions use outlined or text-only treatments.",
  },
  {
    title: "Product grid may lack sufficient contrast on mobile",
    description: "Product cards in the grid layout use subtle border differentiation that may be difficult to distinguish on smaller viewports or in bright ambient lighting conditions.",
    severity: "low",
    category: "visual",
    confidence: 0.71,
    recommendation: "Increase card separation with consistent shadow depth or background alternation, and test against WCAG contrast guidelines for border differentiation.",
  },
  {
    title: "Checkout flow requires unnecessary steps",
    description: "The checkout process spans 4 distinct pages before order confirmation, potentially increasing cart abandonment. Industry benchmarks suggest 2-3 steps is optimal.",
    severity: "high",
    category: "functional",
    confidence: 0.85,
    recommendation: "Consolidate checkout into a single-page or two-step flow with inline validation and a clear progress indicator.",
  },
  {
    title: "Search results lack filtering options",
    description: "Product search results do not provide facet filtering (price range, category, rating), requiring users to manually browse through results to find relevant items.",
    severity: "medium",
    category: "behavioral",
    confidence: 0.79,
    recommendation: "Implement faceted search with collapsible filter panels for price, category, brand, rating, and other relevant product attributes.",
  },
  {
    title: "Accessibility: Interactive elements missing focus indicators",
    description: "Several interactive elements (product cards, quick-add buttons) lack visible focus indicators, making keyboard navigation difficult for users who rely on assistive technology.",
    severity: "medium",
    category: "accessibility",
    confidence: 0.84,
    recommendation: "Ensure all interactive elements have visible :focus-visible styles with 3:1 minimum contrast ratio against the background.",
  },
  {
    title: "Page load performance may impact user experience",
    description: "The page loads approximately 2.4MB of uncompressed assets including multiple unoptimized hero images, which may result in slow load times on slower connections.",
    severity: "medium",
    category: "network",
    confidence: 0.76,
    recommendation: "Implement responsive images with WebP/AVIF formats, lazy-load below-fold content, and consider a CDN with image optimization pipeline.",
  },
  {
    title: "Form validation may reduce completion rates",
    description: "Email and password fields validate only on form submission rather than providing real-time inline feedback, potentially frustrating users before they complete the form.",
    severity: "low",
    category: "functional",
    confidence: 0.73,
    recommendation: "Implement real-time inline validation with clear error messages and success indicators as users type or move between fields.",
  },
];

const SAAS_FINDINGS: FindingTemplate[] = [
  {
    title: "Authentication flow requires review",
    description: "The sign-in flow presents 5 different authentication options simultaneously, which may cause decision paralysis. Users spent an average of 8 seconds evaluating options before selecting one.",
    severity: "high",
    category: "behavioral",
    confidence: 0.87,
    recommendation: "Prioritize the primary authentication method and surface alternative options in a secondary 'More options' section or under an expandable panel.",
  },
  {
    title: "Onboarding friction may impact activation",
    description: "New users are presented with a feature-rich dashboard immediately after sign-up without a guided onboarding flow, which may lead to confusion and early drop-off.",
    severity: "high",
    category: "functional",
    confidence: 0.86,
    recommendation: "Implement a progressive onboarding experience that introduces core features one at a time, with clear next-action prompts and a visible progress tracker.",
  },
  {
    title: "Dashboard information density may overwhelm users",
    description: "The main dashboard displays 12 data widgets simultaneously without prioritization, making it difficult for users to identify the most important metrics at a glance.",
    severity: "medium",
    category: "visual",
    confidence: 0.81,
    recommendation: "Apply progressive disclosure — show only 4-5 primary metrics by default with customizable widget selection and collapsible sections for detailed analytics.",
  },
  {
    title: "Empty states lack guidance for next steps",
    description: "Several sections display empty states without helpful guidance on how to populate them, requiring users to explore menus to understand available actions.",
    severity: "low",
    category: "behavioral",
    confidence: 0.75,
    recommendation: "Design meaningful empty states with clear call-to-action buttons, helpful illustrations, and brief contextual guidance for each section.",
  },
  {
    title: "Accessibility: Color-dependent information",
    description: "Status indicators rely solely on color (green/red/amber) without accompanying text labels or icons, making the interface inaccessible to colorblind users.",
    severity: "medium",
    category: "accessibility",
    confidence: 0.83,
    recommendation: "Add text labels, icons, or pattern-based indicators alongside color coding to ensure status information is accessible to all users.",
  },
  {
    title: "Responsive layout breaks at common breakpoints",
    description: "The sidebar navigation overlaps with main content at 1024px viewport width, and table components lack horizontal scrolling support on tablet-sized screens.",
    severity: "medium",
    category: "visual",
    confidence: 0.78,
    recommendation: "Test and fix responsive behavior at 1024px and 768px breakpoints. Implement collapsible sidebar patterns and horizontally scrollable data tables.",
  },
  {
    title: "API response times show inconsistent performance",
    description: "Several API endpoints exhibit high latency variability (200ms to 2.5s), suggesting potential caching or database query optimization opportunities.",
    severity: "low",
    category: "network",
    confidence: 0.69,
    recommendation: "Audit slow endpoints for N+1 query patterns, implement response caching where appropriate, and consider database query optimization.",
  },
  {
    title: "Notification system may cause alert fatigue",
    description: "The application sends notifications for every minor status change without user-configurable preferences, which may lead to users ignoring or disabling all notifications.",
    severity: "low",
    category: "behavioral",
    confidence: 0.72,
    recommendation: "Implement granular notification preferences grouped by importance level, with a daily digest option for lower-priority updates.",
  },
];

const MARKETING_FINDINGS: FindingTemplate[] = [
  {
    title: "Hero section lacks clear value proposition",
    description: "The hero section uses multiple rotating headlines that cycle every 4 seconds, which may cause users to miss the primary message and increases cognitive load.",
    severity: "high",
    category: "behavioral",
    confidence: 0.84,
    recommendation: "Use a single, strong value proposition headline with supporting subtext. Reserve carousel patterns for social proof or feature highlights below the fold.",
  },
  {
    title: "CTA button visibility may impact conversion",
    description: "The primary call-to-action button uses a color that has insufficient contrast against the hero background image, potentially reducing conversion rates.",
    severity: "high",
    category: "visual",
    confidence: 0.86,
    recommendation: "Ensure CTA buttons maintain minimum 4.5:1 contrast ratio against all background variations. Add a semi-transparent overlay behind text elements on image backgrounds.",
  },
  {
    title: "Mobile navigation requires two taps to access content",
    description: "The hamburger menu requires an additional tap to expand sub-navigation items, adding unnecessary friction for users on mobile devices who need to explore the site.",
    severity: "medium",
    category: "functional",
    confidence: 0.77,
    recommendation: "Consider a disclosure widget pattern that shows first-level navigation items directly and expands sub-items on tap, reducing the interaction cost.",
  },
  {
    title: "Page weight may affect Core Web Vitals",
    description: "The landing page loads approximately 3.1MB of resources including unoptimized images, custom fonts, and multiple third-party scripts, potentially impacting Largest Contentful Paint scores.",
    severity: "medium",
    category: "network",
    confidence: 0.74,
    recommendation: "Audit third-party script impact, implement font-display: swap, optimize images with srcset, and consider code splitting for below-fold components.",
  },
  {
    title: "Social proof placement may miss engaged users",
    description: "Customer testimonials and trust signals appear only at the bottom of the page, where they may be missed by users who don't scroll beyond the initial viewport.",
    severity: "low",
    category: "behavioral",
    confidence: 0.7,
    recommendation: "Consider placing key social proof elements (testimonials, trust badges, usage statistics) at strategic decision points throughout the page, not just at the footer.",
  },
  {
    title: "Accessibility: Skip navigation link is not visible",
    description: "The page does not provide a visible skip-to-content link for keyboard users, requiring screen reader and keyboard-only users to tab through all navigation items before reaching main content.",
    severity: "medium",
    category: "accessibility",
    confidence: 0.82,
    recommendation: "Add a skip-to-content link as the first focusable element, styled to become visible on focus for keyboard users.",
  },
  {
    title: "Pricing table comparison lacks key differentiators",
    description: "The pricing table uses checkmark icons without explaining what each feature actually does, making it difficult for users to evaluate which plan meets their needs.",
    severity: "low",
    category: "functional",
    confidence: 0.73,
    recommendation: "Add brief feature descriptions on hover or expand, use tiered highlighting to guide users to the recommended plan, and include a comparison toggle for detailed view.",
  },
  {
    title: "Animation performance may cause jank on lower-end devices",
    description: "The page uses multiple parallax effects and animated transitions that may cause frame drops and jank on devices with integrated graphics or lower refresh rates.",
    severity: "low",
    category: "visual",
    confidence: 0.68,
    recommendation: "Prefer CSS transforms and opacity for animations (GPU-accelerated), respect prefers-reduced-motion, and test on mid-range devices to ensure smooth 60fps performance.",
  },
];

const GENERIC_FINDINGS: FindingTemplate[] = [
  {
    title: "Console errors detected during page load",
    description: "Multiple JavaScript console errors were captured during page initialization, including unhandled promise rejections and reference errors in third-party scripts.",
    severity: "high",
    category: "console_error",
    confidence: 0.91,
    recommendation: "Review and fix console errors. Wrap third-party integrations in error boundaries and implement global error handling for unhandled rejections.",
  },
  {
    title: "DOM complexity may affect rendering performance",
    description: "The page contains over 1500 DOM nodes with a maximum depth of 18 levels, which may impact rendering performance and memory usage, particularly on mobile devices.",
    severity: "medium",
    category: "dom_structure",
    confidence: 0.78,
    recommendation: "Audit DOM depth and node count. Consider virtualization for long lists, simplify deeply nested layouts, and remove unused wrapper elements.",
  },
  {
    title: "Network waterfall shows render-blocking resources",
    description: "Critical rendering path is blocked by 3 render-blocking CSS and JavaScript resources that delay the first meaningful paint by approximately 1.2 seconds.",
    severity: "medium",
    category: "network",
    confidence: 0.83,
    recommendation: "Inline critical CSS, defer non-critical JavaScript with async/defer attributes, and consider using preload/preconnect for above-fold resources.",
  },
  {
    title: "Missing ARIA landmarks for screen reader navigation",
    description: "The page lacks proper ARIA landmark regions (banner, navigation, main, contentinfo), making it difficult for screen reader users to navigate between page sections efficiently.",
    severity: "medium",
    category: "accessibility",
    confidence: 0.85,
    recommendation: "Add semantic HTML5 elements or ARIA landmark roles to define page regions and provide screen reader users with efficient navigation shortcuts.",
  },
  {
    title: "Interactive feedback could be more responsive",
    description: "Several interactive elements show no visual feedback on hover or press states, reducing the perceived responsiveness of the interface.",
    severity: "low",
    category: "behavioral",
    confidence: 0.74,
    recommendation: "Implement hover, active, and transition states for all interactive elements using CSS transitions (150-200ms) for smooth, responsive-feeling interactions.",
  },
  {
    title: "Image assets lack explicit dimensions",
    description: "Multiple images are loaded without explicit width and height attributes, which can cause cumulative layout shift as images load and push content down the page.",
    severity: "low",
    category: "visual",
    confidence: 0.76,
    recommendation: "Add explicit width and height attributes to all image elements, or use CSS aspect-ratio boxes to reserve space during image loading.",
  },
  {
    title: "Heading hierarchy is inconsistent",
    description: "The page uses heading levels in a non-sequential order (h1 → h3 → h2), which creates confusion for screen reader users who rely on heading structure for navigation.",
    severity: "low",
    category: "accessibility",
    confidence: 0.8,
    recommendation: "Ensure heading levels follow a logical, sequential hierarchy (h1 → h2 → h3) without skipping levels, and use a single h1 per page.",
  },
  {
    title: "Resource hints could improve perceived performance",
    description: "The page does not use preconnect or dns-prefetch hints for critical third-party origins, potentially adding DNS resolution and connection setup latency.",
    severity: "info",
    category: "network",
    confidence: 0.65,
    recommendation: "Add preconnect hints for critical third-party origins and dns-prefetch for analytics/tracking domains to reduce connection setup time.",
  },
];

// ─── Domain matching ─────────────────────────────────────────────

function classifyUrl(url: string): "ecommerce" | "saas" | "marketing" | "generic" {
  const u = url.toLowerCase();

  if (/shop|store|product|checkout|cart|buy|purchase|order|amazon|etsy|shopify/i.test(u)) {
    return "ecommerce";
  }

  if (/app|login|signin|signup|register|auth|dashboard|workspace|notion|slack|figma|linear|vercel/i.test(u)) {
    return "saas";
  }

  if (/landing|blog|pricing|about|features|marketing|startup|agency/i.test(u)) {
    return "marketing";
  }

  return "generic";
}

function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// ─── Generator ───────────────────────────────────────────────────

export function generateMockFindings(
  url: string,
  count: number,
  investigationId?: string,
): Finding[] {
  const domain = classifyUrl(url);

  let templates: FindingTemplate[];
  switch (domain) {
    case "ecommerce":
      templates = ECOMMERCE_FINDINGS;
      break;
    case "saas":
      templates = SAAS_FINDINGS;
      break;
    case "marketing":
      templates = MARKETING_FINDINGS;
      break;
    default:
      templates = GENERIC_FINDINGS;
  }

  // Use enough templates, mixing in some generic ones for realism
  const pool = shuffleArray([...templates, ...GENERIC_FINDINGS]);
  const selected = pool.slice(0, Math.min(count, pool.length));

  const now = new Date().toISOString();

  return selected.map((t, i) => ({
    id: crypto.randomUUID(),
    investigationId: investigationId ?? "mock",
    title: t.title,
    description: t.description,
    severity: t.severity,
    category: t.category,
    confidence: t.confidence,
    source: "heuristic" as const,
    evidenceRefs: [
      { type: "screenshot", id: `ev-${i + 1}` },
      { type: "console_log", id: "ev-4" },
    ],
    isLowConfidence: t.confidence < 0.7,
    fingerprint: `${t.title.toLowerCase().replace(/[^a-z0-9]/g, "")}|${t.category}`,
    recommendation: t.recommendation,
    createdAt: now,
  }));
}
