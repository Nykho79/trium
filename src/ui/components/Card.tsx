import type { ReactNode } from "react";

type CardAccent = "cyan" | "amber" | "violet" | "neutral";

interface CardProps {
  children: ReactNode;
  accent?: CardAccent;
  className?: string;
  labelledBy?: string;
}

export function Card({ children, accent = "neutral", className = "", labelledBy }: CardProps) {
  return (
    <article className={`ds-card ds-card-${accent} ${className}`} aria-labelledby={labelledBy}>
      {children}
    </article>
  );
}