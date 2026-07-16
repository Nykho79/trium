import type { ButtonHTMLAttributes } from "react";
import { motion } from "framer-motion";
import { Icon, type IconName } from "./Icon";

interface JokerButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  remaining: number;
  icon?: IconName;
  active?: boolean;
}

export function JokerButton({ label, remaining, icon = "joker", active = false, className = "", ...props }: JokerButtonProps) {
  const unavailable = remaining <= 0 || props.disabled === true;
  return (
    <motion.div whileTap={{ scale: unavailable ? 1 : 0.98 }}>
      <button
        type="button"
        className={`joker-button ${active ? "is-active" : ""} ${className}`}
        disabled={unavailable}
        {...props}
      >
        <Icon name={icon} />
        <span>{label}</span>
        <strong>{remaining}</strong>
      </button>
    </motion.div>
  );
}