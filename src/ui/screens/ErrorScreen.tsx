import { Button } from "../components/Button";
import { FeedbackBanner } from "../components/FeedbackBanner";
import { Panel } from "../components/Panel";
import { ScreenFrame } from "../components/ScreenFrame";
import { useGameStore } from "../../app/store/gameStore";

export function ErrorScreen() {
  const navigate = useGameStore((state) => state.navigate);
  const resetDemo = useGameStore((state) => state.resetDemo);
  const engineError = useGameStore((state) => state.engineError);
  const persistenceError = useGameStore((state) => state.persistenceError);

  return (
    <ScreenFrame title="Erreur">
      <section className="result-screen general-screen">
        <Panel className="result-card" tone="strong">
          <FeedbackBanner tone="danger" title="Action impossible" message={engineError ?? persistenceError ?? "Une erreur inconnue a ete detectee."} />
          <div className="screen-actions">
            <Button variant="secondary" onClick={() => navigate("home")}>Retour accueil</Button>
            <Button variant="danger" onClick={resetDemo}>Reinitialiser la partie</Button>
          </div>
        </Panel>
      </section>
    </ScreenFrame>
  );
}