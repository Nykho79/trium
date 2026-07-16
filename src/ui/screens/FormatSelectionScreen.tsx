import { STANDARD_FORMAT } from "../../core/constants/game";
import { Button } from "../components/Button";
import { Panel } from "../components/Panel";
import { ScreenFrame } from "../components/ScreenFrame";
import { useGameStore } from "../../app/store/gameStore";

export function FormatSelectionScreen() {
  const navigate = useGameStore((state) => state.navigate);
  return (
    <ScreenFrame title="Choix du format">
      <section className="setup-screen">
        <div className="screen-heading">
          <h1>Choix du format</h1>
          <p>La V1 démarre avec un format classique, court et entièrement local.</p>
        </div>
        <Panel className="format-card">
          <h2>{STANDARD_FORMAT.label}</h2>
          <p>{STANDARD_FORMAT.description}</p>
          <dl>
            <div><dt>Manches</dt><dd>{STANDARD_FORMAT.roundOrder.length}</dd></div>
            <div><dt>Données</dt><dd>Banque JSON locale</dd></div>
            <div><dt>Joueurs</dt><dd>3 fixes</dd></div>
          </dl>
        </Panel>
        <div className="screen-actions">
          <Button variant="secondary" onClick={() => navigate("player-setup")}>Retour</Button>
          <Button variant="primary" onClick={() => navigate("game-intro")}>Préparer la partie</Button>
        </div>
      </section>
    </ScreenFrame>
  );
}
