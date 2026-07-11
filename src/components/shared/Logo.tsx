import React from "react";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: "sm" | "default" | "lg";
}

const sizeMap = {
  sm: "text-lg",
  default: "text-2xl",
  lg: "text-3xl",
};

export function Logo({ className, size = "default" }: LogoProps) {
  return (
    <span
      className={cn(
        "font-semibold tracking-tight text-text-primary font-display",
        sizeMap[size],
        className,
      )}
    >
      Marten
    </span>
  );
}
