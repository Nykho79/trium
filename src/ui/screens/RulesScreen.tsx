import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { ScreenFrame } from "../components/ScreenFrame";
import { useGameStore } from "../../app/store/gameStore";

const rules = [
  "TRIUM se joue exactement a trois joueurs devant le meme ecran.",
  "L'equipe discute librement, puis le capitaine valide la reponse commune.",
  "Le capitaine change automatiquement a chaque question.",
  "Une question jouee ne revient pas dans la meme partie.",
  "Les jokers sont partages et doivent etre economises pour la finale.",
  "Le score final recompense la justesse, la serie et la gestion du temps.",
];

export function RulesScreen() {
  const navigate = useGameStore((state) => state.navigate);
  return (
    <ScreenFrame title="Règles">
      <section className="text-screen general-screen">
        <div className="screen-heading">
          <Badge tone="cyan">Regles</Badge>
          <h1>Règles du jeu</h1>
          <p>Une structure cooperative simple, lisible sur television et sans information cachee.</p>
        </div>
        <div className="general-card-grid">
          {rules.map((rule, index) => (
            <Card key={rule} accent={index === 4 ? "amber" : "cyan"}>
              <strong>{(index + 1).toString().padStart(2, "0")}</strong>
              <p>{rule}</p>
            </Card>
          ))}
        </div>
        <Button variant="primary" onClick={() => navigate("home")}>Retour à l'accueil</Button>
      </section>
    </ScreenFrame>
  );
}