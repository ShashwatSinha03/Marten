"use client";

import React from "react";
import { cn } from "@/lib/utils";
import type { EvidenceItem, Finding, InvestigationStatus } from "@/types";
import { SeverityBadge } from "@/components/shared";
import { FindingCard } from "./FindingCard";
import {
  FileText,
  Image,
  Code,
  Activity,
  Terminal,
  CheckCircle2,
  ArrowUpRight,
  Download,
  Share2,
} from "lucide-react";

interface ReportPageProps {
  phase: InvestigationStatus;
  url: string;
  evidence: EvidenceItem[];
  findings: Finding[];
  duration: number;
  className?: string;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}m ${s}s`;
}

const evidenceIconMap: Record<string, React.ReactNode> = {
  screenshot: <Image className="h-4 w-4" />,
  dom_snapshot: <Code className="h-4 w-4" />,
  network_log: <Activity className="h-4 w-4" />,
  console_log: <Terminal className="h-4 w-4" />,
};

export function ReportPage({
  phase,
  url,
  evidence,
  findings,
  duration,
  className,
}: ReportPageProps) {
  if (phase !== "complete") {
    return (
      <div className={cn("flex items-center justify-center h-full", className)}>
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center mx-auto mb-4">
            <FileText className="h-6 w-6 text-accent" />
          </div>
          <p className="text-sm font-semibold text-text-primary">
            Waiting for investigation to complete
          </p>
          <p className="text-xs text-text-tertiary mt-1">
            The report will be available once all phases are finished
          </p>
        </div>
      </div>
    );
  }

  const severityCounts = {
    critical: findings.filter((f) => f.severity === "critical").length,
    high: findings.filter((f) => f.severity === "high").length,
    medium: findings.filter((f) => f.severity === "medium").length,
    low: findings.filter((f) => f.severity === "low").length,
    info: findings.filter((f) => f.severity === "info").length,
  };

  // Sort findings: critical first, then by confidence
  const severityOrder = ["critical", "high", "medium", "low", "info"] as const;
  const sortedFindings = [...findings].sort((a, b) => {
    const aIdx = severityOrder.indexOf(a.severity);
    const bIdx = severityOrder.indexOf(b.severity);
    if (aIdx !== bIdx) return aIdx - bIdx;
    return b.confidence - a.confidence;
  });

  const totalScore = Math.round(
    sortedFindings.reduce((acc, f) => {
      const severityPenalty: Record<string, number> = {
        critical: 25,
        high: 15,
        medium: 10,
        low: 5,
        info: 0,
      };
      return acc - (severityPenalty[f.severity] ?? 5) * f.confidence;
    }, 100),
  );
  const finalScore = Math.max(0, Math.min(100, totalScore));

  return (
    <div className={cn("space-y-6 overflow-y-auto", className)}>
      {/* ── Header ── */}
      <div className="flex items-start gap-6">
        {/* Score ring */}
        <div className="shrink-0">
          <div
            className={cn(
              "w-20 h-20 rounded-full flex items-center justify-center border-2",
              finalScore >= 70
                ? "border-success/30 bg-success/5"
                : finalScore >= 40
                  ? "border-amber-500/30 bg-amber-500/5"
                  : "border-red-500/30 bg-red-500/5",
            )}
          >
            <div className="text-center">
              <span
                className={cn(
                  "text-xl font-semibold",
                  finalScore >= 70
                    ? "text-success"
                    : finalScore >= 40
                      ? "text-amber-500"
                      : "text-red-500",
                )}
              >
                {finalScore}
              </span>
              <span className="text-[10px] text-text-tertiary block -mt-0.5">
                /100
              </span>
            </div>
          </div>
        </div>

        {/* Meta */}
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold text-text-primary font-display">
            Investigation Report
          </h2>
          <p className="text-sm text-text-secondary mt-0.5 truncate">{url}</p>
          <div className="flex items-center gap-3 mt-2 text-xs text-text-tertiary">
            <span>{findings.length} findings</span>
            <span className="w-1 h-1 rounded-full bg-border-subtle" />
            <span>{evidence.length} evidence items</span>
            <span className="w-1 h-1 rounded-full bg-border-subtle" />
            <span>{formatDuration(duration)}</span>
          </div>

          {/* Severity breakdown */}
          <div className="flex items-center gap-2 mt-3">
            {(Object.entries(severityCounts) as [string, number][]).map(
              ([sev, count]) =>
                count > 0 && (
                  <div key={sev} className="flex items-center gap-1.5">
                    <SeverityBadge
                      severity={sev as Finding["severity"]}
                      size="sm"
                    />
                    <span className="text-xs text-text-tertiary font-mono">
                      {count}
                    </span>
                  </div>
                ),
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-elevated border border-border-subtle text-xs text-text-secondary hover:border-border-strong transition-colors">
            <Download className="h-3.5 w-3.5" />
            Export
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-elevated border border-border-subtle text-xs text-text-secondary hover:border-border-strong transition-colors">
            <Share2 className="h-3.5 w-3.5" />
            Share
          </button>
        </div>
      </div>

      {/* ── Summary ── */}
      <div className="grid grid-cols-4 gap-3">
        {[
          {
            label: "Critical",
            count: severityCounts.critical,
            color: "text-red-400",
          },
          {
            label: "High",
            count: severityCounts.high,
            color: "text-orange-400",
          },
          {
            label: "Medium",
            count: severityCounts.medium,
            color: "text-amber-400",
          },
          {
            label: "Low / Info",
            count: severityCounts.low + severityCounts.info,
            color: "text-text-tertiary",
          },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-xl border border-border-subtle bg-surface p-4"
          >
            <p className={cn("text-2xl font-semibold", item.color)}>
              {item.count}
            </p>
            <p className="text-xs text-text-tertiary mt-1">{item.label}</p>
          </div>
        ))}
      </div>

      {/* ── Findings ── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <h3 className="text-sm font-semibold text-text-primary font-display">
            Findings
          </h3>
          <span className="text-xs text-text-tertiary font-mono">
            {findings.length} total
          </span>
        </div>
        <div className="space-y-2">
          {sortedFindings.map((finding, index) => (
            <div
              key={finding.id}
              className="animate-slide-up"
              style={{ animationDelay: `${index * 30}ms` }}
            >
              <FindingCard finding={finding} />
            </div>
          ))}
        </div>
      </div>

      {/* ── Evidence Gallery ── */}
      {evidence.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-sm font-semibold text-text-primary font-display">
              Evidence Collected
            </h3>
            <span className="text-xs text-text-tertiary font-mono">
              {evidence.length} items
            </span>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {evidence.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-border-subtle bg-surface overflow-hidden"
              >
                <div className="aspect-[4/3] bg-gradient-to-br from-surface-elevated to-surface-overlay flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-8 h-8 mx-auto rounded-lg bg-surface-elevated flex items-center justify-center mb-1 text-text-tertiary">
                      {evidenceIconMap[item.type] ?? (
                        <Activity className="h-4 w-4" />
                      )}
                    </div>
                    <p className="text-[10px] text-text-tertiary font-mono">
                      {item.type.replace("_", " ")}
                    </p>
                  </div>
                </div>
                <div className="px-3 py-2">
                  <p className="text-xs text-text-primary font-semibold truncate">
                    {item.metadata?.description as string ??
                      item.type.replace("_", " ")}
                  </p>
                  <p className="text-[10px] text-text-tertiary font-mono mt-0.5">
                    {(item.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
