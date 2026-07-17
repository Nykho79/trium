import { useEffect, useState } from "react";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { FeedbackBanner } from "../components/FeedbackBanner";
import { Panel } from "../components/Panel";
import { ScreenFrame } from "../components/ScreenFrame";
import { useGameStore } from "../../app/store/gameStore";
import { loadQuestionBank } from "../../data/loadQuestionBank";
import type { ConnectionsQuestion, MultipleChoiceOption, PressureChoiceQuestion, Question, SynapseQuestion } from "../../core/types";
import { buildConnectionsQuestionSet, isConnectionsQuestion } from "../../rounds/connections";
import { buildWagerQuestionSet } from "../../rounds/wager";
import { buildFinalConvergenceQuestionSet } from "../../rounds/final-convergence";
import { buildSynapseQuestionSet, synapseOptions } from "../../rounds/synapse";

function isPressureChoiceQuestion(question: Question): question is PressureChoiceQuestion {
  return question.kind === "pressure-choice" && question.type === "multiple_choice" && question.editorialStatus === "approved";
}

function optionsFor(question: Question): readonly MultipleChoiceOption[] | undefined {
  if (question.kind === "synapse") {
    return synapseOptions(question as SynapseQuestion);
  }
  if (question.type === "connection") {
    return question.options;
  }
  if ((question.type === "multiple_choice" || question.type === "progressive_clues") && question.options !== undefined) {
    return question.options;
  }
  if (question.type === "chronology") {
    return question.options;
  }
  return undefined;
}

function displayAnswer(question: Question | undefined, correctAnswer: string | string[] | undefined): string {
  if (!question || correctAnswer === undefined) {
    return Array.isArray(correctAnswer) ? correctAnswer.join(", ") : correctAnswer ?? "Reponse indisponible";
  }
  if (Array.isArray(correctAnswer)) {
    return correctAnswer.join(", ");
  }
  const options = optionsFor(question);
  if (options !== undefined) {
    return options.find((option) => option.id === correctAnswer)?.label ?? correctAnswer;
  }
  if (question.type === "progressive_clues" || question.type === "connection") {
    return question.answer.display;
  }
  return correctAnswer;
}

export function QuestionTransitionScreen() {
  const navigate = useGameStore((state) => state.navigate);
  const gameState = useGameStore((state) => state.gameState);
  const session = useGameStore((state) => state.session);
  const completeCurrentRound = useGameStore((state) => state.completeCurrentRound);
  const loadCurrentQuestion = useGameStore((state) => state.loadCurrentQuestion);
  const securePressureChoiceRisk = useGameStore((state) => state.securePressureChoiceRisk);
  const [questions, setQuestions] = useState<Question[]>([]);

  useEffect(() => {
    let cancelled = false;
    void loadQuestionBank().then((bank) => {
      if (!cancelled) {
        setQuestions(bank.questions);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const result = gameState?.lastAnswerResult;
  const synapseQuestions = buildSynapseQuestionSet(gameState?.config.seed ?? "trium-synapse");
  const connectionQuestions = buildConnectionsQuestionSet(gameState?.config.seed ?? "trium-connections");
  const wagerQuestions = buildWagerQuestionSet(gameState?.config.seed ?? "trium-wager");
  const finalQuestions = buildFinalConvergenceQuestionSet(gameState?.config.seed ?? "trium-final");
  const allQuestions = [...questions, ...synapseQuestions, ...connectionQuestions, ...wagerQuestions, ...finalQuestions];
  const question = allQuestions.find((candidate) => candidate.id === result?.questionId);
  const connectionQuestion = question && isConnectionsQuestion(question) ? question as ConnectionsQuestion : undefined;
  const round = gameState?.config.rounds[gameState.currentRoundIndex];
  const answeredCount = gameState?.currentRoundState?.answeredQuestionIds.length ?? 0;
  const targetCount = round?.questionCount ?? 5;
  const isRoundComplete = answeredCount >= targetCount;
  const answer = displayAnswer(question, result?.correctAnswer);
  const points = result?.score.total ?? 0;
  const timedOut = result?.lockedAnswer === "temps-ecoule";
  const isPressureChoice = round?.kind === "pressure-choice";
  const pressureQuestions = questions.filter(isPressureChoiceQuestion);
  const pressureEndedByFailure = isPressureChoice && result?.isCorrect === false;
  const returnLabel = round?.kind === "knowledge-grid" ? "Retour a la grille" : isPressureChoice ? "Continuer" : round?.kind === "synapse" ? "Epreuve suivante" : round?.kind === "connections" ? "Connexion suivante" : round?.kind === "wager" ? "Pari suivant" : round?.kind === "final-convergence" ? "Etape suivante" : "Enigme suivante";

  const continueRound = () => {
    if (pressureEndedByFailure || isRoundComplete) {
      completeCurrentRound();
      return;
    }
    if (isPressureChoice) {
      loadCurrentQuestion({ questions: pressureQuestions });
      navigate("game");
      return;
    }
    navigate("game");
  };

  return (
    <ScreenFrame title="Transition entre questions">
      <section className="result-screen general-screen">
        <Panel className="result-card">
          <Badge tone={timedOut ? "danger" : result?.isCorrect ? "success" : "amber"}>{timedOut ? "Temps ecoule" : "Reponse revelee"}</Badge>
          <h1>{answer}</h1>
          <FeedbackBanner
            tone={result?.isCorrect ? "success" : "warning"}
            title={timedOut ? "Chrono termine" : result?.isCorrect ? "Bonne reponse" : "Reponse manquee"}
            message={result?.explanation ?? "Explication indisponible."}
          />
          <div className="reveal-score-grid">
            <div><span>Base</span><strong>{result?.score.basePoints ?? 0}</strong></div>
            <div><span>Rapidite</span><strong>{result?.score.timeBonus ?? 0}</strong></div>
            <div><span>Serie</span><strong>{result?.score.streakBonus ?? 0}</strong></div>
            <div><span>Total</span><strong>{points}</strong></div>
          </div>
          {connectionQuestion ? (
            <div className="connection-reveal-list" data-testid="connection-reveal-items">
              {connectionQuestion.items.map((item, index) => (
                <div key={`${connectionQuestion.id}-${item}`}>
                  <strong>{item}</strong>
                  <span>{connectionQuestion.itemDetails?.[index] ?? "Element rattache au lien commun."}</span>
                </div>
              ))}
            </div>
          ) : null}
          <strong>Score equipe : {session.score.teamScore.toLocaleString("fr-FR")}</strong>
          <div className="screen-actions">
            <Button variant="secondary" onClick={() => navigate("home")}>Quitter</Button>
            {isPressureChoice && result?.isCorrect && !isRoundComplete ? <Button variant="secondary" onClick={() => securePressureChoiceRisk()} data-testid="secure-pressure-button">Securiser</Button> : null}
            <Button variant="primary" onClick={continueRound}>{pressureEndedByFailure || isRoundComplete ? "Resultat de manche" : returnLabel}</Button>
          </div>
        </Panel>
      </section>
    </ScreenFrame>
  );
}
