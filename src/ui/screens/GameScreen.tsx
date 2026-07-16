import { AnswerButton } from "../components/AnswerButton";
import { Button } from "../components/Button";
import { JokerButton } from "../components/JokerButton";
import { Panel } from "../components/Panel";
import { PlayerBadge } from "../components/PlayerBadge";
import { RoundHeader } from "../components/RoundHeader";
import { ScoreBoard } from "../components/ScoreBoard";
import { ScreenFrame } from "../components/ScreenFrame";
import { Timer } from "../components/Timer";
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
          <RoundHeader roundLabel="Grille des savoirs" questionIndex={1} questionCount={5} categoryLabel="Culture générale · Géographie française" />
          <ScoreBoard score={session.score.teamScore} streak={session.score.streak} roundLabel="Question 1" />
          <div className="question-live">
            <Timer remainingMs={30_000} totalMs={30_000} />
            <h1>Dans quelle ville française se trouve la Place Stanislas ?</h1>
            <div className="answer-grid live">
              {answers.map((answer) => (
                <AnswerButton
                  key={answer.id}
                  answerId={answer.id}
                  label={answer.label}
                  state={selectedAnswerId === answer.id ? "selected" : "idle"}
                  onClick={() => selectAnswer(answer.id)}
                />
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
              <JokerButton label="50/50" remaining={session.score.jokers["fifty-fifty"]} icon="target" />
              <JokerButton label="Deuxième chance" remaining={session.score.jokers["second-chance"]} icon="shield" />
              <JokerButton label="Indice" remaining={session.score.jokers["contextual-clue"]} icon="spark" />
              <JokerButton label="Temps +" remaining={session.score.jokers["extra-time"]} icon="timer" />
            </div>
          </Panel>
          <Panel>
            <h2>Équipe</h2>
            <div className="team-list">
              {session.players.map((player, index) => <PlayerBadge key={player.id} player={player} isCaptain={index === 0} />)}
            </div>
          </Panel>
        </aside>
      </section>
    </ScreenFrame>
  );
}