"use client";

import React, { useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import type { Finding } from "@/types";
import { FindingCard } from "./FindingCard";
import { Brain, Loader2 } from "lucide-react";

interface InvestigatingPhaseProps {
  findings: Finding[];
  llmTokens: string[];
  className?: string;
}

export function InvestigatingPhase({
  findings,
  llmTokens,
  className,
}: InvestigatingPhaseProps) {
  const tokensEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    tokensEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [llmTokens]);

  return (
    <div className={cn("flex flex-1 gap-4 h-full", className)}>
      {/* Left: Findings */}
      <div className="flex-1 min-w-0 space-y-2 overflow-y-auto pr-2">
        <div className="flex items-center gap-2 px-1 pb-2">
          <h2 className="text-sm font-semibold text-text-primary">
            Findings
          </h2>
          <span className="text-xs text-text-tertiary font-mono">
            {findings.length} discovered
          </span>
        </div>
        {findings.map((finding, index) => (
          <div
            key={finding.id}
            className="animate-slide-up"
            style={{ animationDelay: `${index * 30}ms` }}
          >
            <FindingCard finding={finding} />
          </div>
        ))}
        {findings.length === 0 && (
          <div className="flex items-center justify-center py-12 text-text-tertiary">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-accent" />
              <span className="text-sm">Analyzing evidence...</span>
            </div>
          </div>
        )}
      </div>

      {/* Right: LLM Reasoning */}
      <div className="w-80 shrink-0 flex flex-col">
        <div className="flex items-center gap-2 px-1 pb-2">
          <Brain className="h-4 w-4 text-accent" />
          <h2 className="text-sm font-semibold text-text-primary">
            LLM Reasoning
          </h2>
        </div>
        <div className="flex-1 rounded-xl border border-border-subtle bg-surface p-3 overflow-y-auto font-mono text-xs leading-relaxed">
          {llmTokens.length > 0 ? (
            <>
              <span className="text-accent">Thinking</span>
              <span className="text-text-secondary">
                {llmTokens.map((token, i) => (
                  <span
                    key={i}
                    className="animate-fade-in"
                    style={{ animationDelay: `${i * 10}ms` }}
                  >
                    {token}
                  </span>
                ))}
              </span>
              <span className="inline-flex ml-1">
                <span className="animate-pulse-soft text-accent">▊</span>
              </span>
            </>
          ) : (
            <div className="flex items-center gap-2 h-full justify-center text-text-tertiary">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>Waiting for analysis...</span>
            </div>
          )}
          <div ref={tokensEndRef} />
        </div>
      </div>
    </div>
  );
}
