import type { EvidenceItem } from "@/types";

export function getDomHtml(item: EvidenceItem): string {
  return (item.metadata as { html?: string })?.html ?? "";
}
