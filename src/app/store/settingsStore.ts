import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { STORAGE_KEYS, STORAGE_SCHEMA_VERSION } from "../../core/constants/storage";

export type WakeLockStatus = "unsupported" | "inactive" | "active" | "blocked";

interface SettingsStoreState {
  reducedMotion: boolean;
  soundEnabled: boolean;
  musicEnabled: boolean;
  devModeEnabled: boolean;
  timerScale: number;
  uiScale: number;
  fullscreenActive: boolean;
  keepScreenAwake: boolean;
  wakeLockStatus: WakeLockStatus;
  persistenceError: string | undefined;
  toggleReducedMotion: () => void;
  toggleSound: () => void;
  toggleMusic: () => void;
  setDevModeEnabled: (enabled: boolean) => void;
  setTimerScale: (timerScale: number) => void;
  setUiScale: (uiScale: number) => void;
  setFullscreenActive: (active: boolean) => void;
  setKeepScreenAwake: (enabled: boolean) => void;
  setWakeLockStatus: (status: WakeLockStatus) => void;
  setPersistenceError: (error: string | undefined) => void;
  resetSettings: () => void;
}

const DEFAULT_SETTINGS = {
  reducedMotion: false,
  soundEnabled: true,
  musicEnabled: false,
  devModeEnabled: false,
  timerScale: 1,
  uiScale: 1,
  fullscreenActive: false,
  keepScreenAwake: true,
  wakeLockStatus: "inactive",
  persistenceError: undefined,
} satisfies Pick<SettingsStoreState, "reducedMotion" | "soundEnabled" | "musicEnabled" | "devModeEnabled" | "timerScale" | "uiScale" | "fullscreenActive" | "keepScreenAwake" | "wakeLockStatus" | "persistenceError">;

export const useSettingsStore = create<SettingsStoreState>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,
      toggleReducedMotion: () => set((state) => ({ reducedMotion: !state.reducedMotion })),
      toggleSound: () => set((state) => ({ soundEnabled: !state.soundEnabled })),
      toggleMusic: () => set((state) => ({ musicEnabled: !state.musicEnabled })),
      setDevModeEnabled: (enabled) => set({ devModeEnabled: enabled }),
      setTimerScale: (timerScale) => set({ timerScale: Math.min(3, Math.max(0.25, timerScale)) }),
      setUiScale: (uiScale) => set({ uiScale: Math.min(1.25, Math.max(0.85, uiScale)) }),
      setFullscreenActive: (active) => set({ fullscreenActive: active }),
      setKeepScreenAwake: (enabled) => set({ keepScreenAwake: enabled }),
      setWakeLockStatus: (status) => set({ wakeLockStatus: status }),
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
        uiScale: state.uiScale,
        keepScreenAwake: state.keepScreenAwake,
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
