import React from "react";
import { cn } from "@/lib/utils";
import type { FindingSeverity } from "@/types";

interface SeverityBadgeProps {
  severity: FindingSeverity;
  size?: "sm" | "default";
  className?: string;
}

const severityConfig: Record<FindingSeverity, { label: string; classes: string }> = {
  critical: { label: "Critical", classes: "bg-critical/15 text-critical border-critical/25" },
  high: { label: "High", classes: "bg-high/15 text-high border-high/25" },
  medium: { label: "Medium", classes: "bg-medium/15 text-medium border-medium/25" },
  low: { label: "Low", classes: "bg-low/15 text-low border-low/25" },
  info: { label: "Info", classes: "bg-info/15 text-info border-info/25" },
};

const sizeStyles = {
  sm: "px-1.5 py-0.5 text-[10px] leading-[14px]",
  default: "px-2.5 py-0.5 text-xs",
};

export function SeverityBadge({ severity, size = "default", className }: SeverityBadgeProps) {
  const config = severityConfig[severity];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-semibold border",
        config.classes,
        sizeStyles[size],
        className
      )}
    >
      <span
        className={cn(
          "w-1.5 h-1.5 rounded-full mr-1.5",
          severity === "critical" && "bg-critical",
          severity === "high" && "bg-high",
          severity === "medium" && "bg-medium",
          severity === "low" && "bg-low",
          severity === "info" && "bg-info"
        )}
      />
      {config.label}
    </span>
  );
}
