import type { Page } from "playwright";
import type { StructuredDom } from "./types";

/**
 * Extract structured DOM information from a Playwright Page.
 *
 * This provides a machine-readable summary of the page's content,
 * structure, and performance metrics — separate from the raw HTML snapshot.
 */
export async function extractStructuredDom(page: Page, url: string): Promise<StructuredDom> {
  const result = await page.evaluate(() => {
    const d = document;

    // Headings
    const headings = Array.from(d.querySelectorAll("h1, h2, h3, h4, h5, h6")).map((el) => ({
      level: parseInt(el.tagName[1], 10),
      text: (el as HTMLElement).innerText?.trim?.() ?? "",
      id: el.id || undefined,
    }));

    // Links
    const links = Array.from(d.querySelectorAll("a[href]")).map((el) => {
      const anchor = el as HTMLAnchorElement;
      const href = anchor.href;
      return {
        href,
        text: anchor.innerText?.trim?.() ?? "",
        isInternal: href.startsWith(window.location.origin),
        isExternal: !href.startsWith(window.location.origin) && href.startsWith("http"),
      };
    });

    // Buttons
    const buttons = Array.from(
      d.querySelectorAll("button, [role='button'], input[type='submit'], input[type='button']"),
    ).map((el) => {
      const htmlEl = el as HTMLElement;
      const input = el as HTMLInputElement;
      return {
        text: htmlEl.innerText?.trim?.() || input.value || "",
        type: el.tagName === "INPUT" ? input.type : htmlEl.getAttribute("type") ?? undefined,
        selector: el.id
          ? `#${el.id}`
          : el.className
            ? `.${(el as HTMLElement).className.split(" ").join(".")}`
            : undefined,
      };
    });

    // Forms
    const forms = Array.from(d.querySelectorAll("form")).map((el) => {
      const form = el as HTMLFormElement;
      return {
        action: form.action || "/",
        method: (form.method || "get").toLowerCase(),
        inputs: form.querySelectorAll("input, select, textarea").length,
        submits: form.querySelectorAll("input[type='submit'], button[type='submit']").length,
      };
    });

    // Inputs
    const inputs = Array.from(
      d.querySelectorAll(
        "input:not([type='hidden']):not([type='submit']):not([type='button']), textarea, select",
      ),
    ).map((el) => {
      const input = el as HTMLInputElement;
      return {
        type: input.type || el.tagName.toLowerCase(),
        name: input.name || "",
        placeholder: input.placeholder || "",
        required: input.required || false,
      };
    });

    // Images
    const images = Array.from(d.querySelectorAll("img[src]")).map((el) => {
      const img = el as HTMLImageElement;
      return {
        src: img.currentSrc || img.src,
        alt: img.alt || "",
        width: img.naturalWidth || undefined,
        height: img.naturalHeight || undefined,
      };
    });

    // Scripts
    const scripts = Array.from(d.querySelectorAll("script")).map((el) => {
      const script = el as HTMLScriptElement;
      return {
        src: script.src || null,
        isInline: !script.src,
      };
    });

    // Stylesheets
    const stylesheets = Array.from(d.querySelectorAll("link[rel='stylesheet']")).map((el) => ({
      href: (el as HTMLLinkElement).href,
    }));

    // Text content stats
    const bodyText = d.body?.innerText ?? "";
    const words = bodyText.trim() ? bodyText.trim().split(/\s+/).length : 0;
    const paragraphs = d.querySelectorAll("p").length;

    // Performance timing
    const perf = performance.timing || ({} as PerformanceTiming);
    const navStart = perf.navigationStart ?? 0;

    return {
      headings,
      links,
      buttons,
      forms,
      inputs,
      images,
      scripts,
      stylesheets,
      textContent: {
        totalCharacters: bodyText.length,
        wordCount: words,
        paragraphs,
      },
      performance: {
        domContentLoadedMs: navStart ? perf.domContentLoadedEventEnd - navStart : 0,
        loadEventMs: navStart ? perf.loadEventEnd - navStart : 0,
        domNodes: d.querySelectorAll("*").length,
      },
    };
  });

  // Meta tags (separate evaluate to keep each scope simple)
  const metaResult = await page.evaluate(() => {
    const d = document;
    return {
      metaDescription:
        d.querySelector<HTMLMetaElement>("meta[name='description']")?.content ?? "",
      metaKeywords:
        (d.querySelector<HTMLMetaElement>("meta[name='keywords']")?.content ?? "")
          .split(",")
          .map((k) => k.trim())
          .filter(Boolean),
      canonicalUrl: d.querySelector<HTMLLinkElement>("link[rel='canonical']")?.href ?? null,
    };
  });

  return {
    title: await page.title(),
    url,
    ...metaResult,
    ...result,
  };
}
