import type { MultipleChoiceOption } from "../../core/types";
import { finalStepForQuestion, type FinalConvergenceQuestion } from "../../rounds/final-convergence";
import { AnswerButton } from "../components/AnswerButton";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { Panel } from "../components/Panel";
import { Timer } from "../components/Timer";

interface FinalConvergenceQuestionViewProps {
  question: FinalConvergenceQuestion;
  stepIndex: number;
  isLocked: boolean;
  selectedAnswerId: string | undefined;
  eliminatedOptionIds: readonly string[];
  remainingMs: number;
  totalMs: number;
  canUseHint: boolean;
  onUseHint: () => void;
  onSelect: (answerId: string) => void;
}

function optionsFor(question: FinalConvergenceQuestion): readonly MultipleChoiceOption[] {
  if (question.type === "multiple_choice") return question.options;
  if (question.type === "progressive_clues") return question.options ?? [];
  if (question.type === "connection") return question.options ?? [];
  if (question.type === "memory") return question.options ?? [];
  if (question.type === "analogy") return question.options ?? [];
  if (question.type === "sequence") return question.options ?? [];
  return [];
}

function correctOptionIdFor(question: FinalConvergenceQuestion): string | undefined {
  if ("correctOptionId" in question) return question.correctOptionId;
  return undefined;
}

function stepLabel(question: FinalConvergenceQuestion): string {
  const step = finalStepForQuestion(question);
  if (step === "culture") return "QCM culture generale";
  if (step === "clues") return "Indices progressifs";
  if (step === "connection") return "Connexion";
  if (step === "memory") return "Memoire";
  return "Enigme logique finale";
}

export function FinalConvergenceQuestionView({ question, stepIndex, isLocked, selectedAnswerId, eliminatedOptionIds, remainingMs, totalMs, canUseHint, onUseHint, onSelect }: FinalConvergenceQuestionViewProps) {
  const options = optionsFor(question);
  const correctOptionId = correctOptionIdFor(question);
  return (
    <div className="question-live final-live" data-testid="final-question">
      <div className="final-question-topline">
        <Badge tone="amber">Etape {stepIndex + 1} / 5</Badge>
        <Badge tone="cyan">{stepLabel(question)}</Badge>
        <Timer remainingMs={remainingMs} totalMs={totalMs} />
      </div>

      {question.type === "progressive_clues" ? (
        <Panel className="final-clue-panel">
          {question.clues.map((clue, index) => <span key={clue}>Indice {index + 1}. {clue}</span>)}
        </Panel>
      ) : null}

      {question.type === "connection" ? (
        <div className="final-connection-cards">
          {question.items.map((item) => <span key={item}>{item}</span>)}
        </div>
      ) : null}

      {question.type === "memory" ? (
        <Panel className="final-memory-panel">
          <strong>{question.items.join("  ")}</strong>
          <span>{question.recallPrompt}</span>
        </Panel>
      ) : null}

      {question.type === "analogy" ? (
        <Panel className="final-logic-panel">
          <strong>{question.left} vers {question.right}</strong>
          <span>{question.missing} vers ?</span>
        </Panel>
      ) : null}

      <h1>{question.prompt}</h1>
      {canUseHint ? <Button variant="secondary" onClick={onUseHint} data-testid="final-use-hint">Indice supplementaire</Button> : null}
      <div className="answer-grid live" data-testid="final-answer-options">
        {options.map((answer) => {
          const eliminated = eliminatedOptionIds.includes(answer.id);
          const state = eliminated
            ? "disabled"
            : isLocked
              ? answer.id === correctOptionId ? "correct" : answer.id === selectedAnswerId ? "incorrect" : "disabled"
              : selectedAnswerId === answer.id ? "selected" : "idle";
          return <AnswerButton key={answer.id} answerId={answer.id} label={answer.label} state={state} disabled={isLocked || eliminated} onClick={() => onSelect(answer.id)} />;
        })}
      </div>
    </div>
  );
}