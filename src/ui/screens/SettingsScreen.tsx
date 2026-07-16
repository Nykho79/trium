import { useState } from "react";
import { useAudioStore } from "../../app/store/audioStore";
import { useGameStore } from "../../app/store/gameStore";
import { useSettingsStore } from "../../app/store/settingsStore";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { Panel } from "../components/Panel";
import { ScreenFrame } from "../components/ScreenFrame";

function percent(value: number): string {
  return `${Math.round(value * 100)} %`;
}

export function SettingsScreen() {
  const [fullscreenMessage, setFullscreenMessage] = useState<string | undefined>(undefined);
  const navigate = useGameStore((state) => state.navigate);
  const clearSavedGame = useGameStore((state) => state.clearSavedGame);
  const clearRecentQuestions = useGameStore((state) => state.clearRecentQuestions);
  const reducedMotion = useSettingsStore((state) => state.reducedMotion);
  const timerScale = useSettingsStore((state) => state.timerScale);
  const persistenceError = useSettingsStore((state) => state.persistenceError);
  const toggleReducedMotion = useSettingsStore((state) => state.toggleReducedMotion);
  const setTimerScale = useSettingsStore((state) => state.setTimerScale);
  const masterMuted = useAudioStore((state) => state.masterMuted);
  const musicVolume = useAudioStore((state) => state.musicVolume);
  const uiVolume = useAudioStore((state) => state.uiVolume);
  const setMasterMuted = useAudioStore((state) => state.setMasterMuted);
  const setMusicVolume = useAudioStore((state) => state.setMusicVolume);
  const setUiVolume = useAudioStore((state) => state.setUiVolume);

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        setFullscreenMessage("Mode plein écran quitté.");
        return;
      }
      await document.documentElement.requestFullscreen();
      setFullscreenMessage("Mode plein écran activé.");
    } catch {
      setFullscreenMessage("Le plein écran est indisponible dans ce contexte.");
    }
  };

  return (
    <ScreenFrame title="Paramètres">
      <section className="setup-screen general-screen">
        <div className="screen-heading">
          <Badge tone="cyan">Système</Badge>
          <h1>Paramètres</h1>
          <p>Réglages locaux pour le son, le rythme et l'affichage TV.</p>
        </div>
        <Panel className="settings-list settings-panel">
          {persistenceError ? <p role="alert">{persistenceError}</p> : null}
          {fullscreenMessage ? <p role="status">{fullscreenMessage}</p> : null}

          <label className="setting-row">
            <span>Volume musique <strong>{percent(musicVolume)}</strong></span>
            <input type="range" min="0" max="1" step="0.05" value={musicVolume} onChange={(event) => setMusicVolume(Number(event.target.value))} />
          </label>
          <label className="setting-row">
            <span>Volume effets <strong>{percent(uiVolume)}</strong></span>
            <input type="range" min="0" max="1" step="0.05" value={uiVolume} onChange={(event) => setUiVolume(Number(event.target.value))} />
          </label>
          <button type="button" onClick={() => setMasterMuted(!masterMuted)}>Couper le son <strong>{masterMuted ? "Oui" : "Non"}</strong></button>
          <button type="button" onClick={toggleReducedMotion}>Animations réduites <strong>{reducedMotion ? "Oui" : "Non"}</strong></button>
          <label className="setting-row">
            <span>Durée des chronomètres <strong>x{timerScale.toFixed(2)}</strong></span>
            <input type="range" min="0.5" max="2" step="0.25" value={timerScale} onChange={(event) => setTimerScale(Number(event.target.value))} />
          </label>
          <button type="button" onClick={toggleFullscreen}>Mode plein écran <strong>{document.fullscreenElement ? "Actif" : "Basculer"}</strong></button>
          <button type="button" onClick={clearSavedGame}>Réinitialisation de la partie <strong>Effacer</strong></button>
          <button type="button" onClick={clearRecentQuestions}>Questions récemment vues <strong>Réinitialiser</strong></button>
          {import.meta.env.DEV ? <button type="button" onClick={() => navigate("dev-question-bank")}>Banque de questions <strong>Mode dev</strong></button> : null}
          {import.meta.env.DEV ? <button type="button" onClick={() => navigate("design-system")}>Design system <strong>Mode dev</strong></button> : null}
        </Panel>
        <Button variant="primary" onClick={() => navigate("home")}>Retour</Button>
      </section>
    </ScreenFrame>
  );
}
