import { create } from "zustand";

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

export const useAudioStore = create<AudioStoreState>()((set) => ({
  ...DEFAULT_AUDIO_STATE,
  setMasterMuted: (muted) => set({ masterMuted: muted }),
  setUiVolume: (volume) => set({ uiVolume: clampVolume(volume) }),
  setMusicVolume: (volume) => set({ musicVolume: clampVolume(volume) }),
  setAudioError: (error) => set({ lastError: error }),
  resetAudio: () => set(DEFAULT_AUDIO_STATE),
}));