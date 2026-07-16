import { Button } from "../components/Button";
import { ScreenFrame } from "../components/ScreenFrame";
import { useGameStore } from "../../app/store/gameStore";

export function GameIntroScreen() {
  const navigate = useGameStore((state) => state.navigate);
  const players = useGameStore((state) => state.session.players);
  return (
    <ScreenFrame title="Introduction de partie">
      <section className="intro-screen">
        <h1>Équipe prête</h1>
        <p>{players.map((player) => player.name).join(" · ")}</p>
        <strong>Objectif : construire le meilleur score collectif avant la Convergence finale.</strong>
        <Button variant="primary" onClick={() => navigate("game")}>Lancer la première question</Button>
      </section>
    </ScreenFrame>
  );
}
