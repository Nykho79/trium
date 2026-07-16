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
  const startConfiguredGame = useGameStore((state) => state.startConfiguredGame);
  const startCurrentRound = useGameStore((state) => state.startCurrentRound);
  const round = gameState?.config.rounds[gameState.currentRoundIndex];
  const captain = gameState?.config.players.find((player) => player.id === gameState.captainPlayerId) ?? session.players[0];

  const enterRound = () => {
    if (gameState?.status === "idle" || gameState?.status === "setup") {
      startConfiguredGame();
    }
    if (gameState?.status !== "round_intro") {
      startCurrentRound();
    }
    navigate("game");
  };

  return (
    <ScreenFrame title="Introduction de manche">
      <section className="general-screen round-intro-screen">
        <RoundHeader roundLabel={round?.label ?? "Grille des savoirs"} questionIndex={1} questionCount={round?.questionCount ?? 8} categoryLabel="Préparation de manche" />
        <Card accent="cyan" className="round-intro-card">
          <Badge tone="cyan">Manche {gameState ? gameState.currentRoundIndex + 1 : 1}</Badge>
          <h1>{round?.label ?? "Grille des savoirs"}</h1>
          <p>{round?.description ?? "Choix libre de catégories et de valeurs."}</p>
          <div className="resume-summary">
            <div><span>Score actuel</span><strong>{session.score.teamScore.toLocaleString("fr-FR")}</strong></div>
            <div><span>Questions</span><strong>{round?.questionCount ?? 8}</strong></div>
            <div><span>Capitaine</span><strong>{captain.name}</strong></div>
          </div>
          <Button variant="primary" onClick={enterRound}>Afficher la grille</Button>
        </Card>
      </section>
    </ScreenFrame>
  );
}
