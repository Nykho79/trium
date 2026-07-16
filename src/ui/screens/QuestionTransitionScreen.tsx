import { useEffect, useState } from "react";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { FeedbackBanner } from "../components/FeedbackBanner";
import { Panel } from "../components/Panel";
import { ScreenFrame } from "../components/ScreenFrame";
import { useGameStore } from "../../app/store/gameStore";
import { loadQuestionBank } from "../../data/loadQuestionBank";
import type { Question } from "../../core/types";

function displayAnswer(question: Question | undefined, correctAnswer: string | string[] | undefined): string {
  if (!question || correctAnswer === undefined) {
    return Array.isArray(correctAnswer) ? correctAnswer.join(", ") : correctAnswer ?? "Reponse indisponible";
  }
  if (Array.isArray(correctAnswer)) {
    return correctAnswer.join(", ");
  }
  if ((question.type === "multiple_choice" || question.type === "progressive_clues") && question.options !== undefined) {
    return question.options.find((option) => option.id === correctAnswer)?.label ?? correctAnswer;
  }
  if (question.type === "progressive_clues") {
    return question.answer.display;
  }
  return correctAnswer;
}

export function QuestionTransitionScreen() {
  const navigate = useGameStore((state) => state.navigate);
  const gameState = useGameStore((state) => state.gameState);
  const session = useGameStore((state) => state.session);
  const completeCurrentRound = useGameStore((state) => state.completeCurrentRound);
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
  const question = questions.find((candidate) => candidate.id === result?.questionId);
  const round = gameState?.config.rounds[gameState.currentRoundIndex];
  const answeredCount = gameState?.currentRoundState?.answeredQuestionIds.length ?? 0;
  const targetCount = round?.questionCount ?? 5;
  const isRoundComplete = answeredCount >= targetCount;
  const answer = displayAnswer(question, result?.correctAnswer);
  const points = result?.score.total ?? 0;
  const returnLabel = round?.kind === "knowledge-grid" ? "Retour a la grille" : "Enigme suivante";

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
          <Badge tone={result?.isCorrect ? "success" : "amber"}>Reponse revelee</Badge>
          <h1>{answer}</h1>
          <FeedbackBanner
            tone={result?.isCorrect ? "success" : "warning"}
            title={result?.isCorrect ? "Bonne reponse" : "Reponse manquee"}
            message={result?.explanation ?? "Explication indisponible."}
          />
          <div className="reveal-score-grid">
            <div><span>Base</span><strong>{result?.score.basePoints ?? 0}</strong></div>
            <div><span>Rapidite</span><strong>{result?.score.timeBonus ?? 0}</strong></div>
            <div><span>Serie</span><strong>{result?.score.streakBonus ?? 0}</strong></div>
            <div><span>Total</span><strong>{points}</strong></div>
          </div>
          <strong>Score equipe : {session.score.teamScore.toLocaleString("fr-FR")}</strong>
          <div className="screen-actions">
            <Button variant="secondary" onClick={() => navigate("home")}>Quitter</Button>
            <Button variant="primary" onClick={continueRound}>{isRoundComplete ? "Resultat de manche" : returnLabel}</Button>
          </div>
        </Panel>
      </section>
    </ScreenFrame>
  );
}