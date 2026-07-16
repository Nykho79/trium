import { useEffect, useState } from "react";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { FeedbackBanner } from "../components/FeedbackBanner";
import { Panel } from "../components/Panel";
import { ScreenFrame } from "../components/ScreenFrame";
import { useGameStore } from "../../app/store/gameStore";
import { loadQuestionBank } from "../../data/loadQuestionBank";
import type { KnowledgeGridQuestion, Question } from "../../core/types";

function isKnowledgeGridQuestion(question: Question): question is KnowledgeGridQuestion {
  return question.kind === "knowledge-grid" && question.type === "multiple_choice" && question.editorialStatus === "approved";
}

function displayAnswer(question: KnowledgeGridQuestion | undefined, correctAnswer: string | string[] | undefined): string {
  if (!question || Array.isArray(correctAnswer) || correctAnswer === undefined) {
    return Array.isArray(correctAnswer) ? correctAnswer.join(", ") : correctAnswer ?? "Réponse indisponible";
  }
  return question.options.find((option) => option.id === correctAnswer)?.label ?? correctAnswer;
}

export function QuestionTransitionScreen() {
  const navigate = useGameStore((state) => state.navigate);
  const gameState = useGameStore((state) => state.gameState);
  const session = useGameStore((state) => state.session);
  const completeCurrentRound = useGameStore((state) => state.completeCurrentRound);
  const [questions, setQuestions] = useState<KnowledgeGridQuestion[]>([]);

  useEffect(() => {
    let cancelled = false;
    void loadQuestionBank().then((bank) => {
      if (!cancelled) {
        setQuestions(bank.questions.filter(isKnowledgeGridQuestion));
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const result = gameState?.lastAnswerResult;
  const question = questions.find((candidate) => candidate.id === result?.questionId);
  const round = gameState?.config.rounds[gameState.currentRoundIndex];
  const answeredCount = gameState?.currentRoundState?.answeredQuestionIds.length ?? 0;
  const targetCount = round?.questionCount ?? 8;
  const isRoundComplete = answeredCount >= targetCount;
  const answer = displayAnswer(question, result?.correctAnswer);
  const points = result?.score.total ?? 0;

  const continueRound = () => {
    if (isRoundComplete) {
      completeCurrentRound();
      return;
    }
    navigate("game");
  };

  return (
    <ScreenFrame title="Transition entre questions">
      <section className="result-screen general-screen">
        <Panel className="result-card">
          <Badge tone={result?.isCorrect ? "success" : "amber"}>Réponse révélée</Badge>
          <h1>{answer}</h1>
          <FeedbackBanner
            tone={result?.isCorrect ? "success" : "warning"}
            title={result?.isCorrect ? "Bonne réponse" : "Réponse manquée"}
            message={result?.explanation ?? "Explication indisponible."}
          />
          <div className="reveal-score-grid">
            <div><span>Base</span><strong>{result?.score.basePoints ?? 0}</strong></div>
            <div><span>Rapidité</span><strong>{result?.score.timeBonus ?? 0}</strong></div>
            <div><span>Série</span><strong>{result?.score.streakBonus ?? 0}</strong></div>
            <div><span>Total</span><strong>{points}</strong></div>
          </div>
          <strong>Score équipe : {session.score.teamScore.toLocaleString("fr-FR")}</strong>
          <div className="screen-actions">
            <Button variant="secondary" onClick={() => navigate("home")}>Quitter</Button>
            <Button variant="primary" onClick={continueRound}>{isRoundComplete ? "Résultat de manche" : "Retour à la grille"}</Button>
          </div>
        </Panel>
      </section>
    </ScreenFrame>
  );
}
