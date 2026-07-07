"use client";

import React, { useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import type { EvidenceItem, Finding, InvestigationStatus } from "@/types";
import {
  Image,
  Code,
  Activity,
  Terminal,
  Search,
  FileText,
  Loader2,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Shuffle,
} from "lucide-react";

// ─── Timeline event types ──────────────────────────────────────────

interface TimelineEntry {
  id: string;
  timestamp: number;
  type:
    | "phase_change"
    | "evidence_collected"
    | "finding_discovered"
    | "graph_event"
    | "llm_activity"
    | "error"
    | "complete";
  message: string;
  detail?: string;
  icon: React.ReactNode;
  color: string;
}

// ─── Colour map for phases ─────────────────────────────────────────

const phaseColors: Record<string, string> = {
  url_validating: "text-accent",
  collecting_evidence: "text-blue-400",
  building_graph: "text-purple-400",
  investigating: "text-amber-400",
  generating_report: "text-emerald-400",
  complete: "text-green-400",
  failed: "text-red-400",
  aborted: "text-red-400",
};

// ─── Component ─────────────────────────────────────────────────────

interface InvestigationTimelineProps {
  phase: InvestigationStatus;
  evidence: EvidenceItem[];
  findings: Finding[];
  className?: string;
}

export function InvestigationTimeline({
  phase,
  evidence,
  findings,
  className,
}: InvestigationTimelineProps) {
  const endRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest entry
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [evidence, findings, phase]);

  // Build timeline entries from current state
  const entries: TimelineEntry[] = [];

  // Phase change entries
  if (phase !== "pending") {
    entries.push({
      id: "phase-url-validate",
      timestamp: Date.now(),
      type: "phase_change",
      message: "Validating URL",
      detail: "Checking URL format and accessibility",
      icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />,
      color: phaseColors.url_validating,
    });
  }

  if (
    phase === "collecting_evidence" ||
    phase === "building_graph" ||
    phase === "investigating" ||
    phase === "generating_report" ||
    phase === "complete"
  ) {
    entries.push({
      id: "phase-collect",
      timestamp: Date.now(),
      type: "phase_change",
      message: "Collecting evidence",
      detail: `${evidence.length} item${evidence.length !== 1 ? "s" : ""} captured`,
      icon: <Activity className="h-3.5 w-3.5" />,
      color: phaseColors.collecting_evidence,
    });
  }

  if (
    (phase === "building_graph" ||
      phase === "investigating" ||
      phase === "generating_report" ||
      phase === "complete") &&
    evidence.length >= 4
  ) {
    entries.push({
      id: "phase-graph",
      timestamp: Date.now(),
      type: "graph_event",
      message: "Building product graph",
      detail: "Mapping page structure and component relationships",
      icon: <Shuffle className="h-3.5 w-3.5" />,
      color: phaseColors.building_graph,
    });
  }

  if (
    phase === "investigating" ||
    phase === "generating_report" ||
    phase === "complete"
  ) {
    entries.push({
      id: "phase-investigate",
      timestamp: Date.now(),
      type: "phase_change",
      message: "Running heuristics and analysis",
      detail: `${findings.length} finding${findings.length !== 1 ? "s" : ""} discovered`,
      icon: <Search className="h-3.5 w-3.5" />,
      color: phaseColors.investigating,
    });
  }

  if (phase === "generating_report" || phase === "complete") {
    entries.push({
      id: "phase-report",
      timestamp: Date.now(),
      type: "phase_change",
      message: "Generating report",
      detail: "Compiling findings and evidence",
      icon: <FileText className="h-3.5 w-3.5" />,
      color: phaseColors.generating_report,
    });
  }

  if (phase === "complete") {
    entries.push({
      id: "phase-complete",
      timestamp: Date.now(),
      type: "complete",
      message: "Investigation complete",
      detail: `${findings.length} findings · ${evidence.length} evidence items`,
      icon: <CheckCircle2 className="h-3.5 w-3.5" />,
      color: phaseColors.complete,
    });
  }

  if (phase === "failed") {
    entries.push({
      id: "phase-failed",
      timestamp: Date.now(),
      type: "error",
      message: "Investigation failed",
      detail: "An error occurred during the investigation",
      icon: <XCircle className="h-3.5 w-3.5" />,
      color: phaseColors.failed,
    });
  }

  // Evidence entries
  evidence.forEach((ev) => {
    const iconMap: Record<string, React.ReactNode> = {
      screenshot: <Image className="h-3 w-3" />,
      dom_snapshot: <Code className="h-3 w-3" />,
      network_log: <Activity className="h-3 w-3" />,
      console_log: <Terminal className="h-3 w-3" />,
    };
    entries.push({
      id: ev.id,
      timestamp: Date.now(),
      type: "evidence_collected",
      message: (ev.metadata?.description as string) ?? `${ev.type.replace("_", " ")} captured`,
      detail: `${(ev.size / 1024).toFixed(1)} KB · ${ev.type.replace("_", " ")}`,
      icon: iconMap[ev.type] ?? <Image className="h-3 w-3" />,
      color: "text-blue-400",
    });
  });

  // Finding entries
  findings.forEach((f) => {
    entries.push({
      id: f.id,
      timestamp: Date.now(),
      type: "finding_discovered",
      message: f.title,
      detail: `${f.severity} · ${f.category.replace("_", " ")} · ${Math.round(f.confidence * 100)}% confidence`,
      icon: <AlertTriangle className="h-3 w-3" />,
      color:
        f.severity === "critical" || f.severity === "high"
          ? "text-red-400"
          : f.severity === "medium"
            ? "text-amber-400"
            : "text-text-tertiary",
    });
  });

  // Deduplicate by id (keep latest of each)
  const seen = new Set<string>();
  const uniqueEntries: TimelineEntry[] = [];
  for (let i = entries.length - 1; i >= 0; i--) {
    if (!seen.has(entries[i].id)) {
      seen.add(entries[i].id);
      uniqueEntries.unshift(entries[i]);
    }
  }

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-border-subtle">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">
          Activity Timeline
        </h3>
      </div>

      {/* Entries */}
      <div
        ref={timelineRef}
        className="flex-1 overflow-y-auto px-4 py-3 space-y-1"
      >
        {uniqueEntries.map((entry, index) => (
          <div
            key={`${entry.id}-${index}`}
            className="flex items-start gap-3 py-1.5 group"
          >
            {/* Timeline line */}
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "flex items-center justify-center w-6 h-6 rounded-full bg-surface-elevated border border-border-subtle shrink-0",
                  entry.color,
                )}
              >
                {entry.icon}
              </div>
              {index < uniqueEntries.length - 1 && (
                <div className="w-px flex-1 bg-border-subtle mt-1" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 pb-2">
              <p className="text-xs text-text-primary font-semibold">
                {entry.message}
              </p>
              {entry.detail && (
                <p className="text-[11px] text-text-tertiary mt-0.5">
                  {entry.detail}
                </p>
              )}
            </div>

            {/* Timestamp */}
            <span className="text-[10px] text-text-tertiary font-mono shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {new Date(entry.timestamp).toLocaleTimeString("en-US", {
                minute: "2-digit",
                second: "2-digit",
              })}
            </span>
          </div>
        ))}

        {/* Active cursor */}
        {phase !== "complete" && phase !== "failed" && phase !== "aborted" && (
          <div className="flex items-center gap-2 py-1.5 text-text-tertiary">
            <div className="w-6 flex justify-center">
              <span className="animate-pulse-soft text-accent">●</span>
            </div>
            <span className="text-xs animate-pulse-soft">In progress...</span>
          </div>
        )}

        <div ref={endRef} />
      </div>
    </div>
  );
}
