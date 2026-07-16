import type { GameFormat } from "../types";

export const REQUIRED_PLAYER_COUNT = 3;

export const STANDARD_FORMAT: GameFormat = {
  id: "standard-local",
  label: "Format classique",
  description: "Une partie locale ÃƒÂ©quilibrÃƒÂ©e pour dÃƒÂ©couvrir les sept manches de TRIUM.",
  roundOrder: [
    "knowledge-grid",
    "clue-race",
    "pressure-choice",
    "synapse",
    "connections",
    "wager",
    "final-convergence",
  ],
  questionCountByRound: {
    "knowledge-grid": 8,
    "clue-race": 5,
    "pressure-choice": 5,
    synapse: 6,
    connections: 3,
    wager: 3,
    "final-convergence": 5,
  },
};
