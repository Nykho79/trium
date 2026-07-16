import { Button } from "../components/Button";
import { Panel } from "../components/Panel";
import { ScreenFrame } from "../components/ScreenFrame";
import { useGameStore } from "../../app/store/gameStore";

export function RoundResultScreen() {
  const navigate = useGameStore((state) => state.navigate);
  const session = useGameStore((state) => state.session);
  return (
    <ScreenFrame title="Résultat de manche">
      <section className="result-screen">
        <Panel className="result-card">
          <span className="category-label">Résultat de manche</span>
          <h1>{session.score.teamScore.toLocaleString("fr-FR")} points</h1>
          <p>La base d'interface est prête pour brancher les règles pures de score par manche.</p>
          <div className="screen-actions">
            <Button variant="secondary" onClick={() => navigate("game")}>Revoir la scène</Button>
            <Button variant="primary" onClick={() => navigate("finale")}>Aller à la finale</Button>
          </div>
        </Panel>
      </section>
    </ScreenFrame>
  );
}
