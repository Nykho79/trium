import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { Icon } from "../components/Icon";
import { Panel } from "../components/Panel";
import { PlayerBadge } from "../components/PlayerBadge";
import { ScreenFrame } from "../components/ScreenFrame";
import { useGameStore } from "../../app/store/gameStore";

export function HomeScreen() {
  const navigate = useGameStore((state) => state.navigate);
  const session = useGameStore((state) => state.session);
  const hasSavedGame = useGameStore((state) => state.hasSavedGame);

  return (
    <ScreenFrame title="Accueil TRIUM">
      <div className="home-grid general-home">
        <section className="brand-stage" aria-labelledby="home-title">
          <div className="orbital-mark" aria-hidden="true" />
          <div className="brand-crown" aria-hidden="true"><Icon name="spark" /></div>
          <Badge tone="cyan">Quiz cooperatif local</Badge>
          <h1 id="home-title">TRIUM</h1>
          <p className="brand-subtitle">Trois joueurs. Un ecran. Une equipe.</p>
          <div className="home-primary-actions">
            <Button variant="primary" icon="play" onClick={() => navigate("player-setup")} data-testid="start-button">Nouvelle partie</Button>
            <Button variant="secondary" icon="shield" onClick={() => navigate("resume-game")}>Reprendre</Button>
          </div>
          <div className="home-actions">
            <Button variant="secondary" icon="book" onClick={() => navigate("rules")}>Règles</Button>
            <Button variant="secondary" icon="settings" onClick={() => navigate("settings")}>Paramètres</Button>
          </div>
        </section>

        <Panel className="stage-panel home-status-panel" labelledBy="home-status-title">
          <div className="stage-topline">
            <span id="home-status-title">Partie locale</span>
            <span>{hasSavedGame ? "Sauvegarde disponible" : "Aucune reprise"}</span>
          </div>
          <div className="score-strip compact">
            <div><span>Format V1</span><strong>Classique</strong></div>
            <div><span>Score equipe</span><strong>{session.score.teamScore.toLocaleString("fr-FR")}</strong></div>
            <div><span>Joueurs</span><strong>3</strong></div>
          </div>
          <div className="team-list home-team-list" aria-label="Equipe configuree">
            {session.players.map((player) => <PlayerBadge key={player.id} player={player} />)}
          </div>
          <section className="question-preview" aria-labelledby="home-preview-title">
            <h2 id="home-preview-title">Prochaine experience</h2>
            <p>Des manches courtes, des jokers partagés et une finale en convergence.</p>
          </section>
        </Panel>
      </div>
    </ScreenFrame>
  );
}