import type { ReactNode } from "react";

type BadgeTone = "cyan" | "amber" | "violet" | "success" | "danger" | "neutral";

interface BadgeProps {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
}

export function Badge({ children, tone = "neutral", className = "" }: BadgeProps) {
  return <span className={`badge badge-${tone} ${className}`}>{children}</span>;
}