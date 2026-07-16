import type { HTMLAttributes, ReactNode } from "react";

type PanelTone = "default" | "strong" | "quiet";

interface PanelProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode;
  className?: string;
  labelledBy?: string;
  tone?: PanelTone;
}

export function Panel({ children, className = "", labelledBy, tone = "default", ...rest }: PanelProps) {
  return (
    <section className={`panel panel-${tone} ${className}`} aria-labelledby={labelledBy} {...rest}>
      {children}
    </section>
  );
}