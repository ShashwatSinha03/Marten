"use client";

import React, { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import type { Finding } from "@/types";
import { SeverityBadge } from "@/components/shared";
import { ChevronDown, FileText, Lightbulb } from "lucide-react";

interface FindingCardProps {
  finding: Finding;
  className?: string;
}

export function FindingCard({ finding, className }: FindingCardProps) {
  const [expanded, setExpanded] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState(0);

  useEffect(() => {
    if (contentRef.current) {
      setContentHeight(contentRef.current.scrollHeight);
    }
  }, [finding]);

  return (
    <div
      className={cn(
        "rounded-xl border border-border-subtle bg-surface overflow-hidden transition-all duration-200",
        "hover:border-border-strong",
        expanded && "border-border-strong",
        className
      )}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left p-3.5 flex items-start gap-3"
      >
        <SeverityBadge severity={finding.severity} size="sm" className="mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-text-primary">
              {finding.title}
            </span>
            {finding.isLowConfidence && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-surface-elevated text-text-tertiary border border-border-subtle">
                Low confidence
              </span>
            )}
          </div>
          <p className="text-xs text-text-secondary mt-0.5 line-clamp-2">
            {finding.description}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] text-text-tertiary font-mono">
            {finding.evidenceRefs.length} refs
          </span>
          <ChevronDown
            className={cn(
              "h-4 w-4 text-text-tertiary transition-transform duration-200",
              expanded && "rotate-180"
            )}
          />
        </div>
      </button>

      {/* Expanded content */}
      <div
        className={cn(
          "transition-all duration-200 overflow-hidden",
          expanded ? "max-h-96" : "max-h-0"
        )}
      >
        <div ref={contentRef} className="px-3.5 pb-4 border-t border-border-subtle pt-3">
          <p className="text-xs text-text-secondary leading-relaxed mb-3">
            {finding.description}
          </p>

          <div className="flex items-center gap-2 text-xs text-text-tertiary mb-2">
            <FileText className="h-3.5 w-3.5" />
            <span>Category: {finding.category.replace("_", " ")}</span>
            <span className="text-border-subtle">·</span>
            <span>
              Confidence: {Math.round(finding.confidence * 100)}%
            </span>
            <span className="text-border-subtle">·</span>
            <span>Source: {finding.source}</span>
          </div>

          {finding.recommendation && (
            <div className="flex gap-2 p-2.5 rounded-lg bg-accent/5 border border-accent/10">
              <Lightbulb className="h-4 w-4 text-accent shrink-0 mt-0.5" />
              <div>
                <span className="text-[11px] font-bold text-accent uppercase tracking-wider">
                  Recommendation
                </span>
                <p className="text-xs text-text-secondary mt-0.5">
                  {finding.recommendation}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
