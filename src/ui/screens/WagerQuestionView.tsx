import type { WagerQuestion } from "../../rounds/wager";
import { coefficientForWagerDifficulty, wagerDifficultyLabel } from "../../rounds/wager";
import { AnswerButton } from "../components/AnswerButton";
import { Badge } from "../components/Badge";

interface WagerQuestionViewProps {
  question: WagerQuestion;
  amount: number;
  coefficient: number;
  isFreeStake: boolean;
  isLocked: boolean;
  selectedAnswerId: string | undefined;
  eliminatedOptionIds: readonly string[];
  onSelect: (answerId: string) => void;
}

export function WagerQuestionView({
  question,
  amount,
  coefficient,
  isFreeStake,
  isLocked,
  selectedAnswerId,
  eliminatedOptionIds,
  onSelect,
}: WagerQuestionViewProps) {
  const gain = amount * coefficient;
  return (
    <div className="question-live wager-live" data-testid="wager-question">
      <div className="wager-question-summary">
        <Badge tone="amber">Mise {amount}{isFreeStake ? " gratuite" : ""}</Badge>
        <Badge tone="cyan">{wagerDifficultyLabel(question.difficulty)} x{coefficientForWagerDifficulty(question.difficulty)}</Badge>
        <strong>Gain possible : {gain.toLocaleString("fr-FR")}</strong>
      </div>
      <div className="question-value-strip">
        <span>{question.categoryLabel} - {question.subCategoryLabel}</span>
        <span>Perte maximale : {amount.toLocaleString("fr-FR")}</span>
      </div>
      <h1>{question.prompt}</h1>
      <div className="answer-grid live" data-testid="wager-answer-options">
        {question.options.map((answer) => {
          const eliminated = eliminatedOptionIds.includes(answer.id);
          const state = eliminated
            ? "disabled"
            : isLocked
              ? answer.id === question.correctOptionId ? "correct" : answer.id === selectedAnswerId ? "incorrect" : "disabled"
              : selectedAnswerId === answer.id ? "selected" : "idle";
          return <AnswerButton key={answer.id} answerId={answer.id} label={answer.label} state={state} disabled={isLocked || eliminated} onClick={() => onSelect(answer.id)} />;
        })}
      </div>
    </div>
  );
}
