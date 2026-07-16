import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { STORAGE_KEYS, STORAGE_SCHEMA_VERSION } from "../../core/constants/storage";

interface AudioStoreState {
  masterMuted: boolean;
  uiVolume: number;
  musicVolume: number;
  lastError: string | undefined;
  setMasterMuted: (muted: boolean) => void;
  setUiVolume: (volume: number) => void;
  setMusicVolume: (volume: number) => void;
  setAudioError: (error: string | undefined) => void;
  resetAudio: () => void;
}

const DEFAULT_AUDIO_STATE = {
  masterMuted: false,
  uiVolume: 0.75,
  musicVolume: 0.4,
  lastError: undefined,
} satisfies Pick<AudioStoreState, "masterMuted" | "uiVolume" | "musicVolume" | "lastError">;

function clampVolume(volume: number): number {
  return Math.min(1, Math.max(0, volume));
}

export const useAudioStore = create<AudioStoreState>()(
  persist(
    (set) => ({
      ...DEFAULT_AUDIO_STATE,
      setMasterMuted: (muted) => set({ masterMuted: muted }),
      setUiVolume: (volume) => set({ uiVolume: clampVolume(volume) }),
      setMusicVolume: (volume) => set({ musicVolume: clampVolume(volume) }),
      setAudioError: (error) => set({ lastError: error }),
      resetAudio: () => set(DEFAULT_AUDIO_STATE),
    }),
    {
      name: STORAGE_KEYS.audio,
      version: STORAGE_SCHEMA_VERSION,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        masterMuted: state.masterMuted,
        uiVolume: state.uiVolume,
        musicVolume: state.musicVolume,
      }),
      migrate: (persistedState) => {
        if (typeof persistedState !== "object" || persistedState === null) {
          return DEFAULT_AUDIO_STATE;
        }
        return { ...DEFAULT_AUDIO_STATE, ...persistedState };
      },
    },
  ),
);