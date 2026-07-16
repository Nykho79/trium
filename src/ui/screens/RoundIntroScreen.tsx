import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { RoundHeader } from "../components/RoundHeader";
import { ScreenFrame } from "../components/ScreenFrame";
import { useGameStore } from "../../app/store/gameStore";

export function RoundIntroScreen() {
  const navigate = useGameStore((state) => state.navigate);
  const session = useGameStore((state) => state.session);
  const gameState = useGameStore((state) => state.gameState);
  const round = gameState?.config.rounds[gameState.currentRoundIndex];

  return (
    <ScreenFrame title="Introduction de manche">
      <section className="general-screen round-intro-screen">
        <RoundHeader roundLabel={round?.label ?? "Grille des savoirs"} questionIndex={1} questionCount={round?.questionCount ?? 5} categoryLabel="Preparation de manche" />
        <Card accent="cyan" className="round-intro-card">
          <Badge tone="cyan">Manche {gameState ? gameState.currentRoundIndex + 1 : 1}</Badge>
          <h1>{round?.label ?? "Grille des savoirs"}</h1>
          <p>{round?.description ?? "Choix libre de categories et de valeurs."}</p>
          <div className="resume-summary">
            <div><span>Score actuel</span><strong>{session.score.teamScore.toLocaleString("fr-FR")}</strong></div>
            <div><span>Questions</span><strong>{round?.questionCount ?? 5}</strong></div>
            <div><span>Capitaine</span><strong>{session.players[0].name}</strong></div>
          </div>
          <Button variant="primary" onClick={() => navigate("game")}>Lancer la première question</Button>
        </Card>
      </section>
    </ScreenFrame>
  );
}