import React from "react";
import { cn } from "@/lib/utils";

interface ReportContainerProps {
  children: React.ReactNode;
  className?: string;
}

export function ReportContainer({ children, className }: ReportContainerProps) {
  return (
    <div className={cn("max-w-5xl mx-auto px-6 py-10", className)}>
      {children}
    </div>
  );
}
