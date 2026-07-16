import type { ButtonHTMLAttributes, ReactNode } from "react";
import { playUiClick } from "../audio/soundManager";
import { useGameStore } from "../../app/store/gameStore";

type ButtonVariant = "primary" | "secondary" | "ghost" | "answer";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: ButtonVariant;
  selected?: boolean;
}

const variantClassNames: Record<ButtonVariant, string> = {
  primary: "btn btn-primary",
  secondary: "btn btn-secondary",
  ghost: "btn btn-ghost",
  answer: "btn answer-button",
};

export function Button({ children, variant = "secondary", selected = false, onClick, className = "", ...props }: ButtonProps) {
  const soundEnabled = useGameStore((state) => state.soundEnabled);
  return (
    <button
      className={`${variantClassNames[variant]} ${selected ? "is-selected" : ""} ${className}`}
      onClick={(event) => {
        playUiClick(soundEnabled);
        onClick?.(event);
      }}
      {...props}
    >
      {children}
    </button>
  );
}
