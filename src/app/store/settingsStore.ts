import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { STORAGE_KEYS, STORAGE_SCHEMA_VERSION } from "../../core/constants/storage";

interface SettingsStoreState {
  reducedMotion: boolean;
  soundEnabled: boolean;
  musicEnabled: boolean;
  devModeEnabled: boolean;
  timerScale: number;
  persistenceError: string | undefined;
  toggleReducedMotion: () => void;
  toggleSound: () => void;
  toggleMusic: () => void;
  setDevModeEnabled: (enabled: boolean) => void;
  setTimerScale: (timerScale: number) => void;
  setPersistenceError: (error: string | undefined) => void;
  resetSettings: () => void;
}

const DEFAULT_SETTINGS = {
  reducedMotion: false,
  soundEnabled: true,
  musicEnabled: false,
  devModeEnabled: false,
  timerScale: 1,
  persistenceError: undefined,
} satisfies Pick<SettingsStoreState, "reducedMotion" | "soundEnabled" | "musicEnabled" | "devModeEnabled" | "timerScale" | "persistenceError">;

export const useSettingsStore = create<SettingsStoreState>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,
      toggleReducedMotion: () => set((state) => ({ reducedMotion: !state.reducedMotion })),
      toggleSound: () => set((state) => ({ soundEnabled: !state.soundEnabled })),
      toggleMusic: () => set((state) => ({ musicEnabled: !state.musicEnabled })),
      setDevModeEnabled: (enabled) => set({ devModeEnabled: enabled }),
      setTimerScale: (timerScale) => set({ timerScale: Math.min(3, Math.max(0.25, timerScale)) }),
      setPersistenceError: (error) => set({ persistenceError: error }),
      resetSettings: () => set(DEFAULT_SETTINGS),
    }),
    {
      name: STORAGE_KEYS.settings,
      version: STORAGE_SCHEMA_VERSION,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        reducedMotion: state.reducedMotion,
        soundEnabled: state.soundEnabled,
        musicEnabled: state.musicEnabled,
        devModeEnabled: state.devModeEnabled,
        timerScale: state.timerScale,
      }),
      migrate: (persistedState) => {
        if (typeof persistedState !== "object" || persistedState === null) {
          return DEFAULT_SETTINGS;
        }
        return { ...DEFAULT_SETTINGS, ...persistedState };
      },
      onRehydrateStorage: () => (_state, error) => {
        if (error) {
          useSettingsStore.setState({ persistenceError: "Parametres locaux ignores: sauvegarde invalide." });
        }
      },
    },
  ),
);