import { Button } from "../components/Button";
import { Panel } from "../components/Panel";
import { ScreenFrame } from "../components/ScreenFrame";
import { useGameStore } from "../../app/store/gameStore";

export function QuestionTransitionScreen() {
  const navigate = useGameStore((state) => state.navigate);
  const session = useGameStore((state) => state.session);
  return (
    <ScreenFrame title="Transition entre questions">
      <section className="result-screen">
        <Panel className="result-card">
          <span className="category-label">Réponse révélée</span>
          <h1>Nancy</h1>
          <p>La Place Stanislas se situe à Nancy, en Meurthe-et-Moselle.</p>
          <strong>Score équipe : {session.score.teamScore.toLocaleString("fr-FR")}</strong>
          <div className="screen-actions">
            <Button variant="secondary" onClick={() => navigate("round-result")}>Résultat de manche</Button>
            <Button variant="primary" onClick={() => navigate("game")}>Question suivante</Button>
          </div>
        </Panel>
      </section>
    </ScreenFrame>
  );
}
