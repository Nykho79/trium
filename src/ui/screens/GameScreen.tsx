import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { AnswerButton } from "../components/AnswerButton";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { CaptainIndicator } from "../components/CaptainIndicator";
import { FeedbackBanner } from "../components/FeedbackBanner";
import { JokerButton } from "../components/JokerButton";
import { Panel } from "../components/Panel";
import { PlayerBadge } from "../components/PlayerBadge";
import { RoundHeader } from "../components/RoundHeader";
import { ScoreBoard } from "../components/ScoreBoard";
import { ScreenFrame } from "../components/ScreenFrame";
import { Timer } from "../components/Timer";
import { useGameStore } from "../../app/store/gameStore";
import { loadQuestionBank } from "../../data/loadQuestionBank";
import type { KnowledgeGridQuestion, Question } from "../../core/types";
import { buildKnowledgeGrid, selectKnowledgeGridQuestion } from "../../rounds/knowledge-grid";

function isKnowledgeGridQuestion(question: Question): question is KnowledgeGridQuestion {
  return question.kind === "knowledge-grid" && question.type === "multiple_choice" && question.editorialStatus === "approved";
}

function correctLabel(question: KnowledgeGridQuestion): string {
  return question.options.find((option) => option.id === question.correctOptionId)?.label ?? question.correctOptionId.toUpperCase();
}

export function GameScreen() {
  const session = useGameStore((state) => state.session);
  const selectedAnswerId = useGameStore((state) => state.selectedAnswerId);
  const gameState = useGameStore((state) => state.gameState);
  const engineError = useGameStore((state) => state.engineError);
  const selectAnswer = useGameStore((state) => state.selectAnswer);
  const loadCurrentQuestion = useGameStore((state) => state.loadCurrentQuestion);
  const submitCurrentAnswer = useGameStore((state) => state.submitCurrentAnswer);
  const revealCurrentAnswer = useGameStore((state) => state.revealCurrentAnswer);
  const completeCurrentRound = useGameStore((state) => state.completeCurrentRound);
  const navigate = useGameStore((state) => state.navigate);
  const [questions, setQuestions] = useState<KnowledgeGridQuestion[]>([]);
  const [loadError, setLoadError] = useState<string | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    void loadQuestionBank()
      .then((bank) => {
        if (!cancelled) {
          setQuestions(bank.questions.filter(isKnowledgeGridQuestion));
          setLoadError(undefined);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : "Impossible de charger les questions.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const round = gameState?.config.rounds[gameState.currentRoundIndex];
  const answeredCount = gameState?.currentRoundState?.answeredQuestionIds.length ?? 0;
  const targetCount = round?.questionCount ?? 8;
  const activeQuestion = questions.find((question) => question.id === gameState?.activeQuestionId);
  const captain = gameState?.config.players.find((player) => player.id === gameState.captainPlayerId) ?? session.players[0];
  const isQuestionActive = gameState?.status === "question_active" || gameState?.status === "answer_locked";
  const isLocked = gameState?.status === "answer_locked";
  const board = useMemo(() => buildKnowledgeGrid({
    questions,
    usedQuestionIds: gameState?.usedQuestionIds ?? [],
    seed: gameState?.config.seed ?? "trium-grid",
  }), [gameState?.config.seed, gameState?.usedQuestionIds, questions]);

  const chooseCell = (cellId: string) => {
    try {
      const questionId = selectKnowledgeGridQuestion(board, cellId);
      loadCurrentQuestion({ questions, questionId });
    } catch {
      // Invalid selections are normally prevented by disabled cell states.
    }
  };

  const submitAnswer = () => {
    if (selectedAnswerId) {
      submitCurrentAnswer(selectedAnswerId);
    }
  };

  if (!gameState || !round) {
    return (
      <ScreenFrame title="Ecran de jeu">
        <section className="general-screen result-screen">
          <Panel className="result-card">
            <Badge tone="amber">Partie absente</Badge>
            <h1>Aucune manche active</h1>
            <Button variant="primary" onClick={() => navigate("home")}>Retour accueil</Button>
          </Panel>
        </section>
      </ScreenFrame>
    );
  }

  return (
    <ScreenFrame title="Ecran de jeu">
      <section className="game-layout knowledge-grid-layout">
        <Panel className="game-stage knowledge-grid-stage">
          <RoundHeader roundLabel={round.label} questionIndex={Math.min(answeredCount + 1, targetCount)} questionCount={targetCount} categoryLabel="Le capitaine choisit une case" />
          <ScoreBoard score={session.score.teamScore} streak={session.score.streak} roundLabel={`Question ${Math.min(answeredCount + 1, targetCount)}`} />

          {loadError ? <FeedbackBanner tone="warning" title="Banque indisponible" message={loadError} /> : null}
          {engineError ? <FeedbackBanner tone="warning" title="Action impossible" message={engineError} /> : null}

          {!isQuestionActive ? (
            <div className="knowledge-grid-board" role="grid" aria-label="Grille des savoirs">
              {board.columns.map((column) => (
                <section key={column.categoryId} className="knowledge-grid-column" aria-label={column.categoryLabel}>
                  <h2>{column.categoryLabel}</h2>
                  {column.cells.map((cell) => (
                    <motion.button
                      key={cell.id}
                      type="button"
                      className={`knowledge-grid-cell ${cell.isPlayed ? "is-played" : ""}`}
                      disabled={!cell.isAvailable || answeredCount >= targetCount}
                      aria-label={`${cell.categoryLabel} ${cell.value}`}
                      onClick={() => chooseCell(cell.id)}
                      {...(cell.isAvailable ? { whileHover: { y: -3 }, whileTap: { scale: 0.98 } } : {})}
                    >
                      <span>{cell.value}</span>
                    </motion.button>
                  ))}
                </section>
              ))}
            </div>
          ) : null}

          {isQuestionActive && activeQuestion ? (
            <div className="question-live knowledge-question-live">
              <Timer remainingMs={Math.max(0, (gameState.timer?.expiresAt ?? Date.now()) - Date.now())} totalMs={(gameState.timer?.expiresAt ?? 0) - (gameState.timer?.startedAt ?? 0) || 30_000} />
              <div className="question-value-strip">
                <Badge tone="amber">{activeQuestion.value} points</Badge>
                <span>{activeQuestion.categoryLabel} - difficulte {activeQuestion.difficulty}</span>
              </div>
              <h1>{activeQuestion.prompt}</h1>
              <div className="answer-grid live">
                {activeQuestion.options.map((answer) => {
                  const state = isLocked
                    ? answer.id === activeQuestion.correctOptionId ? "correct" : answer.id === selectedAnswerId ? "incorrect" : "disabled"
                    : selectedAnswerId === answer.id ? "selected" : "idle";
                  return (
                    <AnswerButton
                      key={answer.id}
                      answerId={answer.id}
                      label={answer.label}
                      state={state}
                      disabled={isLocked}
                      onClick={() => selectAnswer(answer.id)}
                    />
                  );
                })}
              </div>
              {isLocked ? <FeedbackBanner tone="warning" title="Reponse verrouillee" message={`Revelation prete. Bonne reponse attendue : ${correctLabel(activeQuestion)}.`} /> : null}
            </div>
          ) : null}

          <div className="screen-actions in-stage knowledge-actions">
            <Button variant="secondary" onClick={() => navigate("home")}>Quitter</Button>
            {!isQuestionActive && answeredCount >= targetCount ? <Button variant="primary" onClick={() => completeCurrentRound()}>Resultat de manche</Button> : null}
            {gameState.status === "question_active" ? <Button variant="primary" onClick={submitAnswer} disabled={!selectedAnswerId} data-testid="lock-answer-button">Verrouiller la reponse</Button> : null}
            {gameState.status === "answer_locked" ? <Button variant="primary" onClick={() => revealCurrentAnswer(questions)} data-testid="reveal-answer-button">Reveler la reponse</Button> : null}
          </div>
        </Panel>
        <aside className="side-rail" aria-label="Informations de partie">
          <CaptainIndicator playerName={captain.name} />
          <Panel>
            <h2>Jokers</h2>
            <div className="joker-list">
              <JokerButton label="50/50" remaining={session.score.jokers["fifty-fifty"]} icon="target" />
              <JokerButton label="Deuxieme chance" remaining={session.score.jokers["second-chance"]} icon="shield" />
              <JokerButton label="Indice" remaining={session.score.jokers["contextual-clue"]} icon="spark" />
              <JokerButton label="Temps +" remaining={session.score.jokers["extra-time"]} icon="timer" />
            </div>
          </Panel>
          <Panel>
            <h2>Progression</h2>
            <div className="knowledge-progress-card">
              <strong>{answeredCount} / {targetCount}</strong>
              <span>questions selectionnees</span>
            </div>
          </Panel>
          <Panel>
            <h2>Equipe</h2>
            <div className="team-list">
              {session.players.map((player) => <PlayerBadge key={player.id} player={player} isCaptain={player.id === captain.id} />)}
            </div>
          </Panel>
        </aside>
      </section>
    </ScreenFrame>
  );
}
