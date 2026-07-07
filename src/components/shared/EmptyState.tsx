import React from "react";
import { cn } from "@/lib/utils";
import { Button } from "./Button";

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-16 px-8 text-center",
        className
      )}
    >
      <div className="mb-4 text-text-tertiary">{icon}</div>
      <h3 className="text-base font-semibold text-text-primary mb-1 font-display">
        {title}
      </h3>
      {description && (
        <p className="text-sm text-text-secondary max-w-sm mb-6">
          {description}
        </p>
      )}
      {action && (
        <Button variant="secondary" size="sm" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}
