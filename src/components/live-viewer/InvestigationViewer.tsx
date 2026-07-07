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
import { BrowserViewer } from "./BrowserViewer";
import { InvestigationTimeline } from "./InvestigationTimeline";
import { ReportPage } from "./ReportPage";
import { ErrorState, LoadingDots } from "@/components/shared";
import { FileText, Loader2 } from "lucide-react";

export function InvestigationViewer({ className }: { className?: string }) {
  const { state } = useInvestigation();
  const { phase, evidence, graph, findings, llmTokens, connectionStatus, error, duration, url } =
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
        return null; // ReportPage is rendered separately
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
        {phase === "complete" ? (
          /* Full report view */
          <div className="flex-1 overflow-y-auto p-6">
            <ReportPage
              phase={phase}
              url={url}
              evidence={evidence}
              findings={findings}
              duration={duration}
            />
          </div>
        ) : (
          <>
            {/* Browser Viewer */}
            <div className="p-4 pb-0">
              <BrowserViewer
                url={url}
                evidence={evidence}
                className="h-64"
              />
            </div>

            {/* Phase-specific content below browser */}
            <div className="flex-1 overflow-y-auto p-4">
              {renderPhaseContent()}
            </div>
          </>
        )}
      </div>

      {/* Right: Timeline + Findings Preview */}
      <div className="w-80 shrink-0 border-l border-border-subtle bg-surface flex flex-col">
        {phase === "complete" ? (
          <LiveFindingsPreview findings={findings} />
        ) : (
          <>
            <div className="flex-1 overflow-hidden flex flex-col">
              <InvestigationTimeline
                phase={phase}
                evidence={evidence}
                findings={findings}
                className="flex-1"
              />
            </div>
            <div className="border-t border-border-subtle flex-1 overflow-hidden flex flex-col">
              <LiveFindingsPreview findings={findings} />
            </div>
          </>
        )}
        <div className="px-4 py-2 border-t border-border-subtle">
          <ConnectionStatus status={connectionStatus} />
        </div>
      </div>
    </div>
  );
}
