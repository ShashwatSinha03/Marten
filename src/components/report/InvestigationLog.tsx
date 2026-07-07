"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown, Clock, Activity, AlertTriangle, CheckCircle, Loader2 } from "lucide-react";
import type { SseEvent } from "@/types";

interface InvestigationLogProps {
  events: SseEvent[];
  className?: string;
}

const eventIcons: Record<string, React.ReactNode> = {
  phase_change: <Activity className="h-3.5 w-3.5" />,
  progress_update: <Loader2 className="h-3.5 w-3.5" />,
  evidence_collected: <CheckCircle className="h-3.5 w-3.5" />,
  graph_node_added: <Activity className="h-3.5 w-3.5" />,
  finding_discovered: <AlertTriangle className="h-3.5 w-3.5" />,
  error: <AlertTriangle className="h-3.5 w-3.5 text-critical" />,
  complete: <CheckCircle className="h-3.5 w-3.5 text-success" />,
};

export function InvestigationLog({ events, className }: InvestigationLogProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={cn("", className)}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-sm font-semibold text-text-secondary hover:text-text-primary transition-colors"
      >
        <ChevronDown
          className={cn(
            "h-4 w-4 transition-transform",
            expanded && "rotate-180"
          )}
        />
        Investigation Log
        <span className="text-xs text-text-tertiary font-mono">
          {events.length} events
        </span>
      </button>

      {expanded && (
        <div className="mt-3 rounded-xl border border-border-subtle bg-surface max-h-64 overflow-y-auto">
          {events.length > 0 ? (
            <div className="divide-y divide-border-subtle">
              {events.map((event) => (
                <div
                  key={event.id}
                  className="flex items-start gap-2.5 px-3 py-2 text-xs"
                >
                  <span className="shrink-0 mt-0.5 text-text-tertiary">
                    {eventIcons[event.type] || <Clock className="h-3.5 w-3.5" />}
                  </span>
                  <div className="flex-1 min-w-0">
                    <span className="text-text-primary font-semibold">
                      {event.type.replace(/_/g, " ")}
                    </span>
                    <span className="text-text-tertiary ml-1.5">
                      {JSON.stringify(event.data).slice(0, 80)}
                    </span>
                  </div>
                  <span className="shrink-0 text-text-tertiary font-mono">
                    #{event.id}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-3 py-4 text-center text-text-tertiary text-xs">
              No log entries available
            </div>
          )}
        </div>
      )}
    </div>
  );
}
