"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Logo, Button } from "@/components/shared";
import { UrlInput } from "@/components/investigation/UrlInput";
import { DepthSelector } from "@/components/investigation/DepthSelector";
import { useInvestigation } from "@/components/live-viewer";
import type { InvestigationDepth } from "@/types";
import { Search, GitBranch, FileText, Shield, ArrowUpRight } from "lucide-react";

function LandingContent() {
  const router = useRouter();
  const { startInvestigation } = useInvestigation();
  const [url, setUrl] = useState("");
  const [depth, setDepth] = useState<InvestigationDepth>("quick");

  const handleSubmit = () => {
    if (!url.trim()) return;
    const normalizedUrl = url.startsWith("http") ? url : `https://${url}`;
    startInvestigation(normalizedUrl, depth);
    router.push("/investigate");
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-border-subtle">
        <Logo />
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/sign-in")}
          >
            Sign In
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => router.push("/dashboard")}
          >
            Dashboard
          </Button>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="max-w-2xl w-full text-center">
          <div className="mb-6 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/5 border border-accent/10 text-xs text-accent">
            <Shield className="h-3 w-3" />
            AI-generated UI Investigation Platform
          </div>

          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-text-primary mb-4 leading-tight font-display">
            Investigate
            <br />
            <span className="text-accent">AI-generated UIs</span>
          </h1>

          <p className="text-base text-text-secondary max-w-lg mx-auto mb-10 leading-relaxed">
            Point Marten at any AI-built interface and get a comprehensive
            investigation report — live evidence collection, product graph
            analysis, and actionable findings.
          </p>

          {/* URL Input */}
          <div className="max-w-xl mx-auto mb-4">
            <UrlInput
              value={url}
              onChange={setUrl}
              onSubmit={handleSubmit}
              autoFocus
            />
          </div>

          <div className="flex items-center justify-center gap-4">
            <DepthSelector value={depth} onChange={setDepth} />
            <Button
              variant="primary"
              size="default"
              onClick={handleSubmit}
              disabled={!url.trim()}
              icon={<ArrowUpRight className="h-4 w-4" />}
            >
              Investigate
            </Button>
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl w-full mt-16 mb-8">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="p-4 rounded-xl border border-border-subtle bg-surface hover:border-border-strong transition-colors"
            >
              <div className="w-9 h-9 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center mb-3">
                {feature.icon}
              </div>
              <h3 className="text-sm font-semibold text-text-primary mb-1 font-display">
                {feature.title}
              </h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border-subtle px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between text-xs text-text-tertiary">
          <span>Marten — Investigation Platform</span>
          <div className="flex items-center gap-4">
            <span>Built for modern AI interfaces</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function LandingPage() {
  return <LandingContent />;
}

const features = [
  {
    title: "Live Investigation",
    description:
      "Watch in real-time as Marten collects screenshots, DOM snapshots, network logs, and console output.",
    icon: <Search className="h-4 w-4 text-accent" />,
  },
  {
    title: "Product Graph",
    description:
      "Auto-generate a visual graph of screens, components, interactions, and effects in the target UI.",
    icon: <GitBranch className="h-4 w-4 text-accent" />,
  },
  {
    title: "Shareable Reports",
    description:
      "Get detailed reports with severity-graded findings, evidence galleries, and exportable formats.",
    icon: <FileText className="h-4 w-4 text-accent" />,
  },
];
