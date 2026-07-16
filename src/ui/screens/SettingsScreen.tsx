import { useGameStore } from "../../app/store/gameStore";
import { useSettingsStore } from "../../app/store/settingsStore";
import { Button } from "../components/Button";
import { Panel } from "../components/Panel";
import { ScreenFrame } from "../components/ScreenFrame";

export function SettingsScreen() {
  const navigate = useGameStore((state) => state.navigate);
  const reducedMotion = useSettingsStore((state) => state.reducedMotion);
  const soundEnabled = useSettingsStore((state) => state.soundEnabled);
  const musicEnabled = useSettingsStore((state) => state.musicEnabled);
  const persistenceError = useSettingsStore((state) => state.persistenceError);
  const toggleReducedMotion = useSettingsStore((state) => state.toggleReducedMotion);
  const toggleSound = useSettingsStore((state) => state.toggleSound);
  const toggleMusic = useSettingsStore((state) => state.toggleMusic);

  return (
    <ScreenFrame title="Paramètres">
      <section className="setup-screen">
        <div className="screen-heading">
          <h1>Paramètres</h1>
          <p>Réglages stockés localement sur cet ordinateur.</p>
        </div>
        <Panel className="settings-list">
          {persistenceError ? <p role="alert">{persistenceError}</p> : null}
          <button type="button" onClick={toggleSound}>Sons d'interface <strong>{soundEnabled ? "Activés" : "Coupés"}</strong></button>
          <button type="button" onClick={toggleMusic}>Musique <strong>{musicEnabled ? "Activée" : "Coupée"}</strong></button>
          <button type="button" onClick={toggleReducedMotion}>Animations réduites <strong>{reducedMotion ? "Oui" : "Non"}</strong></button>
          <button type="button" onClick={() => navigate("dev-question-bank")}>Banque de questions <strong>Mode dev</strong></button>
          {import.meta.env.DEV ? <button type="button" onClick={() => navigate("design-system")}>Design system <strong>Mode dev</strong></button> : null}
        </Panel>
        <Button variant="primary" onClick={() => navigate("home")}>Retour</Button>
      </section>
    </ScreenFrame>
  );
}