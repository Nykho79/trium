import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { ScreenFrame } from "../components/ScreenFrame";
import { useGameStore } from "../../app/store/gameStore";

export function FinaleScreen() {
  const navigate = useGameStore((state) => state.navigate);
  return (
    <ScreenFrame title="Finale">
      <section className="intro-screen general-screen">
        <Badge tone="amber">Finale</Badge>
        <h1>Convergence finale</h1>
        <Card accent="amber">
          <p>Cinq étapes, des avantages acquis et une dernière décision collective.</p>
        </Card>
        <Button variant="primary" onClick={() => navigate("game-result")}>Afficher le bilan</Button>
      </section>
    </ScreenFrame>
  );
}