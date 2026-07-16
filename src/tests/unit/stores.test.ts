import { beforeEach, describe, expect, it } from "vitest";
import { STORAGE_KEYS } from "../../core/constants/storage";
import { useAudioStore } from "../../app/store/audioStore";
import { useGameStore } from "../../app/store/gameStore";
import { useSettingsStore } from "../../app/store/settingsStore";

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
    localStorage.setItem(STORAGE_KEYS.savedSession, "{cassé");

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
});