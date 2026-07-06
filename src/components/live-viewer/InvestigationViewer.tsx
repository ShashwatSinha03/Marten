"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { useInvestigation } from "./InvestigationProvider";
import { InvestigationStepIndicator } from "./InvestigationStepIndicator";
import { CollectingEvidencePhase } from "./CollectingEvidencePhase";
import { BuildingGraphPhase } from "./BuildingGraphPhase";
import { InvestigatingPhase } from "./InvestigatingPhase";
import { LiveFindingsPreview } from "./LiveFindingsPreview";
import { ConnectionStatus } from "./ConnectionStatus";
import { ErrorState, LoadingDots } from "@/components/shared";
import { FileText, Loader2 } from "lucide-react";

export function InvestigationViewer({ className }: { className?: string }) {
  const { state } = useInvestigation();
  const { phase, evidence, graph, findings, llmTokens, connectionStatus, error, duration } =
    state;

  const renderPhaseContent = () => {
    switch (phase) {
      case "url_validating":
        return (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-accent mx-auto mb-4" />
              <p className="text-sm text-text-secondary">
                Validating URL and preparing investigation...
              </p>
            </div>
          </div>
        );
      case "collecting_evidence":
        return <CollectingEvidencePhase evidence={evidence} />;
      case "building_graph":
        return <BuildingGraphPhase nodes={graph.nodes} edges={graph.edges} />;
      case "investigating":
        return (
          <InvestigatingPhase findings={findings} llmTokens={llmTokens} />
        );
      case "generating_report":
        return (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <FileText className="h-8 w-8 text-accent mx-auto mb-4" />
              <p className="text-sm text-text-secondary">
                Generating investigation report...
              </p>
              <div className="mt-3 flex items-center justify-center gap-1 text-xs text-text-tertiary">
                <LoadingDots />
                <span>{findings.length} findings to compile</span>
              </div>
            </div>
          </div>
        );
      case "complete":
        return (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-success/10 border border-success/20 flex items-center justify-center mx-auto mb-4">
                <FileText className="h-6 w-6 text-success" />
              </div>
              <p className="text-sm font-medium text-text-primary">
                Investigation Complete
              </p>
              <p className="text-xs text-text-tertiary mt-1">
                {findings.length} findings · {evidence.length} evidence items
              </p>
            </div>
          </div>
        );
      case "failed":
        return (
          <ErrorState
            title="Investigation Failed"
            message={error || "An unexpected error occurred during investigation."}
            type="phase_failed"
          />
        );
      case "aborted":
        return (
          <ErrorState
            title="Investigation Aborted"
            message="The investigation was cancelled."
            type="partial"
          />
        );
      default:
        return (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-accent mx-auto mb-4" />
              <p className="text-sm text-text-secondary">Starting...</p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className={cn("flex h-full", className)}>
      {/* Left: Step Indicator */}
      <div className="w-72 shrink-0 border-r border-border-subtle bg-surface flex flex-col">
        <InvestigationStepIndicator
          currentPhase={phase}
          depth={state.depth}
          duration={duration}
        />
      </div>

      {/* Center: Main Content */}
      <div className="flex-1 min-w-0 flex flex-col bg-canvas">
        <div className="flex-1 overflow-y-auto p-6">{renderPhaseContent()}</div>
      </div>

      {/* Right: Findings Preview */}
      <div className="w-80 shrink-0 border-l border-border-subtle bg-surface flex flex-col">
        <LiveFindingsPreview findings={findings} />
        <div className="px-4 py-2 border-t border-border-subtle">
          <ConnectionStatus status={connectionStatus} />
        </div>
      </div>
    </div>
  );
}
