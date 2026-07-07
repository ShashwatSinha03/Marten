"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/shared";
import { X, Link2, Check, Copy, ShieldOff } from "lucide-react";

interface ShareDialogProps {
  open: boolean;
  onClose: () => void;
  shareUrl: string;
  onRevoke: () => void;
}

export function ShareDialog({
  open,
  onClose,
  shareUrl,
  onRevoke,
}: ShareDialogProps) {
  const [copied, setCopied] = useState(false);

  if (!open) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API not available
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md rounded-2xl border border-border-subtle bg-surface-overlay shadow-2xl animate-scale-in">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
          <div className="flex items-center gap-2.5">
            <Link2 className="h-5 w-5 text-accent" />
            <h2 className="text-sm font-semibold text-text-primary font-display">
              Share Report
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-text-tertiary hover:text-text-primary transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-4">
          <p className="text-xs text-text-secondary mb-3">
            Anyone with this link can view the investigation report.
          </p>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-surface border border-border-subtle">
            <input
              type="text"
              value={shareUrl}
              readOnly
              className="flex-1 bg-transparent text-xs text-text-primary font-mono outline-none"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              icon={
                copied ? (
                  <Check className="h-3.5 w-3.5 text-success" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )
              }
            >
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between px-5 py-3 border-t border-border-subtle bg-surface/50">
          <button
            onClick={() => {
              onRevoke();
              onClose();
            }}
            className="flex items-center gap-1.5 text-xs text-text-tertiary hover:text-critical transition-colors"
          >
            <ShieldOff className="h-3.5 w-3.5" />
            Revoke share link
          </button>
          <Button variant="primary" size="sm" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}
