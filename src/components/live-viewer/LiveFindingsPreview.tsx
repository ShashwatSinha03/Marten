"use client";

import React from "react";
import { cn } from "@/lib/utils";
import type { Finding, FindingSeverity } from "@/types";
import { SeverityBadge, LoadingDots } from "@/components/shared";
import { Search, ArrowRight } from "lucide-react";

interface LiveFindingsPreviewProps {
  findings: Finding[];
  className?: string;
}

const severityOrder: FindingSeverity[] = [
  "critical",
  "high",
  "medium",
  "low",
  "info",
];

export function LiveFindingsPreview({
  findings,
  className,
}: LiveFindingsPreviewProps) {
  const grouped = severityOrder.reduce(
    (acc, severity) => {
      const items = findings.filter((f) => f.severity === severity);
      if (items.length > 0) {
        acc[severity] = items;
      }
      return acc;
    },
    {} as Record<FindingSeverity, Finding[]>
  );

  return (
    <div className={cn("flex flex-col h-full", className)}>
      <div className="px-4 py-3 border-b border-border-subtle">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">
          Findings Preview
        </h3>
        {findings.length > 0 && (
          <span className="text-xs text-text-secondary mt-0.5 block">
            {findings.length} finding{findings.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5">
        {Object.entries(grouped).map(([severity, items]) => (
          <div key={severity}>
            <div className="flex items-center gap-1.5 mb-1.5 px-1">
              <SeverityBadge severity={severity as FindingSeverity} size="sm" />
              <span className="text-[11px] text-text-tertiary font-mono ml-auto">
                {items.length}
              </span>
            </div>
            {items.map((finding, i) => (
              <div
                key={finding.id}
                className="flex items-start gap-2 px-2 py-1.5 rounded-lg hover:bg-surface-elevated transition-colors cursor-pointer group"
              >
                <ArrowRight className="h-3 w-3 text-text-tertiary mt-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-text-primary truncate">
                    {finding.title}
                  </p>
                  <p className="text-[11px] text-text-tertiary truncate mt-0.5">
                    {finding.category.replace("_", " ")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ))}

        {findings.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Search className="h-6 w-6 text-text-tertiary mb-2" />
            <p className="text-xs text-text-tertiary">
              Findings will appear here as they are discovered
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
