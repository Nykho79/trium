import type { ReactNode } from "react";

type PanelTone = "default" | "strong" | "quiet";

interface PanelProps {
  children: ReactNode;
  className?: string;
  labelledBy?: string;
  tone?: PanelTone;
}

export function Panel({ children, className = "", labelledBy, tone = "default" }: PanelProps) {
  return (
    <section className={`panel panel-${tone} ${className}`} aria-labelledby={labelledBy}>
      {children}
    </section>
  );
}