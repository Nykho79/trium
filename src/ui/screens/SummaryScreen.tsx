import { Button } from "../components/Button";
import { Panel } from "../components/Panel";
import { ScreenFrame } from "../components/ScreenFrame";
import { useGameStore } from "../../app/store/gameStore";

export function SummaryScreen() {
  const resetDemo = useGameStore((state) => state.resetDemo);
  const session = useGameStore((state) => state.session);
  return (
    <ScreenFrame title="Bilan détaillé">
      <section className="result-screen">
        <Panel className="result-card">
          <span className="category-label">Bilan détaillé</span>
          <h1>{session.score.teamScore.toLocaleString("fr-FR")} points</h1>
          <p>Les prochains lots brancheront le détail par manche et les avantages de finale.</p>
          <Button variant="primary" onClick={resetDemo}>Nouvelle partie</Button>
        </Panel>
      </section>
    </ScreenFrame>
  );
}
