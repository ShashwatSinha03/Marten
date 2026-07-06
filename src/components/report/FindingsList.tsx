"use client";

import React, { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import type { Finding, FindingSeverity, FindingCategory } from "@/types";
import { FindingCard } from "@/components/live-viewer/FindingCard";
import { SeverityBadge } from "@/components/shared";
import { Filter, X } from "lucide-react";

interface FindingsListProps {
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

const categories: FindingCategory[] = [
  "console_error",
  "accessibility",
  "dom_structure",
  "network",
  "visual",
  "behavioral",
  "functional",
];

export function FindingsList({ findings, className }: FindingsListProps) {
  const [severityFilter, setSeverityFilter] = useState<FindingSeverity | null>(
    null
  );
  const [categoryFilter, setCategoryFilter] = useState<FindingCategory | null>(
    null
  );

  const filtered = useMemo(() => {
    let result = findings;
    if (severityFilter) {
      result = result.filter((f) => f.severity === severityFilter);
    }
    if (categoryFilter) {
      result = result.filter((f) => f.category === categoryFilter);
    }
    return result;
  }, [findings, severityFilter, categoryFilter]);

  const grouped = useMemo(() => {
    const groups: Record<string, Finding[]> = {};
    severityOrder.forEach((sev) => {
      const items = filtered.filter((f) => f.severity === sev);
      if (items.length > 0) {
        groups[sev] = items;
      }
    });
    return groups;
  }, [filtered]);

  const hasActiveFilter = severityFilter || categoryFilter;

  return (
    <div className={cn("", className)}>
      {/* Filter bar */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <Filter className="h-4 w-4 text-text-tertiary" />
        {severityOrder.map((sev) => (
          <button
            key={sev}
            onClick={() =>
              setSeverityFilter(severityFilter === sev ? null : sev)
            }
            className={cn(
              "px-2.5 py-1 rounded-full text-xs font-medium border transition-colors",
              severityFilter === sev
                ? "bg-accent/10 border-accent/30 text-accent"
                : "border-border-subtle text-text-secondary hover:border-border-strong"
            )}
          >
            {sev.charAt(0).toUpperCase() + sev.slice(1)}
          </button>
        ))}
        <span className="text-text-tertiary text-xs mx-1">|</span>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() =>
              setCategoryFilter(categoryFilter === cat ? null : cat)
            }
            className={cn(
              "px-2.5 py-1 rounded-full text-xs font-medium border transition-colors",
              categoryFilter === cat
                ? "bg-accent/10 border-accent/30 text-accent"
                : "border-border-subtle text-text-secondary hover:border-border-strong"
            )}
          >
            {cat.replace("_", " ")}
          </button>
        ))}
        {hasActiveFilter && (
          <button
            onClick={() => {
              setSeverityFilter(null);
              setCategoryFilter(null);
            }}
            className="flex items-center gap-1 px-2 py-1 text-xs text-text-tertiary hover:text-text-secondary"
          >
            <X className="h-3 w-3" />
            Clear
          </button>
        )}
      </div>

      {/* Grouped findings */}
      {Object.entries(grouped).map(([severity, items]) => (
        <div key={severity} className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <SeverityBadge severity={severity as FindingSeverity} />
            <span className="text-xs text-text-tertiary font-mono">
              {items.length}
            </span>
          </div>
          <div className="space-y-2">
            {items.map((finding, i) => (
              <div
                key={finding.id}
                className="animate-slide-up"
                style={{ animationDelay: `${i * 20}ms` }}
              >
                <FindingCard finding={finding} />
              </div>
            ))}
          </div>
        </div>
      ))}

      {filtered.length === 0 && (
        <div className="text-center py-16 text-text-tertiary">
          <p className="text-sm">No findings match your filters.</p>
        </div>
      )}
    </div>
  );
}
