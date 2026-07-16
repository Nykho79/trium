import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { STORAGE_KEYS } from "../../core/constants/storage";
import { completeRound, createGame, loadQuestion, revealAnswer, startGame, startRound, submitAnswer } from "../../core/engine/gameEngine";
import { useAudioStore } from "../../app/store/audioStore";
import { useGameStore } from "../../app/store/gameStore";
import { useSettingsStore } from "../../app/store/settingsStore";
import { RoundResultScreen } from "../../ui/screens/RoundResultScreen";
import type { GameConfig, GameState, Question } from "../../core/types";

const regressionQuestion: Question = {
  id: "q-round-result",
  kind: "knowledge-grid",
  type: "multiple_choice",
  categoryId: "culture",
  categoryLabel: "Culture",
  subCategoryId: "general",
  subCategoryLabel: "General",
  difficulty: 1,
  prompt: "Question de regression",
  explanation: "Explication",
  tags: [],
  editorialStatus: "approved",
  version: 1,
  options: [
    { id: "a", label: "Bonne reponse" },
    { id: "b", label: "Mauvaise 1" },
    { id: "c", label: "Mauvaise 2" },
    { id: "d", label: "Mauvaise 3" },
  ],
  correctOptionId: "a",
  answer: { accepted: ["bonne reponse"], display: "Bonne reponse" },
  value: 100,
};

function createRoundResultGameState(): GameState {
  const config: GameConfig = {
    id: "round-result-regression",
    mode: "standard",
    seed: "round-result-regression",
    playerMode: "trio",
    players: [
      { id: "player-1", name: "Alice", color: "amber", ready: true },
      { id: "player-2", name: "Benoit", color: "cyan", ready: true },
      { id: "player-3", name: "Camille", color: "magenta", ready: true },
    ],
    rounds: [
      { id: "knowledge-grid", kind: "knowledge-grid", label: "Grille des savoirs", description: "Choix libre.", questionTypes: ["multiple_choice"], questionCount: 1, maxScore: 100 },
      { id: "clue-race", kind: "clue-race", label: "Course aux indices", description: "Indices progressifs.", questionTypes: ["progressive_clues"], questionCount: 1, maxScore: 500 },
    ],
    questionBankVersion: 1,
    allowRecentlyPlayedFallback: true,
    defaultQuestionTimeMs: 30_000,
  };
  const created = createGame({ config, now: 0 });
  const started = startGame(created, 1);
  const roundStarted = startRound(started, 0, 2);
  const loaded = loadQuestion(roundStarted, { questions: [regressionQuestion], questionId: regressionQuestion.id, now: 3 });
  const locked = submitAnswer(loaded, { answer: "a", now: 4 });
  const revealed = revealAnswer(locked, { questions: [regressionQuestion], now: 5 });
  return completeRound(revealed, 6);
}

function resetStores() {
  useGameStore.getState().resetDemo();
  useSettingsStore.getState().resetSettings();
  useAudioStore.getState().resetAudio();
  useGameStore.setState({ persistenceError: undefined, engineError: undefined, hasSavedGame: false, gameState: null, recentQuestionIds: [] });
}

describe("zustand stores", () => {
  beforeEach(() => {
    localStorage.clear();
    resetStores();
  });

  it("cree une partie moteur et la sauvegarde automatiquement", () => {
    useGameStore.getState().startNewGame("seed-zustand");
    const state = useGameStore.getState();
    const rawSave = localStorage.getItem(STORAGE_KEYS.savedSession);

    expect(state.gameState?.config.seed).toBe("seed-zustand");
    expect(state.gameState?.config.players).toHaveLength(3);
    expect(state.hasSavedGame).toBe(true);
    expect(rawSave).not.toBeNull();
  });

  it("reprend une partie sauvegardee apres suppression de l'etat en memoire", () => {
    useGameStore.getState().startNewGame("seed-reprise");
    useGameStore.setState({ gameState: null, hasSavedGame: false, screen: "home" });

    useGameStore.getState().resumeSavedGame();
    const restored = useGameStore.getState();

    expect(restored.gameState?.config.seed).toBe("seed-reprise");
    expect(restored.hasSavedGame).toBe(true);
    expect(restored.persistenceError).toBeUndefined();
  });

  it("signale une sauvegarde invalide sans bloquer le store", () => {
    localStorage.setItem(STORAGE_KEYS.savedSession, "{cassÃƒÂ©");

    useGameStore.getState().resumeSavedGame();
    const state = useGameStore.getState();

    expect(state.gameState).toBeNull();
    expect(state.hasSavedGame).toBe(false);
    expect(state.persistenceError).toContain("illisible");
  });

  it("permet de supprimer une partie en cours", () => {
    useGameStore.getState().startNewGame("seed-clear");
    useGameStore.getState().clearSavedGame();

    expect(useGameStore.getState().gameState).toBeNull();
    expect(useGameStore.getState().hasSavedGame).toBe(false);
    expect(localStorage.getItem(STORAGE_KEYS.savedSession)).toBeNull();
  });

  it("persiste les reglages audio et motion", () => {
    useSettingsStore.getState().toggleSound();
    useSettingsStore.getState().toggleReducedMotion();
    const savedSettings = localStorage.getItem(STORAGE_KEYS.settings);

    expect(useSettingsStore.getState().soundEnabled).toBe(false);
    expect(useSettingsStore.getState().reducedMotion).toBe(true);
    expect(savedSettings).not.toBeNull();
  });

  it("borne les volumes audio", () => {
    useAudioStore.getState().setUiVolume(2);
    useAudioStore.getState().setMusicVolume(-1);

    expect(useAudioStore.getState().uiVolume).toBe(1);
    expect(useAudioStore.getState().musicVolume).toBe(0);
  });

  it("cree une partie solo quand le mode joueur solo est selectionne", () => {
    useGameStore.getState().setPlayerMode("solo");
    useGameStore.getState().updatePlayerName(0, "Nicolas");
    useGameStore.getState().startNewGame("seed-solo");
    const state = useGameStore.getState();

    expect(state.gameState?.config.playerMode).toBe("solo");
    expect(state.gameState?.config.players).toHaveLength(1);
    expect(state.gameState?.captainPlayerId).toBe("player-1");
  });

  it("fait avancer le moteur depuis le resultat de manche", () => {
    const gameState = createRoundResultGameState();
    const baseSession = useGameStore.getState().session;
    useGameStore.setState({
      gameState,
      screen: "round-result",
      selectedAnswerId: undefined,
      session: {
        ...baseSession,
        players: gameState.config.players,
        currentRoundKind: "knowledge-grid",
        usedQuestionIds: gameState.usedQuestionIds,
        score: {
          ...baseSession.score,
          teamScore: gameState.score.total,
          breakdown: gameState.score,
        },
      },
    });

    render(<RoundResultScreen />);
    fireEvent.click(screen.getByRole("button", { name: "Manche suivante" }));

    const advanced = useGameStore.getState();
    expect(advanced.screen).toBe("round-intro");
    expect(advanced.gameState?.status).toBe("next_round");
    expect(advanced.gameState?.currentRoundIndex).toBe(1);
  });

  it("borne le zoom interne et memorise le maintien de l'ecran actif", () => {
    useSettingsStore.getState().setUiScale(2);
    useSettingsStore.getState().setKeepScreenAwake(false);
    useSettingsStore.getState().setWakeLockStatus("unsupported");

    expect(useSettingsStore.getState().uiScale).toBe(1.25);
    expect(useSettingsStore.getState().keepScreenAwake).toBe(false);
    expect(useSettingsStore.getState().wakeLockStatus).toBe("unsupported");
  });
});