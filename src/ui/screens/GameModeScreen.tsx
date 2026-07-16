import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { ScreenFrame } from "../components/ScreenFrame";
import { useGameStore } from "../../app/store/gameStore";

const modes = [
  { id: "express", label: "Express", duration: "25 min", description: "Une version courte pour tester les bases.", enabled: false },
  { id: "classic", label: "Classique", duration: "45 min", description: "Le format V1 active : toutes les fondations de TRIUM en rythme TV.", enabled: true },
  { id: "adventure", label: "Grande aventure", duration: "75 min", description: "Une partie longue avec plus de risques et de reprises.", enabled: false },
] as const;

export function GameModeScreen() {
  const navigate = useGameStore((state) => state.navigate);
  const startNewGame = useGameStore((state) => state.startNewGame);

  return (
    <ScreenFrame title="Modes de partie">
      <section className="setup-screen general-screen">
        <div className="screen-heading">
          <Badge tone="violet">Format</Badge>
          <h1>Modes de partie</h1>
          <p>Trois formats sont prepares. Dans la V1, seul le mode classique est activé.</p>
        </div>
        <div className="mode-grid">
          {modes.map((mode) => (
            <Card key={mode.id} accent={mode.enabled ? "cyan" : "neutral"} className={!mode.enabled ? "is-disabled" : ""}>
              <div className="mode-card-head">
                <h2>{mode.label}</h2>
                <Badge tone={mode.enabled ? "success" : "neutral"}>{mode.enabled ? "Actif" : "Bientot"}</Badge>
              </div>
              <strong>{mode.duration}</strong>
              <p>{mode.description}</p>
              <Button
                variant={mode.enabled ? "primary" : "secondary"}
                disabled={!mode.enabled}
                onClick={() => startNewGame("trium-classique-v1")}
              >
                {mode.enabled ? "Choisir le mode classique" : "Indisponible en V1"}
              </Button>
            </Card>
          ))}
        </div>
        <Button variant="secondary" onClick={() => navigate("player-setup")}>Retour aux joueurs</Button>
      </section>
    </ScreenFrame>
  );
}