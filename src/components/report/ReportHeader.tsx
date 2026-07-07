import React from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/shared";
import { Calendar, Clock, Target } from "lucide-react";
import type { InvestigationDepth } from "@/types";

interface ReportHeaderProps {
  url: string;
  depth: InvestigationDepth;
  date: string;
  duration: number;
  findingCount: number;
  className?: string;
}

function formatDuration(ms: number) {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${m}m ${s}s`;
}

export function ReportHeader({
  url,
  depth,
  date,
  duration,
  findingCount,
  className,
}: ReportHeaderProps) {
  return (
    <div className={cn("border-b border-border-subtle pb-6 mb-8", className)}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-semibold text-text-primary mb-2 font-display">
            Investigation Report
          </h1>
          <div className="flex items-center gap-2 text-sm text-text-secondary font-mono">
            <Target className="h-4 w-4 text-text-tertiary" />
            <span className="truncate">{url}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-4">
          <Badge variant={depth === "quick" ? "default" : "info"}>
            {depth === "quick" ? "Quick" : "Standard"}
          </Badge>
          <Badge variant="default">{findingCount} findings</Badge>
        </div>
      </div>
      <div className="flex items-center gap-4 mt-3 text-xs text-text-tertiary">
        <span className="flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5" />
          {date}
        </span>
        <span className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" />
          {formatDuration(duration)}
        </span>
      </div>
    </div>
  );
}
