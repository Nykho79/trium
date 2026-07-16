import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { AnswerButton } from "../components/AnswerButton";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { CaptainIndicator } from "../components/CaptainIndicator";
import { ConfirmationDialog } from "../components/ConfirmationDialog";
import { FeedbackBanner } from "../components/FeedbackBanner";
import { JokerButton } from "../components/JokerButton";
import { Panel } from "../components/Panel";
import { PlayerBadge } from "../components/PlayerBadge";
import { RoundHeader } from "../components/RoundHeader";
import { ScoreBoard } from "../components/ScoreBoard";
import { ScreenFrame } from "../components/ScreenFrame";
import { Timer } from "../components/Timer";
import { useAudioStore } from "../../app/store/audioStore";
import { useGameStore } from "../../app/store/gameStore";
import { useSettingsStore } from "../../app/store/settingsStore";
import { playJokerSound } from "../audio/soundManager";
import { loadQuestionBank } from "../../data/loadQuestionBank";
import type { JokerType, KnowledgeGridQuestion, Question } from "../../core/types";
import { buildKnowledgeGrid, selectKnowledgeGridQuestion } from "../../rounds/knowledge-grid";

type VoteState = {
  active: boolean;
  currentIndex: number;
  votes: string[];
  majority?: string | undefined;
};

const jokerLabels: Record<JokerType, string> = {
  fifty_fifty: "50/50",
  second_chance: "Deuxieme chance",
  change_question: "Changer",
  contextual_hint: "Indice",
  extra_time: "Temps +",
  team_vote: "Vote equipe",
};

function isKnowledgeGridQuestion(question: Question): question is KnowledgeGridQuestion {
  return question.kind === "knowledge-grid" && question.type === "multiple_choice" && question.editorialStatus === "approved";
}

function correctLabel(question: KnowledgeGridQuestion): string {
  return question.options.find((option) => option.id === question.correctOptionId)?.label ?? question.correctOptionId.toUpperCase();
}

function majorityOf(votes: readonly string[]): string | undefined {
  const counts = new Map<string, number>();
  for (const vote of votes) {
    counts.set(vote, (counts.get(vote) ?? 0) + 1);
  }
  return [...counts.entries()].sort((left, right) => right[1] - left[1])[0]?.[0];
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
  const applyGameJoker = useGameStore((state) => state.applyGameJoker);
  const navigate = useGameStore((state) => state.navigate);
  const soundEnabled = useSettingsStore((state) => state.soundEnabled);
  const masterMuted = useAudioStore((state) => state.masterMuted);
  const [questions, setQuestions] = useState<KnowledgeGridQuestion[]>([]);
  const [loadError, setLoadError] = useState<string | undefined>(undefined);
  const [pendingJoker, setPendingJoker] = useState<JokerType | undefined>(undefined);
  const [voteState, setVoteState] = useState<VoteState>({ active: false, currentIndex: 0, votes: [] });

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

  useEffect(() => {
    setVoteState({ active: false, currentIndex: 0, votes: [] });
  }, [gameState?.activeQuestionId]);

  const round = gameState?.config.rounds[gameState.currentRoundIndex];
  const answeredCount = gameState?.currentRoundState?.answeredQuestionIds.length ?? 0;
  const targetCount = round?.questionCount ?? 8;
  const activeQuestion = questions.find((question) => question.id === gameState?.activeQuestionId);
  const captain = gameState?.config.players.find((player) => player.id === gameState.captainPlayerId) ?? session.players[0];
  const isQuestionActive = gameState?.status === "question_active" || gameState?.status === "answer_locked";
  const isLocked = gameState?.status === "answer_locked";
  const canUseJoker = gameState?.status === "question_active" && activeQuestion !== undefined;
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

  const requestJoker = (joker: JokerType) => {
    setPendingJoker(joker);
  };

  const confirmJoker = () => {
    if (!pendingJoker) {
      return;
    }
    applyGameJoker(pendingJoker, questions);
    if (pendingJoker === "team_vote") {
      setVoteState({ active: true, currentIndex: 0, votes: [] });
    }
    playJokerSound(soundEnabled && !masterMuted);
    setPendingJoker(undefined);
  };

  const castVote = (answerId: string) => {
    setVoteState((state) => {
      const votes = [...state.votes, answerId];
      if (votes.length >= 3) {
        return { active: true, currentIndex: 3, votes, majority: majorityOf(votes) };
      }
      return { active: true, currentIndex: state.currentIndex + 1, votes };
    });
  };

  const jokerRemaining = (joker: JokerType): number => gameState?.jokers.available[joker] ?? 0;
  const jokerUsed = (joker: JokerType): boolean => (gameState?.jokers.used[joker] ?? 0) > 0;
  const jokerDisabled = (joker: JokerType): boolean => !canUseJoker || jokerRemaining(joker) <= 0 || jokerUsed(joker) || (gameState?.jokers.disabled.includes(joker) ?? false);

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
          {gameState.jokerEffects.contextualHint ? <FeedbackBanner tone="info" title="Indice contextuel" message={gameState.jokerEffects.contextualHint} /> : null}
          {gameState.jokerEffects.secondChanceConsumed && gameState.status === "question_active" ? <FeedbackBanner tone="warning" title="Seconde chance" message="Premiere reponse incorrecte. La prochaine bonne reponse vaudra 50 % des points." /> : null}

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
              {voteState.active ? (
                <Panel className="team-vote-panel">
                  {voteState.majority ? (
                    <>
                      <Badge tone="success">Majorite revelee</Badge>
                      <strong>{activeQuestion.options.find((option) => option.id === voteState.majority)?.label ?? voteState.majority}</strong>
                      <p>Le capitaine choisit maintenant la reponse finale.</p>
                    </>
                  ) : (
                    <>
                      <Badge tone="violet">Vote masque</Badge>
                      <strong>{session.players[voteState.currentIndex]?.name ?? "Joueur"}</strong>
                      <p>{voteState.votes.length} vote(s) enregistres. Les choix precedents restent masques.</p>
                      <div className="answer-grid live">
                        {activeQuestion.options.map((answer) => <AnswerButton key={answer.id} answerId={answer.id} label={answer.label} onClick={() => castVote(answer.id)} />)}
                      </div>
                    </>
                  )}
                </Panel>
              ) : null}
              <div className="answer-grid live">
                {activeQuestion.options.map((answer) => {
                  const eliminated = gameState.jokerEffects.eliminatedOptionIds.includes(answer.id);
                  const state = eliminated
                    ? "disabled"
                    : isLocked
                      ? answer.id === activeQuestion.correctOptionId ? "correct" : answer.id === selectedAnswerId ? "incorrect" : "disabled"
                      : selectedAnswerId === answer.id ? "selected" : "idle";
                  return (
                    <AnswerButton
                      key={answer.id}
                      answerId={answer.id}
                      label={answer.label}
                      state={state}
                      disabled={isLocked || eliminated}
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
              <JokerButton label="50/50" remaining={jokerRemaining("fifty_fifty")} icon="target" disabled={jokerDisabled("fifty_fifty")} onClick={() => requestJoker("fifty_fifty")} data-testid="joker-fifty_fifty" />
              <JokerButton label="Deuxieme chance" remaining={jokerRemaining("second_chance")} icon="shield" disabled={jokerDisabled("second_chance")} onClick={() => requestJoker("second_chance")} data-testid="joker-second_chance" />
              <JokerButton label="Changer" remaining={jokerRemaining("change_question")} icon="arrow" disabled={jokerDisabled("change_question")} onClick={() => requestJoker("change_question")} data-testid="joker-change_question" />
              <JokerButton label="Indice" remaining={jokerRemaining("contextual_hint")} icon="spark" disabled={jokerDisabled("contextual_hint")} onClick={() => requestJoker("contextual_hint")} data-testid="joker-contextual_hint" />
              <JokerButton label="Temps +" remaining={jokerRemaining("extra_time")} icon="timer" disabled={jokerDisabled("extra_time")} onClick={() => requestJoker("extra_time")} data-testid="joker-extra_time" />
              <JokerButton label="Vote equipe" remaining={jokerRemaining("team_vote")} icon="captain" disabled={jokerDisabled("team_vote")} onClick={() => requestJoker("team_vote")} data-testid="joker-team_vote" />
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
      <ConfirmationDialog
        isOpen={pendingJoker !== undefined}
        title={pendingJoker ? `Utiliser ${jokerLabels[pendingJoker]}` : "Utiliser un joker"}
        message="Ce joker sera consomme pour le reste de la partie. Confirmer son utilisation ?"
        confirmLabel="Utiliser"
        onConfirm={confirmJoker}
        onCancel={() => setPendingJoker(undefined)}
      />
    </ScreenFrame>
  );
}
