"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import type { EvidenceItem } from "@/types";
import { Image, Code, Activity, Terminal, ExternalLink } from "lucide-react";
import { Card } from "@/components/shared";

interface EvidenceGalleryProps {
  evidence: EvidenceItem[];
  className?: string;
}

type Tab = "screenshots" | "dom" | "network" | "console";

const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: "screenshots", label: "Screenshots", icon: <Image className="h-3.5 w-3.5" /> },
  { key: "dom", label: "DOM", icon: <Code className="h-3.5 w-3.5" /> },
  { key: "network", label: "Network", icon: <Activity className="h-3.5 w-3.5" /> },
  { key: "console", label: "Console", icon: <Terminal className="h-3.5 w-3.5" /> },
];

export function EvidenceGallery({ evidence, className }: EvidenceGalleryProps) {
  const [activeTab, setActiveTab] = useState<Tab>("screenshots");

  const screenshots = evidence.filter((e) => e.type === "screenshot");
  const domSnapshots = evidence.filter((e) => e.type === "dom_snapshot");
  const networkLogs = evidence.filter((e) => e.type === "network_log");
  const consoleLogs = evidence.filter((e) => e.type === "console_log");

  const tabContent: Record<Tab, React.ReactNode> = {
    screenshots: (
      <div>
        {screenshots.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {screenshots.map((item) => (
              <button
                key={item.id}
                className="group relative rounded-xl overflow-hidden border border-border-subtle bg-surface-elevated aspect-video hover:border-accent/30 transition-colors"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-surface-elevated to-surface-overlay flex items-center justify-center">
                  <Image className="h-8 w-8 text-text-tertiary" />
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-[11px] text-white truncate">
                    {(item.metadata?.url as string) || "Screenshot"}
                  </p>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-text-tertiary">
            <Image className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No screenshots captured</p>
          </div>
        )}
      </div>
    ),
    dom: (
      <div>
        {domSnapshots.length > 0 ? (
          <div className="space-y-2">
            {domSnapshots.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-border-subtle bg-surface overflow-hidden"
              >
                <div className="flex items-center justify-between px-3 py-2 bg-surface-elevated border-b border-border-subtle">
                  <span className="text-xs text-text-secondary font-mono">
                    {(item.metadata?.url as string) || "DOM Snapshot"}
                  </span>
                  <span className="text-[11px] text-text-tertiary">
                    {(item.size / 1024).toFixed(1)} KB
                  </span>
                </div>
                <pre className="p-3 text-xs font-mono text-text-secondary overflow-x-auto max-h-48 overflow-y-auto">
                  {(item.metadata?.html as string) || item.storageKey || "<!-- DOM content not available -->"}
                </pre>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-text-tertiary">
            <Code className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No DOM snapshots captured</p>
          </div>
        )}
      </div>
    ),
    network: (
      <div>
        {networkLogs.length > 0 ? (
          <div className="rounded-xl border border-border-subtle overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-surface-elevated border-b border-border-subtle">
                  <th className="text-left px-3 py-2 text-text-tertiary font-medium">URL</th>
                  <th className="text-left px-3 py-2 text-text-tertiary font-medium">Method</th>
                  <th className="text-right px-3 py-2 text-text-tertiary font-medium">Status</th>
                  <th className="text-right px-3 py-2 text-text-tertiary font-medium">Size</th>
                </tr>
              </thead>
              <tbody>
                {networkLogs.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-border-subtle hover:bg-surface-elevated/50"
                  >
                    <td className="px-3 py-2 text-text-primary font-mono truncate max-w-72">
                      <span className="flex items-center gap-1.5">
                        <ExternalLink className="h-3 w-3 text-text-tertiary shrink-0" />
                        {(item.metadata?.url as string) || "-"}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-text-secondary">
                      {(item.metadata?.method as string) || "GET"}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <span
                        className={cn(
                          "font-semibold",
                          (item.metadata?.status as number) >= 400
                            ? "text-critical"
                            : (item.metadata?.status as number) >= 300
                            ? "text-accent"
                            : "text-success"
                        )}
                      >
                        {(item.metadata?.status as string) || "200"}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right text-text-secondary">
                      {item.metadata?.size
                        ? `${((item.metadata.size as number) / 1024).toFixed(1)} KB`
                        : `${(item.size / 1024).toFixed(1)} KB`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 text-text-tertiary">
            <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No network logs captured</p>
          </div>
        )}
      </div>
    ),
    console: (
      <div>
        {consoleLogs.length > 0 ? (
          <div className="space-y-1">
            {consoleLogs.map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-2 px-3 py-2 rounded-lg bg-surface border border-border-subtle font-mono text-xs"
              >
                <span
                  className={cn(
                    "shrink-0 font-bold",
                    (item.metadata?.level as string) === "error"
                      ? "text-critical"
                      : (item.metadata?.level as string) === "warn"
                      ? "text-accent"
                      : "text-text-tertiary"
                  )}
                >
                  {(item.metadata?.level as string)?.toUpperCase() || "LOG"}
                </span>
                <span className="text-text-secondary">
                  {(item.metadata?.message as string) || item.storageKey}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-text-tertiary">
            <Terminal className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No console logs captured</p>
          </div>
        )}
      </div>
    ),
  };

  return (
    <div className={cn("", className)}>
      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 rounded-xl bg-surface border border-border-subtle mb-4 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
              activeTab === tab.key
                ? "bg-surface-elevated text-text-primary shadow-sm"
                : "text-text-tertiary hover:text-text-secondary"
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <Card padding="none" className="border-border-subtle">
        <div className="p-4">{tabContent[activeTab]}</div>
      </Card>
    </div>
  );
}
