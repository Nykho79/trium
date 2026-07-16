import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { ProgressBar } from "../components/ProgressBar";
import { ScreenFrame } from "../components/ScreenFrame";
import { useGameStore } from "../../app/store/gameStore";

export function RoundResultScreen() {
  const navigate = useGameStore((state) => state.navigate);
  const session = useGameStore((state) => state.session);
  const gameState = useGameStore((state) => state.gameState);
  const round = gameState?.config.rounds[gameState.currentRoundIndex];
  const answered = gameState?.currentRoundState?.answeredQuestionIds.length ?? session.usedQuestionIds.length;
  const total = round?.questionCount ?? 5;

  return (
    <ScreenFrame title="Résultat de manche">
      <section className="result-screen general-screen">
        <Card accent="amber" className="result-card">
          <Badge tone="amber">Resultat de manche</Badge>
          <h1>{session.score.teamScore.toLocaleString("fr-FR")} points</h1>
          <p>{round?.label ?? "Grille des savoirs"} est prete a transmettre ses avantages vers la suite.</p>
          <ProgressBar value={Math.min(answered, total)} max={total} label="Questions traitees" tone="amber" />
          <div className="screen-actions">
            <Button variant="secondary" onClick={() => navigate("game")}>Revoir la scène</Button>
            <Button variant="secondary" onClick={() => navigate("round-intro")}>Manche suivante</Button>
            <Button variant="primary" onClick={() => navigate("game-result")}>Bilan complet</Button>
          </div>
        </Card>
      </section>
    </ScreenFrame>
  );
}