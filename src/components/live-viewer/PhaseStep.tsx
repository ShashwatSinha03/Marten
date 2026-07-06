"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Check, Loader2, AlertCircle, Circle } from "lucide-react";

type StepState = "pending" | "active" | "complete" | "failed";

interface PhaseStepProps {
  index: number;
  label: string;
  state: StepState;
  duration?: string;
  isLast?: boolean;
}

const stateIcons: Record<StepState, React.ReactNode> = {
  pending: <Circle className="h-4 w-4 text-text-tertiary" />,
  active: <Loader2 className="h-4 w-4 text-accent animate-spin" />,
  complete: (
    <span className="flex items-center justify-center w-4 h-4 rounded-full bg-success/20">
      <Check className="h-3 w-3 text-success" strokeWidth={3} />
    </span>
  ),
  failed: <AlertCircle className="h-4 w-4 text-critical" />,
};

const stateColors: Record<StepState, string> = {
  pending: "text-text-tertiary",
  active: "text-accent",
  complete: "text-success",
  failed: "text-critical",
};

export function PhaseStep({
  index,
  label,
  state,
  duration,
  isLast = false,
}: PhaseStepProps) {
  return (
    <div className="flex gap-3">
      {/* Timeline */}
      <div className="flex flex-col items-center">
        <div
          className={cn(
            "flex items-center justify-center w-7 h-7 rounded-full border transition-all duration-300",
            state === "active" && "border-accent bg-accent/10",
            state === "complete" && "border-success/30 bg-success/10",
            state === "failed" && "border-critical/30 bg-critical/10",
            state === "pending" && "border-border-strong bg-surface"
          )}
        >
          {stateIcons[state]}
        </div>
        {!isLast && (
          <div
            className={cn(
              "w-px h-8 mt-1",
              state === "complete" ? "bg-success/30" : "bg-border-subtle"
            )}
          />
        )}
      </div>

      {/* Content */}
      <div className={cn("flex-1 pb-2", stateColors[state])}>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "text-sm font-medium",
              state === "active" && "text-accent"
            )}
          >
            {label}
          </span>
          {duration && (
            <span className="text-[11px] text-text-tertiary font-mono">
              {duration}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
