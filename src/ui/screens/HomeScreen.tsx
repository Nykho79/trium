import { Button } from "../components/Button";
import { Icon } from "../components/Icon";
import { Panel } from "../components/Panel";
import { ScreenFrame } from "../components/ScreenFrame";
import { useGameStore } from "../../app/store/gameStore";
import type { Player } from "../../core/types";

function PlayerCard({ player, index }: { player: Player; index: number }) {
  return (
    <div className={`player-card player-${player.color}`}>
      <span className="player-number">{index + 1}</span>
      <div className="player-avatar" aria-hidden="true"><Icon name="team" /></div>
      <strong>{player.name}</strong>
      <span>Prêt</span>
    </div>
  );
}

export function HomeScreen() {
  const navigate = useGameStore((state) => state.navigate);
  const session = useGameStore((state) => state.session);

  return (
    <ScreenFrame title="Accueil TRIUM">
      <div className="home-grid">
        <section className="brand-stage" aria-labelledby="home-title">
          <div className="orbital-mark" aria-hidden="true" />
          <div className="brand-crown" aria-hidden="true"><Icon name="spark" /></div>
          <h1 id="home-title">TRIUM</h1>
          <p className="brand-subtitle">Le quiz coopératif local à 3 joueurs</p>
          <div className="team-row" aria-label="Équipe de trois joueurs">
            {session.players.map((player, index) => <PlayerCard key={player.id} player={player} index={index} />)}
          </div>
          <Button variant="primary" onClick={() => navigate("player-setup")} data-testid="start-button">
            <Icon name="play" /> Commencer
          </Button>
          <div className="home-actions">
            <Button variant="secondary" onClick={() => navigate("rules")}><Icon name="book" /> Règles</Button>
            <Button variant="secondary" onClick={() => navigate("settings")}><Icon name="settings" /> Paramètres</Button>
          </div>
        </section>

        <Panel className="stage-panel" labelledBy="stage-preview-title">
          <div className="stage-topline">
            <span>Mode classique</span>
            <span><Icon name="team" /> 3 joueurs</span>
          </div>
          <div className="score-strip">
            <div><span>Manche</span><strong>2 / 5</strong></div>
            <div><span>Score équipe</span><strong>{session.score.teamScore.toLocaleString("fr-FR")}</strong></div>
            <div><span>Thème</span><strong>Culture générale</strong></div>
          </div>
          <div className="progress-rail" aria-label="Progression de la manche">
            {[1, 2, 3, 4, 5].map((step) => <span key={step} className={step <= 2 ? "active" : ""}>{step === 1 ? <Icon name="check" /> : step}</span>)}
          </div>
          <section className="question-preview" aria-labelledby="preview-question">
            <h2 id="stage-preview-title">Scène de jeu</h2>
            <p id="preview-question">Dans quelle ville française se trouve la Place Stanislas ?</p>
            <div className="answer-grid">
              {([ ["a", "Nancy"], ["b", "Metz"], ["c", "Dijon"], ["d", "Besançon"] ] as const).map(([id, label]) => (
                <button key={id} className={`preview-answer ${id === "a" ? "preview-selected" : ""}`} type="button">
                  <span>{id.toUpperCase()}</span>{label}
                </button>
              ))}
            </div>
          </section>
          <div className="joker-row" aria-label="Jokers de l'équipe">
            <span>50:50</span>
            <span>Deuxième chance</span>
            <span>Indice</span>
          </div>
        </Panel>
      </div>
    </ScreenFrame>
  );
}

