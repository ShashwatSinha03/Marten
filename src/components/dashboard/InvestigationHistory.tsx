"use client";

import React from "react";
import { cn } from "@/lib/utils";
import type { InvestigationStatus, InvestigationDepth } from "@/types";
import { InvestigationRow } from "./InvestigationRow";
import { EmptyState } from "@/components/shared";
import { History } from "lucide-react";

interface InvestigationRecord {
  id: string;
  url: string;
  status: InvestigationStatus;
  depth: InvestigationDepth;
  createdAt: string;
  findingCount: number;
}

interface InvestigationHistoryProps {
  investigations: InvestigationRecord[];
  onRerun: (id: string) => void;
  onShare: (id: string) => void;
  onDelete: (id: string) => void;
  className?: string;
}

export function InvestigationHistory({
  investigations,
  onRerun,
  onShare,
  onDelete,
  className,
}: InvestigationHistoryProps) {
  if (investigations.length === 0) {
    return (
      <EmptyState
        icon={<History className="h-10 w-10" />}
        title="No investigations yet"
        description="Start your first investigation by entering a URL above."
      />
    );
  }

  return (
    <div className={cn("", className)}>
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-sm font-semibold text-text-primary">
          Investigation History
        </h2>
        <span className="text-xs text-text-tertiary font-mono">
          {investigations.length}
        </span>
      </div>

      <div className="divide-y divide-border-subtle border border-border-subtle rounded-xl overflow-hidden">
        {investigations.map((investigation) => (
          <InvestigationRow
            key={investigation.id}
            investigation={investigation}
            onRerun={() => onRerun(investigation.id)}
            onShare={() => onShare(investigation.id)}
            onDelete={() => onDelete(investigation.id)}
          />
        ))}
      </div>
    </div>
  );
}
