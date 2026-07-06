import { cn } from "@/lib/utils";

type BadgeVariant =
  | "critical"
  | "high"
  | "medium"
  | "low"
  | "info"
  | "success"
  | "default";
type BadgeSize = "sm" | "default";

interface BadgeProps {
  variant?: BadgeVariant;
  size?: BadgeSize;
  children: React.ReactNode;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  critical: "bg-critical/15 text-critical border-critical/25",
  high: "bg-high/15 text-high border-high/25",
  medium: "bg-medium/15 text-medium border-medium/25",
  low: "bg-low/15 text-low border-low/25",
  info: "bg-info/15 text-info border-info/25",
  success: "bg-success/15 text-success border-success/25",
  default: "bg-surface-elevated text-text-secondary border-border-subtle",
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: "px-1.5 py-0.5 text-[10px] leading-[14px]",
  default: "px-2.5 py-0.5 text-xs",
};

export function Badge({
  variant = "default",
  size = "default",
  children,
  className,
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-medium border",
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
    >
      {children}
    </span>
  );
}
