"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { PhaseStep } from "./PhaseStep";
import type { InvestigationStatus, InvestigationDepth } from "@/types";

interface PhaseConfig {
  key: InvestigationStatus;
  label: string;
}

const basePhases: PhaseConfig[] = [
  { key: "url_validating", label: "URL Input" },
  { key: "collecting_evidence", label: "Collecting Evidence" },
  { key: "building_graph", label: "Building Graph" },
  { key: "investigating", label: "Investigating" },
  { key: "generating_report", label: "Generating Report" },
];

interface InvestigationStepIndicatorProps {
  currentPhase: InvestigationStatus;
  depth: InvestigationDepth;
  duration?: number;
  className?: string;
}

export function InvestigationStepIndicator({
  currentPhase,
  depth,
  duration,
  className,
}: InvestigationStepIndicatorProps) {
  const showGraph = depth === "standard";
  const phases = showGraph
    ? basePhases
    : basePhases.filter((p) => p.key !== "building_graph");

  const phaseOrder = phases.map((p) => p.key);
  const currentIndex = phaseOrder.indexOf(currentPhase as typeof phaseOrder[number]);

  const formatDuration = (ms?: number) => {
    if (!ms) return undefined;
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    const m = Math.floor(ms / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return `${m}m ${s}s`;
  };

  return (
    <div className={cn("flex flex-col", className)}>
      <div className="px-4 py-3 border-b border-border-subtle">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">
          Progress
        </h3>
      </div>
      <div className="flex-1 px-4 py-5 space-y-1 overflow-y-auto">
        {phases.map((phase, index) => {
          const phaseIdx = phaseOrder.indexOf(phase.key);
          let state: "pending" | "active" | "complete" | "failed";
          if (currentPhase === "failed" && currentIndex >= 0 && phaseIdx === currentIndex) {
            state = "failed";
          } else if (phaseIdx < currentIndex) {
            state = "complete";
          } else if (phaseIdx === currentIndex) {
            state = "active";
          } else {
            state = "pending";
          }

          return (
            <PhaseStep
              key={phase.key}
              index={index}
              label={phase.label}
              state={state}
              duration={
                state === "complete" && duration
                  ? formatDuration(duration)
                  : undefined
              }
              isLast={index === phases.length - 1}
            />
          );
        })}

        {currentPhase === "complete" && (
          <div className="mt-3 pt-3 border-t border-border-subtle">
            <div className="flex items-center gap-2 text-xs text-text-tertiary">
              <span className="font-semibold">Completed</span>
              {duration && (
                <span className="font-mono">{formatDuration(duration)}</span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
