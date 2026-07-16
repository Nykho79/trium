import type { ButtonHTMLAttributes, ReactNode } from "react";
import { useAudioStore } from "../../app/store/audioStore";
import { useSettingsStore } from "../../app/store/settingsStore";
import { playUiClick } from "../audio/soundManager";
import { Icon, type IconName } from "./Icon";

type ButtonVariant = "primary" | "secondary" | "ghost" | "answer" | "danger";
type ButtonSize = "standard" | "large" | "compact";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconName;
  selected?: boolean;
}

const variantClassNames: Record<ButtonVariant, string> = {
  primary: "btn btn-primary",
  secondary: "btn btn-secondary",
  ghost: "btn btn-ghost",
  answer: "btn answer-button",
  danger: "btn btn-danger",
};

const sizeClassNames: Record<ButtonSize, string> = {
  standard: "btn-standard",
  large: "btn-large",
  compact: "btn-compact",
};

export function Button({ children, variant = "secondary", size = "standard", icon, selected = false, onClick, className = "", ...props }: ButtonProps) {
  const soundEnabled = useSettingsStore((state) => state.soundEnabled);
  const masterMuted = useAudioStore((state) => state.masterMuted);
  return (
    <button
      className={`${variantClassNames[variant]} ${sizeClassNames[size]} ${selected ? "is-selected" : ""} ${className}`}
      onClick={(event) => {
        playUiClick(soundEnabled && !masterMuted);
        onClick?.(event);
      }}
      {...props}
    >
      {icon ? <Icon name={icon} /> : null}
      {children}
    </button>
  );
}