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
  const ratio = totalMs <= 0 ? 0 : remainingMs / totalMs;
  const urgency = ratio <= 0.25 ? "danger" : ratio <= 0.5 ? "warning" : "steady";
  return (
    <motion.div className={`timer timer-${urgency}`} aria-label={`${label} ${formatTime(remainingMs)}`} layout>
      <Icon name="timer" />
      <span>{label}</span>
      <strong>{formatTime(remainingMs)}</strong>
    </motion.div>
  );
}