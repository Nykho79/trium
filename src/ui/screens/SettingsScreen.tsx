import { Button } from "../components/Button";
import { Panel } from "../components/Panel";
import { ScreenFrame } from "../components/ScreenFrame";
import { useGameStore } from "../../app/store/gameStore";

export function SettingsScreen() {
  const navigate = useGameStore((state) => state.navigate);
  const reducedMotion = useGameStore((state) => state.reducedMotion);
  const soundEnabled = useGameStore((state) => state.soundEnabled);
  const musicEnabled = useGameStore((state) => state.musicEnabled);
  const toggleReducedMotion = useGameStore((state) => state.toggleReducedMotion);
  const toggleSound = useGameStore((state) => state.toggleSound);
  const toggleMusic = useGameStore((state) => state.toggleMusic);

  return (
    <ScreenFrame title="Paramètres">
      <section className="setup-screen">
        <div className="screen-heading">
          <h1>Paramètres</h1>
          <p>Réglages stockés localement sur cet ordinateur.</p>
        </div>
        <Panel className="settings-list">
          <button type="button" onClick={toggleSound}>Sons d'interface <strong>{soundEnabled ? "Activés" : "Coupés"}</strong></button>
          <button type="button" onClick={toggleMusic}>Musique <strong>{musicEnabled ? "Activée" : "Coupée"}</strong></button>
          <button type="button" onClick={toggleReducedMotion}>Animations réduites <strong>{reducedMotion ? "Oui" : "Non"}</strong></button>
          <button type="button" onClick={() => navigate("dev-question-bank")}>Banque de questions <strong>Mode dev</strong></button>
        </Panel>
        <Button variant="primary" onClick={() => navigate("home")}>Retour</Button>
      </section>
    </ScreenFrame>
  );
}
