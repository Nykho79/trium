import { motion } from "framer-motion";
import { Icon } from "./Icon";

interface TimerProps {
  remainingMs: number;
  totalMs: number;
  label?: string;
}

function formatTime(ms: number): string {
  const safeMs = Math.max(0, ms);
  const totalSeconds = Math.ceil(safeMs / 1000);
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export function Timer({ remainingMs, totalMs, label = "Chrono" }: TimerProps) {
  const safeRemainingMs = Math.max(0, remainingMs);
  const ratio = totalMs <= 0 ? 0 : safeRemainingMs / totalMs;
  const percent = Math.max(0, Math.min(100, ratio * 100));
  const isExpired = safeRemainingMs <= 0;
  const isCritical = !isExpired && safeRemainingMs <= 10_000;
  const urgency = isExpired ? "expired" : isCritical ? "danger" : ratio <= 0.5 ? "warning" : "steady";
  const accessibleLabel = isExpired ? `${label} termine` : `${label} ${formatTime(safeRemainingMs)}`;

  return (
    <motion.div
      className={`timer timer-${urgency}`}
      role="timer"
      aria-label={accessibleLabel}
      aria-live={isCritical || isExpired ? "assertive" : "polite"}
      data-testid="game-timer"
      layout
    >
      <div className="timer-main">
        <Icon name="timer" />
        <span>{isExpired ? "Temps ecoule" : label}</span>
        <strong>{formatTime(safeRemainingMs)}</strong>
      </div>
      <div className="timer-track" aria-hidden="true">
        <span style={{ width: `${percent}%` }} />
      </div>
      {isCritical ? <em>Moins de 10 secondes</em> : null}
    </motion.div>
  );
}
