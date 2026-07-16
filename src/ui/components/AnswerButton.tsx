import type { ButtonHTMLAttributes } from "react";
import { motion } from "framer-motion";
import { Button } from "./Button";

type AnswerState = "idle" | "selected" | "correct" | "incorrect" | "disabled";

interface AnswerButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  answerId: string;
  label: string;
  state?: AnswerState;
}

export function AnswerButton({ answerId, label, state = "idle", className = "", ...props }: AnswerButtonProps) {
  return (
    <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
      <Button
        variant="answer"
        selected={state === "selected" || state === "correct"}
        className={`answer-state-${state} ${className}`}
        aria-pressed={state === "selected"}
        disabled={state === "disabled" || props.disabled}
        {...props}
      >
        <span className="answer-letter">{answerId.toUpperCase()}</span>
        <span className="answer-label">{label}</span>
      </Button>
    </motion.div>
  );
}