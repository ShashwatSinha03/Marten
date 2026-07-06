/**
 * Console log redaction — strips secrets and sensitive tokens from text
 * before storing or displaying.
 *
 * Patterns covered:
 * - API keys (generic `sk-*`, `pk-*`, `test-*`)
 * - JWT / Bearer tokens
 * - Passwords and connection strings
 * - AWS access keys (`AKIA*`)
 * - GitHub tokens (`ghp_*`, `gho_*`, `ghu_*`, `ghs_*`, `ghr_*`)
 * - Slack tokens (`xox[baprs]-*`)
 * - Stripe keys (`sk_live_*`, `pk_live_*`, `sk_test_*`, `rk_live_*`, `whsec_*`)
 * - Generic `Bearer` + base64 / hex tokens
 * - Auth headers and cookies containing token-like values
 */

export interface RedactionResult {
  redacted: string;
  count: number;
  patterns: string[];
}

// Each pattern returns the pattern name for auditing.
interface PatternDef {
  name: string;
  regex: RegExp;
}

const PATTERNS: PatternDef[] = [
  // API keys: sk- / pk- / test- prefixed (OpenAI-style, generic)
  { name: "api_key_sk", regex: /\b(sk|pk|test)-[a-zA-Z0-9]{20,}\b/g },

  // AWS Access Key
  { name: "aws_access_key", regex: /\bAKIA[0-9A-Z]{16}\b/g },

  // AWS Secret Key (case-insensitive)
  { name: "aws_secret_key", regex: new RegExp("aws\\s*(secret|access)\\s*key[^a-z0-9]+[a-z0-9\\/+=]{40}\\b", "gi") },

  // GitHub tokens
  { name: "github_token", regex: /\bgh[opsu]_[a-zA-Z0-9]{36,}\b/g },

  // GitHub fine-grained PAT
  { name: "github_pat", regex: /\bgithub_pat_[a-zA-Z0-9]{82,}\b/g },

  // Slack tokens
  { name: "slack_token", regex: /\bxox[baprs]-[a-zA-Z0-9]{10,}\b/g },

  // Stripe live keys
  { name: "stripe_live", regex: /\b(?:sk|pk|rk|whsec)_live_[a-zA-Z0-9]{20,}\b/g },

  // Stripe test keys
  { name: "stripe_test", regex: /\b(?:sk|pk|rk|whsec)_test_[a-zA-Z0-9]{20,}\b/g },

  // JWT (base64url-encoded, three dot-separated segments)
  { name: "jwt", regex: /eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/g },

  // Bearer tokens (case-insensitive)
  { name: "bearer_token", regex: new RegExp("bearer\\s+[a-zA-Z0-9_\\-]{20,}", "gi") },

  // Password in connection strings / URLs
  { name: "password_in_url", regex: /(?<=:\/\/)[^:/\s@]+:[^@\s]+@/g },

  // Generic password assignment (case-insensitive)
  { name: "password_assignment", regex: new RegExp("(password|passwd|pwd)\\s*[=:]\\s*['\"][^'\"]{4,}['\"]", "gi") },

  // Connection strings (case-insensitive)
  { name: "connection_string", regex: new RegExp("(?:mongodb|postgresql|mysql|redis|rediss):\\/\\/[^\\s]+", "gi") },

  // Auth header values (case-insensitive)
  { name: "auth_header", regex: new RegExp("(authorization|cookie|set-cookie):\\s*[a-zA-Z0-9_\\-%=/+.,]{20,}", "gi") },
];

const REDACTED_PLACEHOLDER = "[REDACTED]";

/**
 * Redact sensitive information from a text string.
 *
 * Scans the input against all known secret patterns and replaces matches
 * with `[REDACTED]`. Returns the redacted text along with audit metadata.
 *
 * @param text - The raw text to scan.
 * @returns An object containing the redacted text, match count, and matched pattern names.
 */
export function redactSecrets(text: string): RedactionResult {
  let redacted = text;
  let count = 0;
  const matchedPatterns = new Set<string>();

  for (const { name, regex } of PATTERNS) {
    const matches = redacted.match(regex);
    if (matches) {
      count += matches.length;
      matchedPatterns.add(name);
      redacted = redacted.replace(regex, REDACTED_PLACEHOLDER);
    }
  }

  return {
    redacted,
    count,
    patterns: [...matchedPatterns],
  };
}
