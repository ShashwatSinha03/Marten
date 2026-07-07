"use client";

import React, { useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import type { GraphNode, GraphEdge } from "@/types";
import { Shuffle } from "lucide-react";

interface BuildingGraphPhaseProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  className?: string;
}

const nodeColors: Record<string, string> = {
  screen: "#6366f1",
  component: "#0ea5e9",
  interaction: "#8b5cf6",
  effect: "#10b981",
};

export function BuildingGraphPhase({
  nodes,
  edges,
  className,
}: BuildingGraphPhaseProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || nodes.length === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;

    // Clear
    ctx.clearRect(0, 0, w, h);

    // Background — warm dark brown (marten fur)
    ctx.fillStyle = "#120e0a";
    ctx.fillRect(0, 0, w, h);

    if (nodes.length === 0) return;

    // Layout nodes in a circle
    const cx = w / 2;
    const cy = h / 2;
    const radius = Math.min(w, h) * 0.3;

    const positions = nodes.map((node, i) => {
      const angle = (i / nodes.length) * Math.PI * 2 - Math.PI / 2;
      return {
        x: cx + radius * Math.cos(angle),
        y: cy + radius * Math.sin(angle),
        node,
      };
    });

    // Draw edges
    edges.forEach((edge) => {
      const source = positions.find((p) => p.node.id === edge.source);
      const target = positions.find((p) => p.node.id === edge.target);
      if (!source || !target) return;

      ctx.beginPath();
      ctx.moveTo(source.x, source.y);
      ctx.lineTo(target.x, target.y);
      ctx.strokeStyle = "rgba(64, 52, 43, 0.6)";
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    // Draw nodes
    positions.forEach(({ x, y, node }) => {
      const color = nodeColors[node.type] || "#6366f1";
      const nodeRadius = Math.max(6, 12 - node.priority * 1.5);

      // Glow
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, nodeRadius * 3);
      gradient.addColorStop(0, `${color}25`);
      gradient.addColorStop(1, "transparent");
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, nodeRadius * 3, 0, Math.PI * 2);
      ctx.fill();

      // Node circle
      ctx.beginPath();
      ctx.arc(x, y, nodeRadius, 0, Math.PI * 2);
      ctx.fillStyle = `${color}30`;
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Label
      ctx.fillStyle = "#c4b5a5";
      ctx.font = "10px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(node.label, x, y + nodeRadius + 14);
    });
  }, [nodes, edges]);

  return (
    <div className={cn("flex flex-col h-full", className)}>
      <div className="flex items-center gap-2 px-1 pb-3">
        <Shuffle className="h-4 w-4 text-accent" />
        <h2 className="text-sm font-semibold text-text-primary font-display">
          Building Product Graph
        </h2>
        <span className="text-xs text-text-tertiary font-mono">
          {nodes.length} nodes · {edges.length} edges
        </span>
      </div>

      <div className="flex-1 relative rounded-xl border border-border-subtle overflow-hidden bg-surface">
        <canvas
          ref={canvasRef}
          className="w-full h-full"
          style={{ minHeight: "300px" }}
        />
        {nodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <span className="animate-pulse-soft text-accent">●</span>
                <span className="text-sm text-text-tertiary">
                  Building graph...
                </span>
              </div>
              <div className="w-32 h-1 bg-surface-elevated rounded-full overflow-hidden mx-auto">
                <div className="h-full bg-accent/50 rounded-full animate-shimmer" />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
