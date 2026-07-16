import { Button } from "../components/Button";
import { Panel } from "../components/Panel";
import { ScreenFrame } from "../components/ScreenFrame";
import { useGameStore } from "../../app/store/gameStore";

const answers = [
  { id: "a", label: "Nancy" },
  { id: "b", label: "Metz" },
  { id: "c", label: "Dijon" },
  { id: "d", label: "Besançon" },
] as const;

export function GameScreen() {
  const session = useGameStore((state) => state.session);
  const selectedAnswerId = useGameStore((state) => state.selectedAnswerId);
  const selectAnswer = useGameStore((state) => state.selectAnswer);
  const revealAnswer = useGameStore((state) => state.revealAnswer);
  const navigate = useGameStore((state) => state.navigate);

  return (
    <ScreenFrame title="Écran de jeu">
      <section className="game-layout">
        <Panel className="game-stage">
          <div className="stage-topline">
            <span>Grille des savoirs</span>
            <span>Question 1 / 5</span>
          </div>
          <div className="score-strip compact">
            <div><span>Score équipe</span><strong>{session.score.teamScore.toLocaleString("fr-FR")}</strong></div>
            <div><span>Série</span><strong>{session.score.streak}</strong></div>
            <div><span>Chrono</span><strong>00:30</strong></div>
          </div>
          <div className="question-live">
            <span className="category-label">Culture générale · Géographie française</span>
            <h1>Dans quelle ville française se trouve la Place Stanislas ?</h1>
            <div className="answer-grid live">
              {answers.map((answer) => (
                <Button
                  key={answer.id}
                  variant="answer"
                  selected={selectedAnswerId === answer.id}
                  onClick={() => selectAnswer(answer.id)}
                  aria-pressed={selectedAnswerId === answer.id}
                >
                  <span className="answer-letter">{answer.id.toUpperCase()}</span>
                  {answer.label}
                </Button>
              ))}
            </div>
          </div>
          <div className="screen-actions in-stage">
            <Button variant="secondary" onClick={() => navigate("home")}>Quitter</Button>
            <Button variant="primary" onClick={revealAnswer} disabled={!selectedAnswerId}>Valider la réponse</Button>
          </div>
        </Panel>
        <aside className="side-rail" aria-label="Informations de partie">
          <Panel>
            <h2>Jokers</h2>
            <div className="joker-list">
              <span>50/50 <strong>{session.score.jokers["fifty-fifty"]}</strong></span>
              <span>Deuxième chance <strong>{session.score.jokers["second-chance"]}</strong></span>
              <span>Indice <strong>{session.score.jokers["contextual-clue"]}</strong></span>
              <span>Temps + <strong>{session.score.jokers["extra-time"]}</strong></span>
            </div>
          </Panel>
          <Panel>
            <h2>Équipe</h2>
            <div className="team-list">
              {session.players.map((player) => <span key={player.id}>{player.name}</span>)}
            </div>
          </Panel>
        </aside>
      </section>
    </ScreenFrame>
  );
}
