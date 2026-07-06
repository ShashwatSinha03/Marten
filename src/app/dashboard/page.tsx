"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Logo, Button } from "@/components/shared";
import { InvestigationHistory } from "@/components/dashboard/InvestigationHistory";
import { QuickActions } from "@/components/dashboard/QuickActions";

// Placeholder data — in production this would come from an API
const placeholderInvestigations = [
  {
    id: "1",
    url: "https://example.com/ai-dashboard",
    status: "complete" as const,
    depth: "standard" as const,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    findingCount: 12,
  },
  {
    id: "2",
    url: "https://samples.vercel.app/ai-landing",
    status: "complete" as const,
    depth: "quick" as const,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    findingCount: 5,
  },
  {
    id: "3",
    url: "https://another-test-site.com/form",
    status: "failed" as const,
    depth: "standard" as const,
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    findingCount: 0,
  },
];

export default function DashboardPage() {
  const router = useRouter();
  const [investigations] = useState(placeholderInvestigations);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-border-subtle">
        <Logo />
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/")}
          >
            Home
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => router.push("/investigate")}
            icon={<span className="text-lg leading-none">+</span>}
          >
            New Investigation
          </Button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-6 py-8">
        <QuickActions
          className="mb-8"
          onNewInvestigation={() => router.push("/investigate")}
          onSampleUrl={(url) => {
            // In production, this would pre-fill and start an investigation
            router.push("/investigate");
          }}
        />

        <InvestigationHistory
          investigations={investigations}
          onRerun={(id) => router.push(`/investigate/${id}`)}
          onShare={(id) => {
            // In production, this would open the share dialog
            console.log("Share investigation", id);
          }}
          onDelete={(id) => {
            // In production, this would call the API
            console.log("Delete investigation", id);
          }}
        />
      </main>
    </div>
  );
}
