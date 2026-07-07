import React from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/shared";
import { AlertTriangle, AlertCircle, Info, AlertOctagon, ChevronDown } from "lucide-react";
import type { FindingSeverity } from "@/types";

interface ReportSummaryProps {
  summary: string;
  severityCounts: Record<FindingSeverity, number>;
  className?: string;
}

const severityConfig: Record<FindingSeverity, { label: string; color: string; bg: string; bar: string; icon: React.ReactNode }> = {
  critical: {
    label: "Critical",
    color: "text-critical",
    bg: "bg-critical/10",
    bar: "bg-critical",
    icon: <AlertOctagon className="h-4 w-4" />,
  },
  high: {
    label: "High",
    color: "text-high",
    bg: "bg-high/10",
    bar: "bg-high",
    icon: <AlertTriangle className="h-4 w-4" />,
  },
  medium: {
    label: "Medium",
    color: "text-medium",
    bg: "bg-medium/10",
    bar: "bg-medium",
    icon: <AlertCircle className="h-4 w-4" />,
  },
  low: {
    label: "Low",
    color: "text-low",
    bg: "bg-low/10",
    bar: "bg-low",
    icon: <Info className="h-4 w-4" />,
  },
  info: {
    label: "Info",
    color: "text-info",
    bg: "bg-info/10",
    bar: "bg-info",
    icon: <Info className="h-4 w-4" />,
  },
};

export function ReportSummary({ summary, severityCounts, className }: ReportSummaryProps) {
  const total = Object.values(severityCounts).reduce((a, b) => a + b, 0);

  return (
    <div className={cn("mb-10", className)}>
      <h2 className="text-lg font-semibold text-text-primary mb-4 font-display">Executive Summary</h2>

      <div className="grid grid-cols-5 gap-3 mb-6">
        {(Object.entries(severityConfig) as [FindingSeverity, typeof severityConfig[FindingSeverity]][]).map(
          ([key, config]) => {
            const count = severityCounts[key] || 0;
            return (
              <div
                key={key}
                className={cn(
                  "flex flex-col items-center p-4 rounded-xl border border-border-subtle",
                  count > 0 ? config.bg : "bg-surface"
                )}
              >
                <div className={cn("mb-1.5", config.color)}>{config.icon}</div>
                <span className={cn("text-xl font-bold", config.color)}>
                  {count}
                </span>
                <span className="text-xs text-text-tertiary mt-0.5">
                  {config.label}
                </span>
              </div>
            );
          }
        )}
      </div>

      <p className="text-sm text-text-secondary leading-relaxed">{summary}</p>

      {total > 0 && (
        <div className="mt-4 flex h-2 rounded-full overflow-hidden bg-surface-elevated">
          {(Object.entries(severityConfig) as [FindingSeverity, typeof severityConfig[FindingSeverity]][]).map(
            ([key, config]) => {
              const count = severityCounts[key] || 0;
              if (count === 0) return null;
              return (
                <div
                  key={key}
                  className={config.bar}
                  style={{ width: `${(count / total) * 100}%` }}
                  title={`${config.label}: ${count}`}
                />
              );
            }
          )}
        </div>
      )}
    </div>
  );
}
