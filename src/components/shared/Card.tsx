import React from "react";
import { cn } from "@/lib/utils";

type CardPadding = "none" | "sm" | "default" | "lg";

interface CardProps {
  className?: string;
  children: React.ReactNode;
  padding?: CardPadding;
  header?: React.ReactNode;
}

const paddingStyles: Record<CardPadding, string> = {
  none: "",
  sm: "p-3",
  default: "p-4",
  lg: "p-6",
};

export function Card({
  className,
  children,
  padding = "default",
  header,
}: CardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border-subtle bg-surface overflow-hidden",
        className
      )}
    >
      {header && (
        <div className="px-4 py-3 border-b border-border-subtle bg-surface-elevated/50">
          {header}
        </div>
      )}
      <div className={cn(paddingStyles[padding])}>{children}</div>
    </div>
  );
}
