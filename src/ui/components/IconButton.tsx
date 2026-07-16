import type { ButtonHTMLAttributes } from "react";
import { useAudioStore } from "../../app/store/audioStore";
import { useSettingsStore } from "../../app/store/settingsStore";
import { playUiClick } from "../audio/soundManager";
import { Icon, type IconName } from "./Icon";

interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  icon: IconName;
  label: string;
  selected?: boolean;
}

export function IconButton({ icon, label, selected = false, className = "", onClick, ...props }: IconButtonProps) {
  const soundEnabled = useSettingsStore((state) => state.soundEnabled);
  const masterMuted = useAudioStore((state) => state.masterMuted);
  return (
    <button
      type="button"
      className={`icon-button ${selected ? "is-selected" : ""} ${className}`}
      aria-label={label}
      title={label}
      onClick={(event) => {
        playUiClick(soundEnabled && !masterMuted);
        onClick?.(event);
      }}
      {...props}
    >
      <Icon name={icon} />
    </button>
  );
}