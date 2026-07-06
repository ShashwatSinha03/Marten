"use client";

import React, { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/shared";
import { Download, Link2, FileText, FileCode, Check, ChevronDown } from "lucide-react";

interface ExportMenuProps {
  onCopyShareLink: () => void;
  onExportPdf: () => void;
  onExportMarkdown: () => void;
  className?: string;
}

export function ExportMenu({
  onCopyShareLink,
  onExportPdf,
  onExportMarkdown,
  className,
}: ExportMenuProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleCopyLink = () => {
    onCopyShareLink();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    setOpen(false);
  };

  const items = [
    {
      label: "Copy Share Link",
      icon: copied ? <Check className="h-4 w-4 text-success" /> : <Link2 className="h-4 w-4" />,
      onClick: handleCopyLink,
    },
    {
      label: "Export PDF",
      icon: <FileText className="h-4 w-4" />,
      onClick: () => {
        onExportPdf();
        setOpen(false);
      },
    },
    {
      label: "Export Markdown",
      icon: <FileCode className="h-4 w-4" />,
      onClick: () => {
        onExportMarkdown();
        setOpen(false);
      },
    },
  ];

  return (
    <div ref={menuRef} className={cn("relative", className)}>
      <Button
        variant="secondary"
        size="sm"
        icon={<Download className="h-3.5 w-3.5" />}
        onClick={() => setOpen(!open)}
      >
        Export
        <ChevronDown className={cn("h-3 w-3 transition-transform", open && "rotate-180")} />
      </Button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-48 rounded-xl border border-border-subtle bg-surface-overlay shadow-xl overflow-hidden z-50 animate-scale-in">
          {items.map((item) => (
            <button
              key={item.label}
              onClick={item.onClick}
              className="flex items-center gap-2.5 w-full px-3 py-2.5 text-sm text-text-secondary hover:text-text-primary hover:bg-surface-elevated transition-colors"
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
