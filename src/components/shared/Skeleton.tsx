import { cn } from "@/lib/utils";

type SkeletonVariant = "text" | "card" | "circle" | "thumbnail";

interface SkeletonProps {
  variant?: SkeletonVariant;
  className?: string;
}

const variantStyles: Record<SkeletonVariant, string> = {
  text: "h-4 w-full rounded-md",
  card: "h-32 w-full rounded-xl",
  circle: "h-10 w-10 rounded-full",
  thumbnail: "h-20 w-36 rounded-lg",
};

export function Skeleton({ variant = "text", className }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-shimmer bg-gradient-to-r from-surface-elevated via-surface-overlay to-surface-elevated bg-[length:200%_100%]",
        variantStyles[variant],
        className
      )}
      aria-hidden="true"
    />
  );
}
