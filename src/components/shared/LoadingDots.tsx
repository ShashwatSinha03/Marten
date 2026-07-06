import React from "react";
import { cn } from "@/lib/utils";

interface LoadingDotsProps {
  className?: string;
  size?: "sm" | "default";
}

const sizeStyles = {
  sm: "h-1 w-1",
  default: "h-1.5 w-1.5",
};

export function LoadingDots({ className, size = "default" }: LoadingDotsProps) {
  return (
    <div className={cn("flex items-center gap-1", className)} aria-label="Loading">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={cn(
            "rounded-full bg-current animate-pulse-soft",
            sizeStyles[size]
          )}
          style={{ animationDelay: `${i * 0.2}s` }}
        />
      ))}
    </div>
  );
}
