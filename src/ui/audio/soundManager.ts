import { Howler } from "howler";

function playTone(enabled: boolean, frequency: number, durationMs: number, volume: number): void {
  if (!enabled || typeof window === "undefined") {
    return;
  }
  const AudioContextCtor = window.AudioContext;
  if (!AudioContextCtor) {
    return;
  }
  const context = new AudioContextCtor();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const now = context.currentTime;
  const durationSeconds = durationMs / 1000;

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(frequency, now);
  oscillator.frequency.exponentialRampToValueAtTime(frequency * 1.35, now + durationSeconds);
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(volume, now + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.001, now + durationSeconds);

  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(now);
  oscillator.stop(now + durationSeconds);
  oscillator.onended = () => {
    void context.close();
  };
}

export function setGlobalAudioEnabled(enabled: boolean): void {
  Howler.mute(!enabled);
}

export function playUiClick(enabled: boolean): void {
  playTone(enabled, 440, 70, 0.05);
}

export function playJokerSound(enabled: boolean): void {
  playTone(enabled, 620, 140, 0.07);
}
