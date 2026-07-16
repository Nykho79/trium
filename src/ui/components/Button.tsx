import type { ButtonHTMLAttributes, ReactNode } from "react";
import { useAudioStore } from "../../app/store/audioStore";
import { useSettingsStore } from "../../app/store/settingsStore";
import { playUiClick } from "../audio/soundManager";

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
  const soundEnabled = useSettingsStore((state) => state.soundEnabled);
  const masterMuted = useAudioStore((state) => state.masterMuted);
  return (
    <button
      className={`${variantClassNames[variant]} ${selected ? "is-selected" : ""} ${className}`}
      onClick={(event) => {
        playUiClick(soundEnabled && !masterMuted);
        onClick?.(event);
      }}
      {...props}
    >
      {children}
    </button>
  );
}