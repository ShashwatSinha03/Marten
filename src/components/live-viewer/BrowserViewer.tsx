"use client";

import React from "react";
import { cn } from "@/lib/utils";
import {
  Globe,
  Shield,
  Lock,
  ChevronLeft,
  ChevronRight,
  RotateCw,
} from "lucide-react";
import type { EvidenceItem } from "@/types";

interface BrowserViewerProps {
  url: string;
  evidence: EvidenceItem[];
  className?: string;
}

export function BrowserViewer({
  url,
  evidence,
  className,
}: BrowserViewerProps) {
  // Derive the current "showing" URL from the latest evidence metadata
  const latestEvidence = evidence[evidence.length - 1];
  const currentUrl =
    (latestEvidence?.metadata?.url as string | undefined) ?? url;

  const protocol = currentUrl.startsWith("https") ? "https" : "http";
  const hostname = currentUrl.replace(/^https?:\/\//, "").split("/")[0];

  return (
    <div className={cn("flex flex-col", className)}>
      {/* Browser Chrome */}
      <div className="flex items-center gap-2 px-3 py-2 bg-surface rounded-t-xl border border-border-subtle border-b-0">
        {/* Window controls */}
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-[#ff5f56]" />
          <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
          <div className="w-3 h-3 rounded-full bg-[#27c93f]" />
        </div>

        {/* Navigation buttons */}
        <div className="flex items-center gap-1 ml-3 text-text-tertiary">
          <ChevronLeft className="h-3.5 w-3.5 opacity-40" />
          <ChevronRight className="h-3.5 w-3.5 opacity-40" />
          <RotateCw className="h-3 w-3 opacity-40" />
        </div>

        {/* URL bar */}
        <div className="flex-1 flex items-center gap-2 bg-canvas rounded-md px-3 py-1.5 mx-2 border border-border-subtle">
          <Shield
            className={cn(
              "h-3.5 w-3.5 shrink-0",
              protocol === "https" ? "text-success" : "text-text-tertiary",
            )}
          />
          <span className="text-xs text-text-primary font-mono truncate">
            {currentUrl}
          </span>
        </div>

        {/* Connection security info */}
        <Lock className="h-3.5 w-3.5 text-text-tertiary shrink-0" />
      </div>

      {/* Viewport — warm cream page (marten's belly) */}
      <div className="flex-1 bg-cream/10 rounded-b-xl border border-border-subtle overflow-hidden relative min-h-[280px]">
        {/* Evidence-based content */}
        <div className="absolute inset-0 flex flex-col">
          {/* URL indicator strip */}
          <div className="flex items-center gap-2 px-4 py-2 bg-cream/8 border-b border-brown/20">
            <Globe className="h-3.5 w-3.5 text-text-tertiary" />
            <span className="text-xs text-text-secondary font-mono truncate">
              {hostname}
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent/10 text-accent font-mono ml-auto">
              Live investigation
            </span>
          </div>

          {/* Evidence gallery */}
          <div className="flex-1 overflow-y-auto p-4">
            {evidence.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {evidence.map((item) => (
                  <div
                    key={item.id}
                    className="animate-slide-up rounded-lg border border-brown/20 bg-cream/5 overflow-hidden"
                  >
                    {/* Screenshot preview */}
                    <div className="aspect-[4/3] bg-gradient-to-br from-cream/12 to-brown/10 flex items-center justify-center">
                      {item.type === "screenshot" ? (
                        <div className="w-full h-full p-3">
                          <div className="w-full h-full rounded border border-brown/30 bg-cream/15 flex items-center justify-center">
                            <div className="text-center">
                              <div className="w-8 h-8 mx-auto rounded-lg bg-accent/10 flex items-center justify-center mb-1">
                                <Globe className="h-4 w-4 text-accent" />
                              </div>
                              <p className="text-[10px] text-text-tertiary font-mono">
                                screenshot
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center">
                          <div className="w-8 h-8 mx-auto rounded-lg bg-brown/15 flex items-center justify-center mb-1">
                            <Globe className="h-4 w-4 text-text-tertiary" />
                          </div>
                          <p className="text-[10px] text-text-tertiary font-mono">
                            {item.type.replace("_", " ")}
                          </p>
                        </div>
                      )}
                    </div>
                    {/* Evidence label */}
                    <div className="px-2.5 py-1.5">
                      <p className="text-[11px] text-text-primary font-semibold truncate">
                        {item.metadata?.description as string ??
                          item.type.replace("_", " ")}
                      </p>
                      <p className="text-[10px] text-text-tertiary font-mono">
                        {(item.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="w-12 h-12 mx-auto rounded-xl bg-cream/8 border border-brown/20 flex items-center justify-center mb-3">
                    <Globe className="h-6 w-6 text-text-tertiary" />
                  </div>
                  <p className="text-sm text-text-secondary font-semibold">
                    Waiting for browser data...
                  </p>
                  <p className="text-xs text-text-tertiary mt-1">
                    The investigation will navigate to{" "}
                    <span className="font-mono text-text-secondary">{hostname}</span>{" "}
                    and collect evidence
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
