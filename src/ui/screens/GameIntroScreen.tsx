import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { Panel } from "../components/Panel";
import { PlayerBadge } from "../components/PlayerBadge";
import { ScreenFrame } from "../components/ScreenFrame";
import { useGameStore } from "../../app/store/gameStore";

export function GameIntroScreen() {
  const navigate = useGameStore((state) => state.navigate);
  const players = useGameStore((state) => state.session.players);
  const gameState = useGameStore((state) => state.gameState);

  return (
    <ScreenFrame title="Introduction de partie">
      <section className="intro-screen general-screen">
        <Badge tone="success">Partie creee</Badge>
        <h1>Equipe prete</h1>
        <div className="team-list intro-team-list">
          {players.map((player, index) => <PlayerBadge key={player.id} player={player} isCaptain={index === 0} />)}
        </div>
        <Panel className="intro-brief">
          <p>Objectif : construire le meilleur score collectif avant la Convergence finale.</p>
          <strong>Seed : {gameState?.config.seed ?? "partie locale"}</strong>
        </Panel>
        <Button variant="primary" onClick={() => navigate("round-intro")}>Entrer dans la première manche</Button>
      </section>
    </ScreenFrame>
  );
}