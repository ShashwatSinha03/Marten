"use client";

import React from "react";
import { cn } from "@/lib/utils";
import type { EvidenceItem } from "@/types";
import { Image, Code, Activity, Terminal } from "lucide-react";
import { Card } from "@/components/shared";

interface CollectingEvidencePhaseProps {
  evidence: EvidenceItem[];
  className?: string;
}

const evidenceConfig: Record<
  string,
  { icon: React.ReactNode; label: string; color: string }
> = {
  screenshot: {
    icon: <Image className="h-4 w-4" />,
    label: "Screenshot",
    color: "text-node-screen",
  },
  dom_snapshot: {
    icon: <Code className="h-4 w-4" />,
    label: "DOM Snapshot",
    color: "text-node-component",
  },
  network_log: {
    icon: <Activity className="h-4 w-4" />,
    label: "Network Log",
    color: "text-node-interaction",
  },
  console_log: {
    icon: <Terminal className="h-4 w-4" />,
    label: "Console Log",
    color: "text-node-effect",
  },
};

export function CollectingEvidencePhase({
  evidence,
  className,
}: CollectingEvidencePhaseProps) {
  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center gap-2 px-1">
        <h2 className="text-sm font-semibold text-text-primary font-display">
          Collecting Evidence
        </h2>
        <span className="text-xs text-text-tertiary font-mono">
          {evidence.length} items
        </span>
      </div>

      <div className="grid gap-2">
        {evidence.map((item, index) => {
          const config =
            evidenceConfig[item.type] || evidenceConfig["dom_snapshot"];
          return (
            <div
              key={item.id}
              className="animate-slide-up"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <Card padding="sm" className="hover:border-border-strong transition-colors">
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      "flex items-center justify-center w-8 h-8 rounded-lg bg-surface-elevated",
                      config.color
                    )}
                  >
                    {config.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-text-primary">
                        {config.label}
                      </span>
                      <span className="text-[11px] text-text-tertiary font-mono">
                        {(item.size / 1024).toFixed(1)} KB
                      </span>
                    </div>
                    <p className="text-xs text-text-tertiary truncate mt-0.5">
                      {item.metadata?.url as string ||
                        item.storageKey ||
                        "Captured evidence"}
                    </p>
                  </div>
                  {item.type === "screenshot" && (
                    <div className="shrink-0 w-16 h-12 rounded-md bg-surface-elevated border border-border-subtle overflow-hidden">
                      <div className="w-full h-full bg-gradient-to-br from-surface-elevated to-surface-overlay flex items-center justify-center">
                        <Image className="h-4 w-4 text-text-tertiary" />
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          );
        })}

        {evidence.length === 0 && (
          <div className="text-center py-8 text-text-tertiary">
            <div className="flex items-center justify-center gap-2">
              <span className="animate-pulse-soft text-accent">●</span>
              <span className="text-sm">Waiting for evidence...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
