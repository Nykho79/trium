import type { ReactNode } from "react";

interface PanelProps {
  children: ReactNode;
  className?: string;
  labelledBy?: string;
}

export function Panel({ children, className = "", labelledBy }: PanelProps) {
  return (
    <section className={`panel ${className}`} aria-labelledby={labelledBy}>
      {children}
    </section>
  );
}
