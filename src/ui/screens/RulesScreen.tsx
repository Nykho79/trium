import { Button } from "../components/Button";
import { ScreenFrame } from "../components/ScreenFrame";
import { useGameStore } from "../../app/store/gameStore";

export function RulesScreen() {
  const navigate = useGameStore((state) => state.navigate);
  return (
    <ScreenFrame title="Règles">
      <section className="text-screen">
        <h1>Règles</h1>
        <p>TRIUM se joue exactement à trois joueurs devant le même écran. L'équipe discute, choisit une réponse et progresse ensemble.</p>
        <ul>
          <li>Le score est collectif.</li>
          <li>Une question jouée ne revient pas dans la partie.</li>
          <li>Les jokers sont partagés par l'équipe.</li>
          <li>La finale utilise les avantages gagnés pendant les manches.</li>
        </ul>
        <Button variant="primary" onClick={() => navigate("home")}>Retour à l'accueil</Button>
      </section>
    </ScreenFrame>
  );
}
