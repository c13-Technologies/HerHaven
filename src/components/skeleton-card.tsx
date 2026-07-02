import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Card-shaped loading placeholder with a soft shimmer overlay that
 * sweeps across the surface. Use instead of a plain `animate-pulse`
 * skeleton group for a calmer, more refined loading state.
 *
 * Will not animate for users who prefer reduced motion.
 */
export function SkeletonCard({ children, className, ...rest }: { children: ReactNode } & HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...rest}
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border bg-card",
        className,
      )}
    >
      {/* Inner content — suppress built-in pulse so shimmer is the only animation */}
      <div className="relative [&_[data-skel]]:animate-none">{children}</div>
      {/* Shimmer overlay */}
      <div className="skeleton-shimmer" aria-hidden="true" />
    </div>
  );
}

/**
 * Static placeholder bar to use inside a <SkeletonCard>. Pair with
 * `data-skel` on the bar so the wrapper suppresses the default pulse.
 */
export function SkeletonBar({
  className,
  ...rest
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...rest}
      data-skel=""
      className={cn("rounded-md bg-primary/10 dark:bg-foreground/10", className)}
    />
  );
}
