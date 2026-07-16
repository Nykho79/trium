import { create } from "zustand";
import { STANDARD_FORMAT } from "../../core/constants/game";
import { INITIAL_JOKERS } from "../../core/constants/scoring";
import { STORAGE_SCHEMA_VERSION } from "../../core/constants/storage";
import {
  advanceRound,
  applyJoker,
  completeGame,
  completeRound,
  configureWager,
  createGame,
  expirePressureChoiceQuestion,
  loadQuestion,
  pauseGame,
  purchaseFinalAdvantage,
  resumeGame,
  revealNextClue,
  revealNextConnectionItem,
  showClueRaceAnswers,
  showConnectionAnswerOptions,
  securePressureChoicePoints,
  revealAnswer as revealEngineAnswer,
  restoreGame,
  startGame,
  startRound,
  submitAnswer,
  activateFinalConvergenceHint,
} from "../../core/engine/gameEngine";
import type {
  AppScreen,
  GameConfig,
  GameSessionPreview,
  GameState,
  JokerType,
  Player,
  Question,
  RoundDefinition,
} from "../../core/types";
import {
  buildSavedGameEnvelope,
  clearSavedGame as clearSavedGameStorage,
  loadRecentQuestionIds,
  loadSavedGame,
  saveGameEnvelope,
  saveRecentQuestionIds,
} from "./persistence";

export const DEFAULT_PLAYERS: [Player, Player, Player] = [
  { id: "player-1", name: "Joueur 1", color: "amber", ready: true },
  { id: "player-2", name: "Joueur 2", color: "cyan", ready: true },
  { id: "player-3", name: "Joueur 3", color: "magenta", ready: true },
];

const DEFAULT_ROUNDS: RoundDefinition[] = [
  {
    id: "knowledge-grid",
    kind: "knowledge-grid",
    label: "Grille des savoirs",
    description: "Choix libre de categories et de valeurs.",
    questionTypes: ["multiple_choice"],
    questionCount: 8,
    maxScore: 4_100,
  },
  {
    id: "clue-race",
    kind: "clue-race",
    label: "Course aux indices",
    description: "Indices progressifs et score decroissant.",
    questionTypes: ["progressive_clues"],
    questionCount: 5,
    maxScore: 2_500,
  },
  {
    id: "pressure-choice",
    kind: "pressure-choice",
    label: "Choix sous pression",
    description: "QCM chronometres avec jokers.",
    questionTypes: ["multiple_choice"],
    questionCount: 5,
    maxScore: 4_700,
  },
  {
    id: "synapse",
    kind: "synapse",
    label: "Synapse",
    description: "Logique, classement, memoire et categorisation.",
    questionTypes: ["chronology", "analogy", "memory", "sequence", "intruder", "visual_matrix", "symbol_rule"],
    questionCount: 6,
    maxScore: 1_680,
  },
  {
    id: "connections",
    kind: "connections",
    label: "Connexions",
    description: "Trouver le lien commun entre plusieurs elements.",
    questionTypes: ["connection"],
    questionCount: 5,
    maxScore: 2_500,
  },
  {
    id: "wager",
    kind: "wager",
    label: "Le Pari",
    description: "Categorie, difficulte et mise choisies par l'equipe.",
    questionTypes: ["multiple_choice"],
    questionCount: 5,
    maxScore: 12_500,
  },
  {
    id: "final-convergence",
    kind: "final-convergence",
    label: "Convergence finale",
    description: "Finale en cinq etapes avec avantages acquis.",
    questionTypes: ["multiple_choice", "progressive_clues", "connection", "chronology", "analogy", "sequence"],
    questionCount: 5,
    maxScore: 2_500,
  },
];

const DEFAULT_SESSION: GameSessionPreview = {
  players: DEFAULT_PLAYERS,
  format: STANDARD_FORMAT,
  currentRoundKind: "pressure-choice",
  currentQuestionId: "pc-fr-001",
  usedQuestionIds: [],
  score: {
    teamScore: 1_250,
    streak: 2,
    jokers: INITIAL_JOKERS,
  },
};

interface EngineQuestionInput {
  questions: readonly Question[];
  questionId?: string | undefined;
  now?: number | undefined;
}

interface GameStoreState {
  screen: AppScreen;
  previousScreen: AppScreen;
  session: GameSessionPreview;
  selectedAnswerId: string | undefined;
  gameState: GameState | null;
  hasSavedGame: boolean;
  persistenceError: string | undefined;
  engineError: string | undefined;
  recentQuestionIds: string[];
  saveVersion: number;
  navigate: (screen: AppScreen) => void;
  updatePlayerName: (playerIndex: 0 | 1 | 2, name: string) => void;
  selectAnswer: (answerId: string) => void;
  revealAnswer: () => void;
  resetDemo: () => void;
  clearRecentQuestions: () => void;
  startNewGame: (seed?: string | undefined) => void;
  startConfiguredGame: () => void;
  startCurrentRound: (roundIndex?: number | undefined) => void;
  loadCurrentQuestion: (input: EngineQuestionInput) => void;
  submitCurrentAnswer: (answer: string | string[], now?: number | undefined) => void;
  revealCurrentAnswer: (questions: readonly Question[], now?: number | undefined) => void;
  completeCurrentRound: (now?: number | undefined) => void;
  advanceToNextRound: (now?: number | undefined) => void;
  finishGame: (now?: number | undefined) => void;
  pauseCurrentGame: (now?: number | undefined) => void;
  resumeCurrentGame: (now?: number | undefined) => void;
  applyGameJoker: (joker: JokerType, questions?: readonly Question[] | undefined, now?: number | undefined) => void;
  revealNextClueForCurrentQuestion: (now?: number | undefined) => void;
  revealNextConnectionItemForCurrentQuestion: (now?: number | undefined) => void;
  showClueRaceAnswerOptions: (now?: number | undefined) => void;
  showConnectionAnswerOptionsForCurrentQuestion: (now?: number | undefined) => void;
  configureCurrentWager: (input: { categoryId: string; difficulty: 1 | 2 | 3 | 4 | 5; amount: number; now?: number | undefined }) => void;
  purchaseFinalAdvantageForCurrentRound: (advantageId: "extra_time" | "remove_wrong_answer" | "extra_hint" | "second_chance" | "error_protection", now?: number | undefined) => void;
  activateFinalHintForCurrentQuestion: (questions: readonly Question[], now?: number | undefined) => void;
  securePressureChoiceRisk: (now?: number | undefined) => void;
  expireCurrentPressureChoiceQuestion: (questions: readonly Question[], now?: number | undefined) => void;
  resumeSavedGame: () => void;
  clearSavedGame: () => void;
  setEngineState: (gameState: GameState) => void;
}

function createDefaultConfig(players: [Player, Player, Player], seed = `trium-${Date.now()}`): GameConfig {
  return {
    id: "trium-standard-local",
    mode: "standard",
    seed,
    players,
    rounds: DEFAULT_ROUNDS,
    questionBankVersion: 1,
    allowRecentlyPlayedFallback: true,
    defaultQuestionTimeMs: 30_000,
  };
}

function sessionFromGameState(gameState: GameState, fallback: GameSessionPreview): GameSessionPreview {
  const round = gameState.config.rounds[gameState.currentRoundIndex];
  const session: GameSessionPreview = {
    players: gameState.config.players,
    format: fallback.format,
    currentRoundKind: round?.kind ?? fallback.currentRoundKind,
    usedQuestionIds: gameState.usedQuestionIds,
    score: {
      teamScore: gameState.score.total,
      streak: gameState.lastAnswerResult?.isCorrect ? fallback.score.streak + 1 : fallback.score.streak,
      jokers: gameState.jokers.available,
      breakdown: gameState.score,
    },
  };
  return gameState.activeQuestionId ? { ...session, currentQuestionId: gameState.activeQuestionId } : session;
}

function persistencePatch(input: {
  gameState: GameState | null;
  screen: AppScreen;
  selectedAnswerId: string | undefined;
}): Pick<GameStoreState, "hasSavedGame" | "persistenceError" | "recentQuestionIds"> {
  if (input.gameState === null) {
    return { hasSavedGame: false, persistenceError: undefined, recentQuestionIds: [] };
  }
  const envelope = buildSavedGameEnvelope({
    gameState: input.gameState,
    screen: input.screen,
    selectedAnswerId: input.selectedAnswerId,
  });
  const saved = saveGameEnvelope(envelope);
  if (!saved.ok) {
    return {
      hasSavedGame: true,
      persistenceError: saved.error,
      recentQuestionIds: input.gameState.recentlyPlayedQuestionIds,
    };
  }
  return {
    hasSavedGame: true,
    persistenceError: undefined,
    recentQuestionIds: saved.value.recentQuestionIds,
  };
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return "Action moteur impossible.";
}

function restoreSavedState(): Pick<GameStoreState, "gameState" | "screen" | "selectedAnswerId" | "session" | "hasSavedGame" | "persistenceError" | "recentQuestionIds"> {
  const saved = loadSavedGame();
  if (!saved.ok) {
    return {
      gameState: null,
      screen: "home",
      selectedAnswerId: undefined,
      session: DEFAULT_SESSION,
      hasSavedGame: false,
      persistenceError: saved.error,
      recentQuestionIds: [],
    };
  }
  if (saved.value === null) {
    const recent = loadRecentQuestionIds();
    return {
      gameState: null,
      screen: "home",
      selectedAnswerId: undefined,
      session: DEFAULT_SESSION,
      hasSavedGame: false,
      persistenceError: recent.ok ? undefined : recent.error,
      recentQuestionIds: recent.ok ? recent.value : [],
    };
  }

  const restored = restoreGame(saved.value.gameState, Date.now());
  return {
    gameState: restored,
    screen: saved.value.screen,
    selectedAnswerId: saved.value.selectedAnswerId,
    session: sessionFromGameState(restored, DEFAULT_SESSION),
    hasSavedGame: true,
    persistenceError: undefined,
    recentQuestionIds: saved.value.recentQuestionIds,
  };
}

const restoredState = restoreSavedState();

export const useGameStore = create<GameStoreState>()((set) => ({
  screen: restoredState.screen,
  previousScreen: "home",
  session: restoredState.session,
  selectedAnswerId: restoredState.selectedAnswerId,
  gameState: restoredState.gameState,
  hasSavedGame: restoredState.hasSavedGame,
  persistenceError: restoredState.persistenceError,
  engineError: undefined,
  recentQuestionIds: restoredState.recentQuestionIds,
  saveVersion: STORAGE_SCHEMA_VERSION,
  navigate: (screen) => set((state) => {
    const patch = persistencePatch({ gameState: state.gameState, screen, selectedAnswerId: state.selectedAnswerId });
    return { previousScreen: state.screen, screen, ...patch };
  }),
  updatePlayerName: (playerIndex, name) => set((state) => {
    const players = [...state.session.players] as [Player, Player, Player];
    players[playerIndex] = { ...players[playerIndex], name: name.slice(0, 14) };
    const config = state.gameState ? { ...state.gameState.config, players } : undefined;
    const gameState = state.gameState && config ? { ...state.gameState, config } : state.gameState;
    const session = { ...state.session, players };
    const patch = persistencePatch({ gameState, screen: state.screen, selectedAnswerId: state.selectedAnswerId });
    return { session, gameState, ...patch };
  }),
  selectAnswer: (answerId) => set((state) => {
    const patch = persistencePatch({ gameState: state.gameState, screen: state.screen, selectedAnswerId: answerId });
    return { selectedAnswerId: answerId, ...patch };
  }),
  revealAnswer: () => set((state) => {
    const session: GameSessionPreview = {
      ...state.session,
      usedQuestionIds: state.session.currentQuestionId
        ? [...new Set([...state.session.usedQuestionIds, state.session.currentQuestionId])]
        : state.session.usedQuestionIds,
      score: {
        ...state.session.score,
        teamScore: state.selectedAnswerId === "a" ? state.session.score.teamScore + 200 : state.session.score.teamScore,
        streak: state.selectedAnswerId === "a" ? state.session.score.streak + 1 : 0,
      },
    };
    const patch = persistencePatch({ gameState: state.gameState, screen: "question-transition", selectedAnswerId: state.selectedAnswerId });
    return { screen: "question-transition", session, ...patch };
  }),
  resetDemo: () => set(() => {
    const cleared = clearSavedGameStorage();
    return {
      screen: "home",
      previousScreen: "home",
      session: DEFAULT_SESSION,
      selectedAnswerId: undefined,
      gameState: null,
      hasSavedGame: false,
      persistenceError: cleared.ok ? undefined : cleared.error,
      engineError: undefined,
    };
  }),
  clearRecentQuestions: () => set((state) => {
    const saved = saveRecentQuestionIds([]);
    const gameState = state.gameState ? { ...state.gameState, recentlyPlayedQuestionIds: [] } : null;
    const patch = persistencePatch({ gameState, screen: state.screen, selectedAnswerId: state.selectedAnswerId });
    return {
      gameState,
      recentQuestionIds: [],
      persistenceError: saved.ok ? patch.persistenceError : saved.error,
      hasSavedGame: patch.hasSavedGame,
    };
  }),
  startNewGame: (seed) => set((state) => {
    const recent = loadRecentQuestionIds();
    const config = createDefaultConfig(state.session.players, seed);
    const gameState = createGame({
      config,
      recentlyPlayedQuestionIds: recent.ok ? recent.value : state.recentQuestionIds,
      now: Date.now(),
    });
    const session = sessionFromGameState(gameState, state.session);
    const patch = persistencePatch({ gameState, screen: "game-intro", selectedAnswerId: undefined });
    return {
      screen: "game-intro",
      previousScreen: state.screen,
      session,
      selectedAnswerId: undefined,
      gameState,
      engineError: undefined,
      persistenceError: recent.ok ? patch.persistenceError : recent.error,
      hasSavedGame: patch.hasSavedGame,
      recentQuestionIds: patch.recentQuestionIds,
    };
  }),
  startConfiguredGame: () => set((state) => {
    if (!state.gameState) {
      return { engineError: "Aucune partie a demarrer." };
    }
    try {
      const gameState = startGame(state.gameState, Date.now());
      const patch = persistencePatch({ gameState, screen: "game-intro", selectedAnswerId: state.selectedAnswerId });
      return { gameState, session: sessionFromGameState(gameState, state.session), engineError: undefined, ...patch };
    } catch (error) {
      return { engineError: errorMessage(error) };
    }
  }),
  startCurrentRound: (roundIndex) => set((state) => {
    if (!state.gameState) {
      return { engineError: "Aucune partie active." };
    }
    try {
      const gameState = startRound(state.gameState, roundIndex ?? state.gameState.currentRoundIndex, Date.now());
      const patch = persistencePatch({ gameState, screen: "round-intro", selectedAnswerId: undefined });
      return { gameState, screen: "round-intro", selectedAnswerId: undefined, session: sessionFromGameState(gameState, state.session), engineError: undefined, ...patch };
    } catch (error) {
      return { engineError: errorMessage(error) };
    }
  }),
  loadCurrentQuestion: (input) => set((state) => {
    if (!state.gameState) {
      return { engineError: "Aucune partie active." };
    }
    try {
      const gameState = loadQuestion(state.gameState, { questions: input.questions, questionId: input.questionId, now: input.now ?? Date.now() });
      const recentQuestionIds = [...new Set([...state.recentQuestionIds, ...gameState.usedQuestionIds])].slice(-50);
      saveRecentQuestionIds(recentQuestionIds);
      const syncedGameState = { ...gameState, recentlyPlayedQuestionIds: recentQuestionIds };
      const patch = persistencePatch({ gameState: syncedGameState, screen: "game", selectedAnswerId: undefined });
      return { gameState: syncedGameState, screen: "game", selectedAnswerId: undefined, session: sessionFromGameState(syncedGameState, state.session), engineError: undefined, ...patch };
    } catch (error) {
      return { engineError: errorMessage(error) };
    }
  }),
  submitCurrentAnswer: (answer, now) => set((state) => {
    if (!state.gameState) {
      return { engineError: "Aucune partie active." };
    }
    try {
      const gameState = submitAnswer(state.gameState, { answer, now: now ?? Date.now() });
      const selectedAnswerId = Array.isArray(answer) ? answer.join("|") : answer;
      const patch = persistencePatch({ gameState, screen: state.screen, selectedAnswerId });
      return { gameState, selectedAnswerId, session: sessionFromGameState(gameState, state.session), engineError: undefined, ...patch };
    } catch (error) {
      return { engineError: errorMessage(error) };
    }
  }),
  revealCurrentAnswer: (questions, now) => set((state) => {
    if (!state.gameState) {
      return { engineError: "Aucune partie active." };
    }
    try {
      const gameState = revealEngineAnswer(state.gameState, { questions, now: now ?? Date.now() });
      const patch = persistencePatch({ gameState, screen: "question-transition", selectedAnswerId: state.selectedAnswerId });
      return { gameState, screen: "question-transition", session: sessionFromGameState(gameState, state.session), engineError: undefined, ...patch };
    } catch (error) {
      return { engineError: errorMessage(error) };
    }
  }),
  completeCurrentRound: (now) => set((state) => {
    if (!state.gameState) {
      return { engineError: "Aucune partie active." };
    }
    try {
      const gameState = completeRound(state.gameState, now ?? Date.now());
      const patch = persistencePatch({ gameState, screen: "round-result", selectedAnswerId: undefined });
      return { gameState, screen: "round-result", selectedAnswerId: undefined, session: sessionFromGameState(gameState, state.session), engineError: undefined, ...patch };
    } catch (error) {
      return { engineError: errorMessage(error) };
    }
  }),
  advanceToNextRound: (now) => set((state) => {
    if (!state.gameState) {
      return { engineError: "Aucune partie active." };
    }
    try {
      const gameState = advanceRound(state.gameState, now ?? Date.now());
      const screen: AppScreen = gameState.status === "game_result" ? "game-result" : "round-intro";
      const patch = persistencePatch({ gameState, screen, selectedAnswerId: undefined });
      return { gameState, screen, selectedAnswerId: undefined, session: sessionFromGameState(gameState, state.session), engineError: undefined, ...patch };
    } catch (error) {
      return { engineError: errorMessage(error) };
    }
  }),
  finishGame: (now) => set((state) => {
    if (!state.gameState) {
      return { engineError: "Aucune partie active." };
    }
    try {
      const gameState = completeGame(state.gameState, now ?? Date.now());
      const patch = persistencePatch({ gameState, screen: "game-result", selectedAnswerId: undefined });
      return { gameState, screen: "game-result", selectedAnswerId: undefined, session: sessionFromGameState(gameState, state.session), engineError: undefined, ...patch };
    } catch (error) {
      return { engineError: errorMessage(error) };
    }
  }),
  pauseCurrentGame: (now) => set((state) => {
    if (!state.gameState) {
      return { engineError: "Aucune partie active." };
    }
    try {
      const gameState = pauseGame(state.gameState, now ?? Date.now());
      const patch = persistencePatch({ gameState, screen: state.screen, selectedAnswerId: state.selectedAnswerId });
      return { gameState, session: sessionFromGameState(gameState, state.session), engineError: undefined, ...patch };
    } catch (error) {
      return { engineError: errorMessage(error) };
    }
  }),
  resumeCurrentGame: (now) => set((state) => {
    if (!state.gameState) {
      return { engineError: "Aucune partie active." };
    }
    try {
      const gameState = resumeGame(state.gameState, now ?? Date.now());
      const patch = persistencePatch({ gameState, screen: state.screen, selectedAnswerId: state.selectedAnswerId });
      return { gameState, session: sessionFromGameState(gameState, state.session), engineError: undefined, ...patch };
    } catch (error) {
      return { engineError: errorMessage(error) };
    }
  }),
  applyGameJoker: (joker, questions, now) => set((state) => {
    if (!state.gameState) {
      return { engineError: "Aucune partie active." };
    }
    try {
      const gameState = applyJoker(state.gameState, { joker, questions, now: now ?? Date.now() });
      const selectedAnswerId = joker === "change_question" ? undefined : state.selectedAnswerId;
      const patch = persistencePatch({ gameState, screen: state.screen, selectedAnswerId });
      return { gameState, selectedAnswerId, session: sessionFromGameState(gameState, state.session), engineError: undefined, ...patch };
    } catch (error) {
      return { engineError: errorMessage(error) };
    }
  }),
  revealNextClueForCurrentQuestion: (now) => set((state) => {
    if (!state.gameState) {
      return { engineError: "Aucune partie active." };
    }
    try {
      const gameState = revealNextClue(state.gameState, now ?? Date.now());
      const patch = persistencePatch({ gameState, screen: state.screen, selectedAnswerId: state.selectedAnswerId });
      return { gameState, session: sessionFromGameState(gameState, state.session), engineError: undefined, ...patch };
    } catch (error) {
      return { engineError: errorMessage(error) };
    }
  }),
  revealNextConnectionItemForCurrentQuestion: (now) => set((state) => {
    if (!state.gameState) {
      return { engineError: "Aucune partie active." };
    }
    try {
      const gameState = revealNextConnectionItem(state.gameState, now ?? Date.now());
      const patch = persistencePatch({ gameState, screen: state.screen, selectedAnswerId: state.selectedAnswerId });
      return { gameState, session: sessionFromGameState(gameState, state.session), engineError: undefined, ...patch };
    } catch (error) {
      return { engineError: errorMessage(error) };
    }
  }),
  showClueRaceAnswerOptions: (now) => set((state) => {
    if (!state.gameState) {
      return { engineError: "Aucune partie active." };
    }
    try {
      const gameState = showClueRaceAnswers(state.gameState, now ?? Date.now());
      const patch = persistencePatch({ gameState, screen: state.screen, selectedAnswerId: undefined });
      return { gameState, selectedAnswerId: undefined, session: sessionFromGameState(gameState, state.session), engineError: undefined, ...patch };
    } catch (error) {
      return { engineError: errorMessage(error) };
    }
  }),
  showConnectionAnswerOptionsForCurrentQuestion: (now) => set((state) => {
    if (!state.gameState) {
      return { engineError: "Aucune partie active." };
    }
    try {
      const gameState = showConnectionAnswerOptions(state.gameState, now ?? Date.now());
      const patch = persistencePatch({ gameState, screen: state.screen, selectedAnswerId: undefined });
      return { gameState, selectedAnswerId: undefined, session: sessionFromGameState(gameState, state.session), engineError: undefined, ...patch };
    } catch (error) {
      return { engineError: errorMessage(error) };
    }
  }),
  purchaseFinalAdvantageForCurrentRound: (advantageId, now) => set((state) => {
    if (!state.gameState) {
      return { engineError: "Aucune partie active." };
    }
    try {
      const gameState = purchaseFinalAdvantage(state.gameState, { advantageId, now: now ?? Date.now() });
      const patch = persistencePatch({ gameState, screen: state.screen, selectedAnswerId: undefined });
      return { gameState, selectedAnswerId: undefined, session: sessionFromGameState(gameState, state.session), engineError: undefined, ...patch };
    } catch (error) {
      return { engineError: errorMessage(error) };
    }
  }),
  activateFinalHintForCurrentQuestion: (questions, now) => set((state) => {
    if (!state.gameState) {
      return { engineError: "Aucune partie active." };
    }
    try {
      const gameState = activateFinalConvergenceHint(state.gameState, questions, now ?? Date.now());
      const patch = persistencePatch({ gameState, screen: state.screen, selectedAnswerId: state.selectedAnswerId });
      return { gameState, session: sessionFromGameState(gameState, state.session), engineError: undefined, ...patch };
    } catch (error) {
      return { engineError: errorMessage(error) };
    }
  }),  configureCurrentWager: (input) => set((state) => {
    if (!state.gameState) {
      return { engineError: "Aucune partie active." };
    }
    try {
      const gameState = configureWager(state.gameState, { ...input, now: input.now ?? Date.now() });
      const patch = persistencePatch({ gameState, screen: state.screen, selectedAnswerId: undefined });
      return { gameState, selectedAnswerId: undefined, session: sessionFromGameState(gameState, state.session), engineError: undefined, ...patch };
    } catch (error) {
      return { engineError: errorMessage(error) };
    }
  }),
  securePressureChoiceRisk: (now) => set((state) => {
    if (!state.gameState) {
      return { engineError: "Aucune partie active." };
    }
    try {
      const gameState = securePressureChoicePoints(state.gameState, now ?? Date.now());
      const patch = persistencePatch({ gameState, screen: "round-result", selectedAnswerId: undefined });
      return { gameState, screen: "round-result", selectedAnswerId: undefined, session: sessionFromGameState(gameState, state.session), engineError: undefined, ...patch };
    } catch (error) {
      return { engineError: errorMessage(error) };
    }
  }),
  expireCurrentPressureChoiceQuestion: (questions, now) => set((state) => {
    if (!state.gameState) {
      return { engineError: "Aucune partie active." };
    }
    try {
      const gameState = expirePressureChoiceQuestion(state.gameState, { questions, now: now ?? Date.now() });
      const patch = persistencePatch({ gameState, screen: "question-transition", selectedAnswerId: undefined });
      return { gameState, screen: "question-transition", selectedAnswerId: undefined, session: sessionFromGameState(gameState, state.session), engineError: undefined, ...patch };
    } catch (error) {
      return { engineError: errorMessage(error) };
    }
  }),
  resumeSavedGame: () => set((state) => {
    const saved = loadSavedGame();
    if (!saved.ok) {
      return { persistenceError: saved.error, hasSavedGame: false };
    }
    if (saved.value === null) {
      return { persistenceError: "Aucune partie sauvegardee a reprendre.", hasSavedGame: false };
    }
    try {
      const gameState = restoreGame(saved.value.gameState, Date.now());
      const patch = persistencePatch({ gameState, screen: saved.value.screen, selectedAnswerId: saved.value.selectedAnswerId });
      return {
        gameState,
        screen: saved.value.screen,
        previousScreen: state.screen,
        selectedAnswerId: saved.value.selectedAnswerId,
        session: sessionFromGameState(gameState, state.session),
        engineError: undefined,
        ...patch,
      };
    } catch (error) {
      clearSavedGameStorage();
      return { persistenceError: `Sauvegarde ignoree: ${errorMessage(error)}`, hasSavedGame: false };
    }
  }),
  clearSavedGame: () => set(() => {
    const cleared = clearSavedGameStorage();
    return {
      gameState: null,
      hasSavedGame: false,
      selectedAnswerId: undefined,
      session: DEFAULT_SESSION,
      persistenceError: cleared.ok ? undefined : cleared.error,
      engineError: undefined,
    };
  }),
  setEngineState: (gameState) => set((state) => {
    const patch = persistencePatch({ gameState, screen: state.screen, selectedAnswerId: state.selectedAnswerId });
    return { gameState, session: sessionFromGameState(gameState, state.session), engineError: undefined, ...patch };
  }),
}));
