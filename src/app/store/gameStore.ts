import { create } from "zustand";
import { persist } from "zustand/middleware";
import { INITIAL_JOKERS } from "../../core/constants/scoring";
import { STANDARD_FORMAT } from "../../core/constants/game";
import type { AppScreen, GameSessionPreview, Player } from "../../core/types";

const DEFAULT_PLAYERS: [Player, Player, Player] = [
  { id: "player-1", name: "Joueur 1", color: "amber", ready: true },
  { id: "player-2", name: "Joueur 2", color: "cyan", ready: true },
  { id: "player-3", name: "Joueur 3", color: "magenta", ready: true },
];

const DEFAULT_SESSION: GameSessionPreview = {
  players: DEFAULT_PLAYERS,
  format: STANDARD_FORMAT,
  currentRoundKind: "pressure-choice",
  currentQuestionId: "pc-fr-001",
  usedQuestionIds: [],
  score: {
    teamScore: 1250,
    streak: 2,
    jokers: INITIAL_JOKERS,
  },
};

interface GameStoreState {
  screen: AppScreen;
  previousScreen: AppScreen;
  session: GameSessionPreview;
  selectedAnswerId: string | undefined;
  reducedMotion: boolean;
  soundEnabled: boolean;
  musicEnabled: boolean;
  navigate: (screen: AppScreen) => void;
  updatePlayerName: (playerIndex: 0 | 1 | 2, name: string) => void;
  selectAnswer: (answerId: string) => void;
  revealAnswer: () => void;
  resetDemo: () => void;
  toggleReducedMotion: () => void;
  toggleSound: () => void;
  toggleMusic: () => void;
}

export const useGameStore = create<GameStoreState>()(
  persist(
    (set) => ({
      screen: "home",
      previousScreen: "home",
      session: DEFAULT_SESSION,
      selectedAnswerId: undefined,
      reducedMotion: false,
      soundEnabled: true,
      musicEnabled: false,
      navigate: (screen) => set((state) => ({ previousScreen: state.screen, screen })),
      updatePlayerName: (playerIndex, name) => set((state) => {
        const players = [...state.session.players] as [Player, Player, Player];
        players[playerIndex] = { ...players[playerIndex], name: name.trim() || `Joueur ${playerIndex + 1}` };
        return { session: { ...state.session, players } };
      }),
      selectAnswer: (answerId) => set({ selectedAnswerId: answerId }),
      revealAnswer: () => set((state) => ({
        screen: "question-transition",
        session: {
          ...state.session,
          usedQuestionIds: state.session.currentQuestionId
            ? [...new Set([...state.session.usedQuestionIds, state.session.currentQuestionId])]
            : state.session.usedQuestionIds,
          score: {
            ...state.session.score,
            teamScore: state.selectedAnswerId === "a" ? state.session.score.teamScore + 200 : state.session.score.teamScore,
            streak: state.selectedAnswerId === "a" ? state.session.score.streak + 1 : 0,
          },
        },
      })),
      resetDemo: () => set({ screen: "home", session: DEFAULT_SESSION, selectedAnswerId: undefined }),
      toggleReducedMotion: () => set((state) => ({ reducedMotion: !state.reducedMotion })),
      toggleSound: () => set((state) => ({ soundEnabled: !state.soundEnabled })),
      toggleMusic: () => set((state) => ({ musicEnabled: !state.musicEnabled })),
    }),
    {
      name: "trium.local-session.v1",
      partialize: (state) => ({
        session: state.session,
        reducedMotion: state.reducedMotion,
        soundEnabled: state.soundEnabled,
        musicEnabled: state.musicEnabled,
      }),
    },
  ),
);

