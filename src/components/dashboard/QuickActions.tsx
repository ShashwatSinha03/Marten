"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Button, Card } from "@/components/shared";
import { Plus, Zap, Globe } from "lucide-react";

interface QuickActionsProps {
  onNewInvestigation: () => void;
  onSampleUrl: (url: string) => void;
  className?: string;
}

const sampleUrls = [
  {
    label: "Landing Page",
    url: "https://example.com",
    icon: <Globe className="h-4 w-4" />,
  },
  {
    label: "SaaS Dashboard",
    url: "https://example.com/dashboard",
    icon: <Zap className="h-4 w-4" />,
  },
];

export function QuickActions({
  onNewInvestigation,
  onSampleUrl,
  className,
}: QuickActionsProps) {
  return (
    <Card className={cn("", className)}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-text-primary font-display">
            Quick Actions
          </h2>
          <p className="text-xs text-text-secondary mt-0.5">
            Start a new investigation or try a sample URL
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          icon={<Plus className="h-4 w-4" />}
          onClick={onNewInvestigation}
        >
          New Investigation
        </Button>
      </div>

      <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border-subtle">
        <span className="text-xs text-text-tertiary mr-1">Try sample:</span>
        {sampleUrls.map((sample) => (
          <button
            key={sample.label}
            onClick={() => onSampleUrl(sample.url)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-text-secondary hover:text-text-primary bg-surface-elevated hover:bg-surface-overlay border border-border-subtle transition-colors"
          >
            {sample.icon}
            {sample.label}
          </button>
        ))}
      </div>
    </Card>
  );
}
