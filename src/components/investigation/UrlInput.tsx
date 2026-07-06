"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Link, Check, AlertTriangle, ShieldOff, Loader2, X } from "lucide-react";

type ValidationState =
  | "idle"
  | "validating"
  | "valid"
  | "invalid"
  | "ssrf_blocked";

interface UrlInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  validationState?: ValidationState;
  disabled?: boolean;
  className?: string;
  autoFocus?: boolean;
}

const validationConfig: Record<
  ValidationState,
  {
    icon: React.ReactNode;
    message: string;
    borderColor: string;
  }
> = {
  idle: {
    icon: <Link className="h-4 w-4 text-text-tertiary" />,
    message: "Enter a URL to investigate",
    borderColor: "border-border-subtle focus-within:border-border-strong",
  },
  validating: {
    icon: <Loader2 className="h-4 w-4 text-accent animate-spin" />,
    message: "Validating URL...",
    borderColor: "border-accent/50 focus-within:border-accent",
  },
  valid: {
    icon: <Check className="h-4 w-4 text-success" />,
    message: "URL is valid",
    borderColor: "border-success/50 focus-within:border-success",
  },
  invalid: {
    icon: <AlertTriangle className="h-4 w-4 text-high" />,
    message: "Invalid URL format",
    borderColor: "border-high/50 focus-within:border-high",
  },
  ssrf_blocked: {
    icon: <ShieldOff className="h-4 w-4 text-critical" />,
    message: "URL blocked due to security policy",
    borderColor: "border-critical/50 focus-within:border-critical",
  },
};

export function UrlInput({
  value,
  onChange,
  onSubmit,
  validationState = "idle",
  disabled = false,
  className,
  autoFocus = false,
}: UrlInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [detectedPaste, setDetectedPaste] = useState(false);
  const config = validationConfig[validationState];

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const text = e.clipboardData.getData("text");
      if (text && (text.startsWith("http://") || text.startsWith("https://") || text.includes("."))) {
        setDetectedPaste(true);
        onChange(text);
        setTimeout(() => setDetectedPaste(false), 2000);
      }
    },
    [onChange]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && value.trim()) {
      onSubmit();
    }
    if (e.key === "Escape") {
      inputRef.current?.blur();
    }
  };

  return (
    <div className={cn("w-full", className)}>
      <div
        className={cn(
          "flex items-center gap-2 px-4 py-3 rounded-xl border bg-surface transition-all duration-200",
          config.borderColor,
          disabled && "opacity-50 pointer-events-none"
        )}
      >
        <span className="shrink-0">{config.icon}</span>
        <input
          ref={inputRef}
          type="url"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onPaste={handlePaste}
          onKeyDown={handleKeyDown}
          placeholder="https://example.com"
          disabled={disabled}
          autoComplete="off"
          spellCheck={false}
          className={cn(
            "flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-tertiary",
            "outline-none border-none focus:ring-0",
            "font-mono"
          )}
        />
        {value && !disabled && (
          <button
            onClick={() => onChange("")}
            className="shrink-0 text-text-tertiary hover:text-text-secondary transition-colors"
            aria-label="Clear input"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      <div className="flex items-center justify-between mt-1.5 px-1">
        <span
          className={cn(
            "text-xs transition-colors duration-200",
            validationState === "invalid" || validationState === "ssrf_blocked"
              ? "text-critical"
              : validationState === "valid"
              ? "text-success"
              : "text-text-tertiary"
          )}
        >
          {config.message}
        </span>
        {detectedPaste && (
          <span className="text-xs text-accent animate-fade-in">
            URL detected from clipboard
          </span>
        )}
      </div>
    </div>
  );
}
