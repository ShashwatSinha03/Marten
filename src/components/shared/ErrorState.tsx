"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Button } from "./Button";
import { AlertTriangle, WifiOff, RefreshCw, Frown } from "lucide-react";

type ErrorType = "connection_lost" | "phase_failed" | "partial";

interface ErrorStateProps {
  title: string;
  message: string;
  type?: ErrorType;
  onRetry?: () => void;
  className?: string;
}

const errorIcons: Record<ErrorType, React.ReactNode> = {
  connection_lost: <WifiOff className="h-8 w-8" />,
  phase_failed: <AlertTriangle className="h-8 w-8" />,
  partial: <Frown className="h-8 w-8" />,
};

export function ErrorState({
  title,
  message,
  type = "phase_failed",
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-16 px-8 text-center",
        className
      )}
    >
      <div className="mb-4 text-critical/70">{errorIcons[type]}</div>
      <h3 className="text-base font-semibold text-text-primary mb-1">
        {title}
      </h3>
      <p className="text-sm text-text-secondary max-w-sm mb-6">{message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" icon={<RefreshCw className="h-3.5 w-3.5" />} onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  );
}
