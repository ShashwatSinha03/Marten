import { validateUrl, normalizeUrl, checkReachability } from "@/lib/validators/url";
import type { PipelineError } from "./types";

export interface UrlValidationResult {
  normalizedUrl: string;
  reachable: boolean;
  statusCode?: number;
  finalUrl?: string;
  error?: PipelineError;
}

/**
 * Validate a URL for investigation.
 * Returns either a valid normalized URL or an error with code/message.
 */
export async function validateInvestigationUrl(raw: string): Promise<UrlValidationResult> {
  try {
    // Normalize first
    const normalized = normalizeUrl(raw);

    // Validate (SSRF checks, protocol, etc.)
    const validated = await validateUrl(normalized);

    // Check reachability via HEAD
    const reachable = await checkReachability(validated);

    if (!reachable.reachable) {
      return {
        normalizedUrl: validated,
        reachable: false,
        error: {
          code: "URL_UNREACHABLE",
          message: "The URL could not be reached. Please check that the site is accessible.",
          recoverable: false,
        },
      };
    }

    return {
      normalizedUrl: reachable.finalUrl ?? validated,
      reachable: true,
      statusCode: reachable.statusCode,
      finalUrl: reachable.finalUrl,
    };
  } catch (err) {
    const known = err as { code?: string; message?: string };
    return {
      normalizedUrl: raw,
      reachable: false,
      error: {
        code: known.code ?? "URL_VALIDATION_FAILED",
        message: known.message ?? "URL validation failed",
        recoverable: false,
      },
    };
  }
}
