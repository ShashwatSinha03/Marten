"use client";

import React from "react";
import { cn } from "@/lib/utils";
import type { InvestigationDepth } from "@/types";
import { Zap, Layers } from "lucide-react";

interface DepthSelectorProps {
  value: InvestigationDepth;
  onChange: (depth: InvestigationDepth) => void;
  disabled?: boolean;
  className?: string;
}

const depths: {
  key: InvestigationDepth;
  label: string;
  description: string;
  duration: string;
  icon: React.ReactNode;
}[] = [
  {
    key: "quick",
    label: "Quick",
    description: "Screenshot + heuristic scan",
    duration: "<30s",
    icon: <Zap className="h-3.5 w-3.5" />,
  },
  {
    key: "standard",
    label: "Standard",
    description: "Full investigation with graph",
    duration: "2-5min",
    icon: <Layers className="h-3.5 w-3.5" />,
  },
];

export function DepthSelector({
  value,
  onChange,
  disabled = false,
  className,
}: DepthSelectorProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-xl bg-surface border border-border-subtle p-1 gap-0",
        disabled && "opacity-50 pointer-events-none",
        className
      )}
      role="radiogroup"
      aria-label="Investigation depth"
    >
      {depths.map((depth) => (
        <button
          key={depth.key}
          role="radio"
          aria-checked={value === depth.key}
          onClick={() => onChange(depth.key)}
          disabled={disabled}
          className={cn(
            "relative flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition-all duration-150",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
            value === depth.key
              ? "bg-accent/10 text-accent shadow-sm"
              : "text-text-secondary hover:text-text-primary hover:bg-surface-elevated"
          )}
        >
          <span
            className={cn(
              value === depth.key ? "text-accent" : "text-text-tertiary"
            )}
          >
            {depth.icon}
          </span>
          <span>{depth.label}</span>
          <span
            className={cn(
              "text-[11px] px-1.5 py-0.5 rounded-full font-semibold",
              value === depth.key
                ? "bg-accent/15 text-accent"
                : "bg-surface-elevated text-text-tertiary"
            )}
          >
            {depth.duration}
          </span>
          {value === depth.key && (
            <span className="absolute inset-0 rounded-lg ring-1 ring-accent/30" />
          )}
        </button>
      ))}
    </div>
  );
}
