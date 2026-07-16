import { Howl, Howler } from "howler";

const silentClick = new Howl({
  src: ["/audio/ui-click.mp3"],
  volume: 0.25,
  preload: false,
  html5: false,
});

export function setGlobalAudioEnabled(enabled: boolean): void {
  Howler.mute(!enabled);
}

export function playUiClick(enabled: boolean): void {
  if (!enabled) {
    return;
  }
  if (silentClick.state() === "loaded") {
    silentClick.play();
  }
}
