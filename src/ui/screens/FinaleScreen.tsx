import { Button } from "../components/Button";
import { ScreenFrame } from "../components/ScreenFrame";
import { useGameStore } from "../../app/store/gameStore";

export function FinaleScreen() {
  const navigate = useGameStore((state) => state.navigate);
  return (
    <ScreenFrame title="Finale">
      <section className="intro-screen">
        <h1>Convergence finale</h1>
        <p>Cinq étapes, des avantages acquis et une dernière décision collective.</p>
        <Button variant="primary" onClick={() => navigate("summary")}>Afficher le bilan</Button>
      </section>
    </ScreenFrame>
  );
}
