"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/shared";
import { formatDate, truncate } from "@/lib/utils";
import { Target, RotateCw, Share2, Trash2, ChevronRight } from "lucide-react";
import type { InvestigationStatus, InvestigationDepth } from "@/types";
import Link from "next/link";

interface InvestigationRecord {
  id: string;
  url: string;
  status: InvestigationStatus;
  depth: InvestigationDepth;
  createdAt: string;
  findingCount: number;
}

interface InvestigationRowProps {
  investigation: InvestigationRecord;
  onRerun: () => void;
  onShare: () => void;
  onDelete: () => void;
  className?: string;
}

const statusBadge: Record<InvestigationStatus, { variant: "critical" | "success" | "default" | "info" | "high"; label: string }> = {
  pending: { variant: "default", label: "Pending" },
  url_validating: { variant: "info", label: "Validating" },
  collecting_evidence: { variant: "info", label: "Collecting" },
  building_graph: { variant: "info", label: "Building" },
  investigating: { variant: "info", label: "Investigating" },
  generating_report: { variant: "info", label: "Generating" },
  complete: { variant: "success", label: "Complete" },
  failed: { variant: "critical", label: "Failed" },
  aborted: { variant: "high", label: "Aborted" },
};

export function InvestigationRow({
  investigation,
  onRerun,
  onShare,
  onDelete,
  className,
}: InvestigationRowProps) {
  const status = statusBadge[investigation.status];

  return (
    <div
      className={cn(
        "flex items-center gap-4 px-4 py-3 hover:bg-surface-elevated/50 transition-colors group",
        className
      )}
    >
      {/* Icon */}
      <div className="shrink-0 w-9 h-9 rounded-lg bg-surface-elevated border border-border-subtle flex items-center justify-center">
        <Target className="h-4 w-4 text-text-tertiary" />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Link
            href={`/investigate/${investigation.id}`}
            className="text-sm font-medium text-text-primary hover:text-accent transition-colors truncate"
          >
            {truncate(investigation.url, 50)}
          </Link>
          <Badge variant={status.variant} size="sm">
            {status.label}
          </Badge>
          <Badge
            variant={investigation.depth === "quick" ? "default" : "info"}
            size="sm"
          >
            {investigation.depth}
          </Badge>
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="text-xs text-text-tertiary">
            {formatDate(investigation.createdAt)}
          </span>
          <span className="text-xs text-text-tertiary font-mono">
            {investigation.findingCount} findings
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={onRerun}
          className="p-1.5 rounded-md text-text-tertiary hover:text-accent hover:bg-accent/10 transition-colors"
          title="Re-run investigation"
        >
          <RotateCw className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={onShare}
          className="p-1.5 rounded-md text-text-tertiary hover:text-text-primary hover:bg-surface-elevated transition-colors"
          title="Share"
        >
          <Share2 className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={onDelete}
          className="p-1.5 rounded-md text-text-tertiary hover:text-critical hover:bg-critical/10 transition-colors"
          title="Delete"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Chevron */}
      <Link
        href={`/investigate/${investigation.id}`}
        className="shrink-0 text-text-tertiary hover:text-text-primary"
      >
        <ChevronRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
