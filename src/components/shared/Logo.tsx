import React from "react";
import { cn } from "@/lib/utils";
import { Search } from "lucide-react";

interface LogoProps {
  className?: string;
  size?: "sm" | "default" | "lg";
  showText?: boolean;
}

const sizeMap = {
  sm: { icon: 18, text: "text-lg" },
  default: { icon: 24, text: "text-2xl" },
  lg: { icon: 32, text: "text-3xl" },
};

export function Logo({ className, size = "default", showText = true }: LogoProps) {
  const s = sizeMap[size];
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div className="relative flex items-center justify-center">
        <div className="absolute inset-0 bg-accent/10 rounded-lg blur-sm" />
        <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-accent/15 border border-accent/20">
          <Search className="text-accent" size={s.icon * 0.65} strokeWidth={2.5} />
        </div>
      </div>
      {showText && (
        <span className={cn("font-semibold tracking-tight text-text-primary font-display", s.text)}>
          Marten
        </span>
      )}
    </div>
  );
}
