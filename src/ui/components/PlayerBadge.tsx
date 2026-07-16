import type { Player } from "../../core/types";
import { Icon } from "./Icon";

interface PlayerBadgeProps {
  player: Player;
  isCaptain?: boolean;
}

export function PlayerBadge({ player, isCaptain = false }: PlayerBadgeProps) {
  return (
    <span className={`player-badge player-${player.color} ${isCaptain ? "is-captain" : ""}`}>
      <Icon name={isCaptain ? "captain" : "team"} />
      <strong>{player.name}</strong>
    </span>
  );
}