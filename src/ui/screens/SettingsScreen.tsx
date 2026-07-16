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

function wakeLockLabel(status: string): string {
  if (status === "active") return "Actif";
  if (status === "unsupported") return "Non supporte";
  if (status === "blocked") return "Bloque";
  return "En attente";
}

export function SettingsScreen() {
  const [fullscreenMessage, setFullscreenMessage] = useState<string | undefined>(undefined);
  const navigate = useGameStore((state) => state.navigate);
  const clearSavedGame = useGameStore((state) => state.clearSavedGame);
  const clearRecentQuestions = useGameStore((state) => state.clearRecentQuestions);
  const reducedMotion = useSettingsStore((state) => state.reducedMotion);
  const timerScale = useSettingsStore((state) => state.timerScale);
  const uiScale = useSettingsStore((state) => state.uiScale);
  const fullscreenActive = useSettingsStore((state) => state.fullscreenActive);
  const keepScreenAwake = useSettingsStore((state) => state.keepScreenAwake);
  const wakeLockStatus = useSettingsStore((state) => state.wakeLockStatus);
  const persistenceError = useSettingsStore((state) => state.persistenceError);
  const toggleReducedMotion = useSettingsStore((state) => state.toggleReducedMotion);
  const setTimerScale = useSettingsStore((state) => state.setTimerScale);
  const setUiScale = useSettingsStore((state) => state.setUiScale);
  const setKeepScreenAwake = useSettingsStore((state) => state.setKeepScreenAwake);
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
        setFullscreenMessage("Mode plein ecran quitte.");
        return;
      }
      await document.documentElement.requestFullscreen();
      setFullscreenMessage("Mode plein ecran active.");
    } catch {
      setFullscreenMessage("Le plein ecran est indisponible dans ce contexte.");
    }
  };

  return (
    <ScreenFrame title="Parametres">
      <section className="setup-screen general-screen">
        <div className="screen-heading">
          <Badge tone="cyan">Systeme</Badge>
          <h1>Parametres</h1>
          <p>Reglages locaux pour le son, le rythme et l'affichage TV.</p>
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
          <button type="button" onClick={toggleReducedMotion}>Animations reduites <strong>{reducedMotion ? "Oui" : "Non"}</strong></button>
          <label className="setting-row">
            <span>Duree des chronometres <strong>x{timerScale.toFixed(2)}</strong></span>
            <input type="range" min="0.5" max="2" step="0.25" value={timerScale} onChange={(event) => setTimerScale(Number(event.target.value))} />
          </label>
          <label className="setting-row">
            <span>Zoom interface <strong>{percent(uiScale)}</strong></span>
            <input type="range" min="0.85" max="1.25" step="0.05" value={uiScale} onChange={(event) => setUiScale(Number(event.target.value))} />
          </label>
          <button type="button" onClick={toggleFullscreen}>Mode plein ecran <strong>{fullscreenActive ? "Actif" : "Basculer"}</strong></button>
          <button type="button" onClick={() => setKeepScreenAwake(!keepScreenAwake)}>Maintien ecran actif <strong>{keepScreenAwake ? wakeLockLabel(wakeLockStatus) : "Non"}</strong></button>
          <button type="button" onClick={clearSavedGame}>Reinitialisation de la partie <strong>Effacer</strong></button>
          <button type="button" onClick={clearRecentQuestions}>Questions recemment vues <strong>Reinitialiser</strong></button>
          {import.meta.env.DEV ? <button type="button" onClick={() => navigate("dev-question-bank")}>Banque de questions <strong>Mode dev</strong></button> : null}
          {import.meta.env.DEV ? <button type="button" onClick={() => navigate("design-system")}>Design system <strong>Mode dev</strong></button> : null}
        </Panel>
        <Button variant="primary" onClick={() => navigate("home")}>Retour</Button>
      </section>
    </ScreenFrame>
  );
}