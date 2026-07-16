export type PlayerId = "player-1" | "player-2" | "player-3";
export type PlayerColor = "cyan" | "amber" | "magenta";
export type PlayerMode = "solo" | "trio";

export interface Player {
  id: PlayerId;
  name: string;
  color: PlayerColor;
  ready: boolean;
}

export type PlayerRoster = [Player] | [Player, Player, Player];