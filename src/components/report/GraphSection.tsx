"use client";

import React, { useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import type { GraphNode, GraphEdge } from "@/types";

interface GraphSectionProps {
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

export function GraphSection({ nodes, edges, className }: GraphSectionProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || nodes.length === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#111113";
    ctx.fillRect(0, 0, w, h);

    // Layout
    const cx = w / 2;
    const cy = h / 2;
    const radius = Math.min(w, h) * 0.32;

    const positions = nodes.map((node, i) => {
      const angle = (i / nodes.length) * Math.PI * 2 - Math.PI / 2;
      return {
        x: cx + radius * Math.cos(angle),
        y: cy + radius * Math.sin(angle),
        node,
      };
    });

    // Edges
    edges.forEach((edge) => {
      const src = positions.find((p) => p.node.id === edge.source);
      const tgt = positions.find((p) => p.node.id === edge.target);
      if (!src || !tgt) return;

      ctx.beginPath();
      ctx.moveTo(src.x, src.y);
      ctx.lineTo(tgt.x, tgt.y);
      ctx.strokeStyle = "rgba(45, 45, 50, 0.6)";
      ctx.lineWidth = 1;
      ctx.stroke();

      // Arrow
      const angle = Math.atan2(tgt.y - src.y, tgt.x - src.x);
      const arrowSize = 6;
      ctx.beginPath();
      ctx.moveTo(tgt.x, tgt.y);
      ctx.lineTo(
        tgt.x - arrowSize * Math.cos(angle - 0.3),
        tgt.y - arrowSize * Math.sin(angle - 0.3)
      );
      ctx.lineTo(
        tgt.x - arrowSize * Math.cos(angle + 0.3),
        tgt.y - arrowSize * Math.sin(angle + 0.3)
      );
      ctx.closePath();
      ctx.fillStyle = "rgba(45, 45, 50, 0.6)";
      ctx.fill();
    });

    // Nodes
    positions.forEach(({ x, y, node }) => {
      const color = nodeColors[node.type] || "#6366f1";
      const nodeRadius = Math.max(5, 11 - node.priority * 1.2);

      // Glow
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, nodeRadius * 4);
      gradient.addColorStop(0, `${color}20`);
      gradient.addColorStop(1, "transparent");
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, nodeRadius * 4, 0, Math.PI * 2);
      ctx.fill();

      // Node
      ctx.beginPath();
      ctx.arc(x, y, nodeRadius, 0, Math.PI * 2);
      ctx.fillStyle = `${color}25`;
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Label
      ctx.fillStyle = "#a1a1a0";
      ctx.font = "9px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(node.label, x, y + nodeRadius + 12);
    });
  }, [nodes, edges]);

  if (nodes.length === 0) {
    return (
      <div className={cn("rounded-xl border border-border-subtle bg-surface p-8 text-center", className)}>
        <p className="text-sm text-text-tertiary">No graph data available</p>
      </div>
    );
  }

  return (
    <div className={cn("", className)}>
      <div className="flex items-center gap-2 mb-3">
        <h3 className="text-sm font-semibold text-text-primary">
          Product Graph
        </h3>
        <span className="text-xs text-text-tertiary font-mono">
          {nodes.length} nodes · {edges.length} edges
        </span>
      </div>
      <div className="rounded-xl border border-border-subtle overflow-hidden">
        <canvas
          ref={canvasRef}
          className="w-full"
          style={{ height: "400px" }}
        />
      </div>
    </div>
  );
}
