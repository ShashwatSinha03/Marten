"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Wifi, WifiOff, RefreshCw } from "lucide-react";
import { LoadingDots } from "@/components/shared";

interface ConnectionStatusProps {
  status: "connected" | "reconnecting" | "disconnected";
  className?: string;
}

const statusConfig = {
  connected: {
    icon: <Wifi className="h-3 w-3" />,
    label: "Connected",
    color: "text-success",
  },
  reconnecting: {
    icon: <RefreshCw className="h-3 w-3 animate-spin" />,
    label: "Reconnecting",
    color: "text-accent",
  },
  disconnected: {
    icon: <WifiOff className="h-3 w-3" />,
    label: "Disconnected",
    color: "text-critical",
  },
};

export function ConnectionStatus({
  status,
  className,
}: ConnectionStatusProps) {
  const config = statusConfig[status];

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 text-[11px] font-medium",
        config.color,
        className
      )}
    >
      {config.icon}
      <span>{config.label}</span>
      {status === "reconnecting" && <LoadingDots size="sm" />}
    </div>
  );
}
