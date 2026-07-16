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
import type { ClueRaceQuestion, JokerType, KnowledgeGridQuestion, MultipleChoiceOption, PressureChoiceQuestion, Question, SynapseQuestion, ConnectionsQuestion } from "../../core/types";
import { buildKnowledgeGrid, selectKnowledgeGridQuestion } from "../../rounds/knowledge-grid";
import { isClueRaceQuestion, pointsForClueIndex, visibleClues } from "../../rounds/clue-race";
import { multiplierForPressureStep, timeLimitForPressureStep } from "../../rounds/pressure-choice";
import { buildSynapseQuestionSet, isSynapseQuestion } from "../../rounds/synapse";
import { buildConnectionsQuestionSet, isConnectionsQuestion, pointsForConnectionItemIndex } from "../../rounds/connections";
import { SynapseExerciseView } from "./SynapseExerciseView";
import { ConnectionsExerciseView } from "./ConnectionsExerciseView";

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


function isPressureChoiceQuestion(question: Question): question is PressureChoiceQuestion {
  return question.kind === "pressure-choice" && question.type === "multiple_choice" && question.editorialStatus === "approved";
}
function isKnowledgeGridQuestion(question: Question): question is KnowledgeGridQuestion {
  return question.kind === "knowledge-grid" && question.type === "multiple_choice" && question.editorialStatus === "approved";
}

function majorityOf(votes: readonly string[]): string | undefined {
  const counts = new Map<string, number>();
  for (const vote of votes) {
    counts.set(vote, (counts.get(vote) ?? 0) + 1);
  }
  return [...counts.entries()].sort((left, right) => right[1] - left[1])[0]?.[0];
}

function optionLabel(options: readonly MultipleChoiceOption[] | undefined, optionId: string | string[] | undefined): string {
  if (optionId === undefined) {
    return "Reponse indisponible";
  }
  if (Array.isArray(optionId)) {
    return optionId.join(", ");
  }
  return options?.find((option) => option.id === optionId)?.label ?? optionId;
}

function clueAnswerOptions(question: ClueRaceQuestion): readonly MultipleChoiceOption[] {
  return question.options ?? [
    { id: question.answer.display, label: question.answer.display },
    { id: "option-b", label: "Proposition B" },
    { id: "option-c", label: "Proposition C" },
    { id: "option-d", label: "Proposition D" },
  ];
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
  const revealNextClueForCurrentQuestion = useGameStore((state) => state.revealNextClueForCurrentQuestion);
  const revealNextConnectionItemForCurrentQuestion = useGameStore((state) => state.revealNextConnectionItemForCurrentQuestion);
  const showClueRaceAnswerOptions = useGameStore((state) => state.showClueRaceAnswerOptions);
  const showConnectionAnswerOptionsForCurrentQuestion = useGameStore((state) => state.showConnectionAnswerOptionsForCurrentQuestion);
  const navigate = useGameStore((state) => state.navigate);
  const soundEnabled = useSettingsStore((state) => state.soundEnabled);
  const masterMuted = useAudioStore((state) => state.masterMuted);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loadError, setLoadError] = useState<string | undefined>(undefined);
  const [pendingJoker, setPendingJoker] = useState<JokerType | undefined>(undefined);
  const [voteState, setVoteState] = useState<VoteState>({ active: false, currentIndex: 0, votes: [] });

  useEffect(() => {
    let cancelled = false;
    void loadQuestionBank()
      .then((bank) => {
        if (!cancelled) {
          setQuestions(bank.questions.filter((question) => question.editorialStatus === "approved"));
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
  const synapseQuestions = useMemo(() => buildSynapseQuestionSet(gameState?.config.seed ?? "trium-synapse"), [gameState?.config.seed]);
  const generatedConnectionQuestions = useMemo(() => buildConnectionsQuestionSet(gameState?.config.seed ?? "trium-connections"), [gameState?.config.seed]);
  const allQuestions = useMemo(() => [...questions, ...synapseQuestions, ...generatedConnectionQuestions], [generatedConnectionQuestions, questions, synapseQuestions]);
  const activeQuestion = allQuestions.find((question) => question.id === gameState?.activeQuestionId);
  const activeKnowledgeQuestion = activeQuestion && isKnowledgeGridQuestion(activeQuestion) ? activeQuestion : undefined;
  const activeClueQuestion = activeQuestion && isClueRaceQuestion(activeQuestion) ? activeQuestion : undefined;
  const activePressureQuestion = activeQuestion && isPressureChoiceQuestion(activeQuestion) ? activeQuestion : undefined;
  const activeSynapseQuestion = activeQuestion && isSynapseQuestion(activeQuestion) ? activeQuestion as SynapseQuestion : undefined;
  const activeConnectionQuestion = activeQuestion && isConnectionsQuestion(activeQuestion) ? activeQuestion as ConnectionsQuestion : undefined;
  const knowledgeQuestions = useMemo(() => questions.filter(isKnowledgeGridQuestion), [questions]);
  const clueQuestions = useMemo(() => questions.filter(isClueRaceQuestion), [questions]);
  const pressureQuestions = useMemo(() => questions.filter(isPressureChoiceQuestion), [questions]);
  const approvedSynapseQuestions = useMemo(() => synapseQuestions.filter(isSynapseQuestion), [synapseQuestions]);
  const connectionQuestions = useMemo(() => [...questions.filter(isConnectionsQuestion), ...generatedConnectionQuestions], [questions, generatedConnectionQuestions]);
  const captain = gameState?.config.players.find((player) => player.id === gameState.captainPlayerId) ?? session.players[0];
  const isQuestionActive = gameState?.status === "question_active" || gameState?.status === "answer_locked";
  const isLocked = gameState?.status === "answer_locked";
  const isClueRace = round?.kind === "clue-race";
  const isPressureChoice = round?.kind === "pressure-choice";
  const isSynapse = round?.kind === "synapse";
  const isConnections = round?.kind === "connections";
  const clueIndex = gameState?.currentRoundState?.clueIndex ?? 0;
  const answersVisible = gameState?.currentRoundState?.answersVisible === true || isLocked;
  const pressureStep = Math.min(4, gameState?.currentRoundState?.currentQuestionIndex ?? 0);
  const pressureMultiplier = multiplierForPressureStep(pressureStep);
  const pressureTimeLimitMs = timeLimitForPressureStep(pressureStep) * 1000;
  const securedPoints = gameState?.currentRoundState?.securedPoints ?? 0;
  const riskPoints = gameState?.currentRoundState?.riskPoints ?? 0;
  const connectionItemIndex = gameState?.currentRoundState?.connectionItemIndex ?? 0;
  const connectionPoints = pointsForConnectionItemIndex(Math.min(3, connectionItemIndex));
  const canUseJoker = gameState?.status === "question_active" && activeQuestion !== undefined;
  const board = useMemo(() => buildKnowledgeGrid({
    questions: knowledgeQuestions,
    usedQuestionIds: gameState?.usedQuestionIds ?? [],
    seed: gameState?.config.seed ?? "trium-grid",
  }), [gameState?.config.seed, gameState?.usedQuestionIds, knowledgeQuestions]);

  const chooseCell = (cellId: string) => {
    try {
      const questionId = selectKnowledgeGridQuestion(board, cellId);
      loadCurrentQuestion({ questions: knowledgeQuestions, questionId });
    } catch {
      // Invalid selections are normally prevented by disabled cell states.
    }
  };

  const loadNextClueQuestion = () => {
    loadCurrentQuestion({ questions: clueQuestions });
  };

  const loadNextPressureQuestion = () => {
    loadCurrentQuestion({ questions: pressureQuestions });
  };

  const loadNextSynapseQuestion = () => {
    loadCurrentQuestion({ questions: approvedSynapseQuestions });
  };

  const loadNextConnectionQuestion = () => {
    loadCurrentQuestion({ questions: connectionQuestions });
  };

  const submitAnswer = () => {
    if (selectedAnswerId) {
      submitCurrentAnswer(selectedAnswerId);
    }
  };

  const confirmJoker = () => {
    if (!pendingJoker) {
      return;
    }
    applyGameJoker(pendingJoker, allQuestions);
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
  const jokerDisabled = (joker: JokerType): boolean => {
    if (!canUseJoker || jokerRemaining(joker) <= 0 || jokerUsed(joker) || (gameState?.jokers.disabled.includes(joker) ?? false)) {
      return true;
    }
    if (isClueRace && joker === "fifty_fifty" && !answersVisible) {
      return true;
    }
    if (isPressureChoice && joker === "change_question" && pressureStep >= 4) {
      return true;
    }
    if (isConnections) {
      if (joker === "change_question" || joker === "extra_time" || joker === "team_vote") {
        return true;
      }
      if (joker === "fifty_fifty" && !answersVisible) {
        return true;
      }
    }
    if (isSynapse) {
      if (joker === "fifty_fifty" || joker === "change_question" || joker === "team_vote") {
        return true;
      }
      if (joker === "contextual_hint" && activeSynapseQuestion?.type !== "analogy" && activeSynapseQuestion?.type !== "sequence") {
        return true;
      }
    }
    return false;
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
      <section className={`game-layout knowledge-grid-layout ${isClueRace ? "clue-race-layout" : ""} ${isPressureChoice ? "pressure-choice-layout" : ""} ${isSynapse ? "synapse-layout" : ""} ${isConnections ? "connections-layout" : ""}`}>
        <Panel className={`game-stage knowledge-grid-stage ${isClueRace ? "clue-race-stage" : ""} ${isPressureChoice ? "pressure-choice-stage" : ""} ${isSynapse ? "synapse-stage" : ""} ${isConnections ? "connections-stage" : ""}`}>
          <RoundHeader roundLabel={round.label} questionIndex={Math.min(answeredCount + 1, targetCount)} questionCount={targetCount} categoryLabel={isClueRace ? "Indices progressifs" : isPressureChoice ? "Continuer ou securiser" : isSynapse ? "Mini-epreuves ludiques" : isConnections ? "Lien commun progressif" : "Le capitaine choisit une case"} />
          <ScoreBoard score={session.score.teamScore} streak={session.score.streak} roundLabel={`Question ${Math.min(answeredCount + 1, targetCount)}`} />

          {loadError ? <FeedbackBanner tone="warning" title="Banque indisponible" message={loadError} /> : null}
          {engineError ? <FeedbackBanner tone="warning" title="Action impossible" message={engineError} /> : null}
          {gameState.jokerEffects.contextualHint ? <FeedbackBanner tone="info" title="Indice contextuel" message={gameState.jokerEffects.contextualHint} /> : null}
          {gameState.jokerEffects.secondChanceConsumed && gameState.status === "question_active" ? <FeedbackBanner tone="warning" title="Seconde chance" message="Premiere reponse incorrecte. La prochaine bonne reponse vaudra 50 % des points." /> : null}

          {!isClueRace && !isPressureChoice && !isSynapse && !isConnections && !isQuestionActive ? (
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

          {isClueRace && !isQuestionActive ? (
            <div className="clue-race-empty-state">
              <Badge tone="cyan">Course aux indices</Badge>
              <h1>{answeredCount >= targetCount ? "Manche terminee" : "Nouvelle enigme"}</h1>
              <p>{answeredCount >= targetCount ? "Les cinq enigmes sont jouees." : "Le capitaine lance l'enigme suivante. Le premier indice vaut 500 points."}</p>
              {answeredCount >= targetCount ? <Button variant="primary" onClick={() => completeCurrentRound()}>Resultat de manche</Button> : <Button variant="primary" onClick={loadNextClueQuestion} disabled={clueQuestions.length === 0} data-testid="start-clue-question">Afficher l'indice 1</Button>}
            </div>
          ) : null}

          {isPressureChoice && !isQuestionActive ? (
            <div className="pressure-choice-empty-state">
              <Badge tone="amber">Choix sous pression</Badge>
              <h1>{answeredCount >= targetCount ? "Dernier palier atteint" : `Palier ${pressureStep + 1}`}</h1>
              <p>Chaque bonne reponse ajoute des points a risque. L'equipe peut continuer ou securiser apres une bonne reponse.</p>
              <div className="pressure-bank-grid">
                <div><span>Points securises</span><strong>{securedPoints.toLocaleString("fr-FR")}</strong></div>
                <div><span>Points a risque</span><strong>{riskPoints.toLocaleString("fr-FR")}</strong></div>
                <div><span>Multiplicateur</span><strong>x{pressureMultiplier.toLocaleString("fr-FR")}</strong></div>
              </div>
              {answeredCount >= targetCount ? <Button variant="primary" onClick={() => completeCurrentRound()}>Resultat de manche</Button> : <Button variant="primary" onClick={loadNextPressureQuestion} disabled={pressureQuestions.length === 0} data-testid="start-pressure-question">Lancer le palier</Button>}
            </div>
          ) : null}


          {isSynapse && !isQuestionActive ? (
            <div className="synapse-empty-state">
              <Badge tone="violet">Synapse</Badge>
              <h1>{answeredCount >= targetCount ? "Manche terminee" : `Epreuve ${answeredCount + 1}`}</h1>
              <p>{answeredCount >= targetCount ? "Les six mini-epreuves sont jouees." : "Une epreuve ludique est tiree avec la seed de partie. Maximum deux epreuves du meme type."}</p>
              {answeredCount >= targetCount ? <Button variant="primary" onClick={() => completeCurrentRound()}>Resultat de manche</Button> : <Button variant="primary" onClick={loadNextSynapseQuestion} disabled={approvedSynapseQuestions.length === 0} data-testid="start-synapse-question">Lancer l'epreuve</Button>}
            </div>
          ) : null}

          {isConnections && !isQuestionActive ? (
            <div className="connections-empty-state">
              <Badge tone="cyan">Connexions</Badge>
              <h1>{answeredCount >= targetCount ? "Manche terminee" : `Connexion ${answeredCount + 1}`}</h1>
              <p>{answeredCount >= targetCount ? "Les cinq connexions sont jouees." : "Quatre elements vont apparaitre progressivement. Repondre tot rapporte plus de points."}</p>
              {answeredCount >= targetCount ? <Button variant="primary" onClick={() => completeCurrentRound()}>Resultat de manche</Button> : <Button variant="primary" onClick={loadNextConnectionQuestion} disabled={connectionQuestions.length === 0} data-testid="start-connection-question">Afficher le premier element</Button>}
            </div>
          ) : null}
          {isQuestionActive && activeKnowledgeQuestion ? (
            <div className="question-live knowledge-question-live">
              <Timer remainingMs={Math.max(0, (gameState.timer?.expiresAt ?? Date.now()) - Date.now())} totalMs={(gameState.timer?.expiresAt ?? 0) - (gameState.timer?.startedAt ?? 0) || 30_000} />
              <div className="question-value-strip">
                <Badge tone="amber">{activeKnowledgeQuestion.value} points</Badge>
                <span>{activeKnowledgeQuestion.categoryLabel} - difficulte {activeKnowledgeQuestion.difficulty}</span>
              </div>
              <h1>{activeKnowledgeQuestion.prompt}</h1>
              {voteState.active ? (
                <Panel className="team-vote-panel">
                  {voteState.majority ? (
                    <>
                      <Badge tone="success">Majorite revelee</Badge>
                      <strong>{optionLabel(activeKnowledgeQuestion.options, voteState.majority)}</strong>
                      <p>Le capitaine choisit maintenant la reponse finale.</p>
                    </>
                  ) : (
                    <>
                      <Badge tone="violet">Vote masque</Badge>
                      <strong>{session.players[voteState.currentIndex]?.name ?? "Joueur"}</strong>
                      <p>{voteState.votes.length} vote(s) enregistres. Les choix precedents restent masques.</p>
                      <div className="answer-grid live">
                        {activeKnowledgeQuestion.options.map((answer) => <AnswerButton key={answer.id} answerId={answer.id} label={answer.label} onClick={() => castVote(answer.id)} />)}
                      </div>
                    </>
                  )}
                </Panel>
              ) : null}
              <div className="answer-grid live">
                {activeKnowledgeQuestion.options.map((answer) => {
                  const eliminated = gameState.jokerEffects.eliminatedOptionIds.includes(answer.id);
                  const state = eliminated
                    ? "disabled"
                    : isLocked
                      ? answer.id === activeKnowledgeQuestion.correctOptionId ? "correct" : answer.id === selectedAnswerId ? "incorrect" : "disabled"
                      : selectedAnswerId === answer.id ? "selected" : "idle";
                  return <AnswerButton key={answer.id} answerId={answer.id} label={answer.label} state={state} disabled={isLocked || eliminated} onClick={() => selectAnswer(answer.id)} />;
                })}
              </div>
              {isLocked ? <FeedbackBanner tone="warning" title="Reponse verrouillee" message={`Revelation prete. Bonne reponse attendue : ${optionLabel(activeKnowledgeQuestion.options, activeKnowledgeQuestion.correctOptionId)}.`} /> : null}
            </div>
          ) : null}

          {isQuestionActive && activePressureQuestion ? (
            <div className="question-live pressure-choice-live">
              <Timer remainingMs={Math.max(0, (gameState.timer?.expiresAt ?? Date.now()) - Date.now())} totalMs={pressureTimeLimitMs} />
              <div className="pressure-step-track" aria-label="Progression Choix sous pression">
                {[1, 2, 3, 4, 5].map((step) => (
                  <span key={step} className={step - 1 < pressureStep ? "is-passed" : step - 1 === pressureStep ? "is-current" : ""}>{step}</span>
                ))}
              </div>
              <div className="question-value-strip">
                <Badge tone="amber">x{pressureMultiplier.toLocaleString("fr-FR")}</Badge>
                <span>Difficulte {activePressureQuestion.difficulty} - {timeLimitForPressureStep(pressureStep)} s</span>
              </div>
              <div className="pressure-bank-grid compact">
                <div><span>Securises</span><strong>{securedPoints.toLocaleString("fr-FR")}</strong></div>
                <div><span>A risque</span><strong>{riskPoints.toLocaleString("fr-FR")}</strong></div>
                <div><span>Bonne reponse</span><strong>{Math.round((activePressureQuestion.value ?? activePressureQuestion.difficulty * 100) * pressureMultiplier).toLocaleString("fr-FR")}</strong></div>
              </div>
              <h1>{activePressureQuestion.prompt}</h1>
              {voteState.active ? (
                <Panel className="team-vote-panel">
                  {voteState.majority ? (
                    <>
                      <Badge tone="success">Majorite revelee</Badge>
                      <strong>{optionLabel(activePressureQuestion.options, voteState.majority)}</strong>
                      <p>Le capitaine choisit maintenant la reponse finale.</p>
                    </>
                  ) : (
                    <>
                      <Badge tone="violet">Vote masque</Badge>
                      <strong>{session.players[voteState.currentIndex]?.name ?? "Joueur"}</strong>
                      <p>{voteState.votes.length} vote(s) enregistres. Les choix precedents restent masques.</p>
                      <div className="answer-grid live">
                        {activePressureQuestion.options.map((answer) => <AnswerButton key={answer.id} answerId={answer.id} label={answer.label} onClick={() => castVote(answer.id)} />)}
                      </div>
                    </>
                  )}
                </Panel>
              ) : null}
              <div className="answer-grid live" data-testid="pressure-answer-options">
                {activePressureQuestion.options.map((answer) => {
                  const eliminated = gameState.jokerEffects.eliminatedOptionIds.includes(answer.id);
                  const state = eliminated
                    ? "disabled"
                    : isLocked
                      ? answer.id === activePressureQuestion.correctOptionId ? "correct" : answer.id === selectedAnswerId ? "incorrect" : "disabled"
                      : selectedAnswerId === answer.id ? "selected" : "idle";
                  return <AnswerButton key={answer.id} answerId={answer.id} label={answer.label} state={state} disabled={isLocked || eliminated} onClick={() => selectAnswer(answer.id)} />;
                })}
              </div>
              {isLocked ? <FeedbackBanner tone="warning" title="Reponse verrouillee" message={`Revelation prete. Bonne reponse attendue : ${optionLabel(activePressureQuestion.options, activePressureQuestion.correctOptionId)}.`} /> : null}
            </div>
          ) : null}
          {isQuestionActive && activeClueQuestion ? (
            <div className="question-live clue-race-live">
              <Timer remainingMs={Math.max(0, (gameState.timer?.expiresAt ?? Date.now()) - Date.now())} totalMs={(gameState.timer?.expiresAt ?? 0) - (gameState.timer?.startedAt ?? 0) || 30_000} />
              <div className="question-value-strip">
                <Badge tone="amber">{pointsForClueIndex(clueIndex)} points</Badge>
                <span>Indice {clueIndex + 1} / 5</span>
              </div>
              <h1>{activeClueQuestion.prompt}</h1>
              <motion.ol className="clue-list" initial={false}>
                {visibleClues(activeClueQuestion, clueIndex).map((clue, index) => (
                  <motion.li key={`${activeClueQuestion.id}-${index}`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}>
                    <span>{index + 1}</span>
                    <p>{clue}</p>
                  </motion.li>
                ))}
              </motion.ol>
              {answersVisible ? (
                <div className="answer-grid live" data-testid="clue-answer-options">
                  {clueAnswerOptions(activeClueQuestion).map((answer) => {
                    const eliminated = gameState.jokerEffects.eliminatedOptionIds.includes(answer.id);
                    const state = eliminated
                      ? "disabled"
                      : isLocked
                        ? answer.id === activeClueQuestion.correctOptionId ? "correct" : answer.id === selectedAnswerId ? "incorrect" : "disabled"
                        : selectedAnswerId === answer.id ? "selected" : "idle";
                    return <AnswerButton key={answer.id} answerId={answer.id} label={answer.label} state={state} disabled={isLocked || eliminated} onClick={() => selectAnswer(answer.id)} />;
                  })}
                </div>
              ) : null}
              <div className="screen-actions clue-actions">
                <Button variant="secondary" onClick={() => revealNextClueForCurrentQuestion()} disabled={isLocked || clueIndex >= 4}>Indice suivant</Button>
                <Button variant="primary" onClick={() => showClueRaceAnswerOptions()} disabled={isLocked || answersVisible}>Repondre maintenant</Button>
              </div>
              {isLocked ? <FeedbackBanner tone="warning" title="Reponse verrouillee" message={`Revelation prete. Bonne reponse attendue : ${activeClueQuestion.answer.display}.`} /> : null}
            </div>
          ) : null}



          {isQuestionActive && activeConnectionQuestion ? (
            <>
              <Timer remainingMs={Math.max(0, (gameState.timer?.expiresAt ?? Date.now()) - Date.now())} totalMs={(gameState.timer?.expiresAt ?? 0) - (gameState.timer?.startedAt ?? 0) || 30_000} />
              <ConnectionsExerciseView
                question={activeConnectionQuestion}
                itemIndex={connectionItemIndex}
                answersVisible={answersVisible}
                isLocked={isLocked}
                selectedAnswerId={selectedAnswerId}
                eliminatedOptionIds={gameState.jokerEffects.eliminatedOptionIds}
                points={connectionPoints}
                onSelect={selectAnswer}
              />
              <div className="screen-actions connection-actions">
                <Button variant="secondary" onClick={() => revealNextConnectionItemForCurrentQuestion()} disabled={isLocked || answersVisible || connectionItemIndex >= 3}>Element suivant</Button>
                <Button variant="primary" onClick={() => showConnectionAnswerOptionsForCurrentQuestion()} disabled={isLocked || answersVisible}>Repondre maintenant</Button>
              </div>
              {isLocked ? <FeedbackBanner tone="warning" title="Reponse verrouillee" message="Les quatre elements restent visibles. Revelation prete." /> : null}
            </>
          ) : null}
          {isQuestionActive && activeSynapseQuestion ? (
            <>
              <Timer remainingMs={Math.max(0, (gameState.timer?.expiresAt ?? Date.now()) - Date.now())} totalMs={(gameState.timer?.expiresAt ?? 0) - (gameState.timer?.startedAt ?? 0) || 30_000} />
              <SynapseExerciseView question={activeSynapseQuestion} isLocked={isLocked} selectedAnswerId={selectedAnswerId} onSelect={selectAnswer} />
              {isLocked ? <FeedbackBanner tone="warning" title="Reponse verrouillee" message="Revelation prete pour cette epreuve Synapse." /> : null}
            </>
          ) : null}
          <div className="screen-actions in-stage knowledge-actions">
            <Button variant="secondary" onClick={() => navigate("home")}>Quitter</Button>
            {!isQuestionActive && answeredCount >= targetCount ? <Button variant="primary" onClick={() => completeCurrentRound()}>Resultat de manche</Button> : null}
            {gameState.status === "question_active" && isClueRace && answersVisible ? <Button variant="primary" onClick={submitAnswer} disabled={!selectedAnswerId} data-testid="lock-answer-button">Verrouiller la reponse</Button> : null}
            {gameState.status === "question_active" && !isClueRace ? <Button variant="primary" onClick={submitAnswer} disabled={!selectedAnswerId || (isConnections && !answersVisible)} data-testid="lock-answer-button">Verrouiller la reponse</Button> : null}
            {gameState.status === "answer_locked" ? <Button variant="primary" onClick={() => revealCurrentAnswer(allQuestions)} data-testid="reveal-answer-button">Reveler la reponse</Button> : null}
          </div>
        </Panel>
        <aside className="side-rail" aria-label="Informations de partie">
          <CaptainIndicator playerName={captain.name} />
          <Panel>
            <h2>Jokers</h2>
            <div className="joker-list">
              <JokerButton label="50/50" remaining={jokerRemaining("fifty_fifty")} icon="target" disabled={jokerDisabled("fifty_fifty")} onClick={() => setPendingJoker("fifty_fifty")} data-testid="joker-fifty_fifty" />
              <JokerButton label="Deuxieme chance" remaining={jokerRemaining("second_chance")} icon="shield" disabled={jokerDisabled("second_chance")} onClick={() => setPendingJoker("second_chance")} data-testid="joker-second_chance" />
              <JokerButton label="Changer" remaining={jokerRemaining("change_question")} icon="arrow" disabled={jokerDisabled("change_question")} onClick={() => setPendingJoker("change_question")} data-testid="joker-change_question" />
              <JokerButton label="Indice" remaining={jokerRemaining("contextual_hint")} icon="spark" disabled={jokerDisabled("contextual_hint")} onClick={() => setPendingJoker("contextual_hint")} data-testid="joker-contextual_hint" />
              <JokerButton label="Temps +" remaining={jokerRemaining("extra_time")} icon="timer" disabled={jokerDisabled("extra_time")} onClick={() => setPendingJoker("extra_time")} data-testid="joker-extra_time" />
              <JokerButton label="Vote equipe" remaining={jokerRemaining("team_vote")} icon="captain" disabled={jokerDisabled("team_vote")} onClick={() => setPendingJoker("team_vote")} data-testid="joker-team_vote" />
            </div>
          </Panel>
          <Panel>
            <h2>Progression</h2>
            <div className="knowledge-progress-card">
              <strong>{answeredCount} / {targetCount}</strong>
              <span>{isClueRace ? "enigmes jouees" : isPressureChoice ? "paliers joues" : isSynapse ? "epreuves jouees" : isConnections ? "connexions jouees" : "questions selectionnees"}</span>
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
