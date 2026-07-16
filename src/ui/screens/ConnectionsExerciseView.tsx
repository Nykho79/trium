import { motion } from "framer-motion";
import type { ConnectionsQuestion, MultipleChoiceOption } from "../../core/types";
import { visibleConnectionItems } from "../../rounds/connections";
import { AnswerButton } from "../components/AnswerButton";
import { Badge } from "../components/Badge";

interface ConnectionsExerciseViewProps {
  question: ConnectionsQuestion;
  itemIndex: number;
  answersVisible: boolean;
  isLocked: boolean;
  selectedAnswerId: string | undefined;
  eliminatedOptionIds: readonly string[];
  points: number;
  onSelect: (answerId: string) => void;
}

function optionState(option: MultipleChoiceOption, question: ConnectionsQuestion, selectedAnswerId: string | undefined, isLocked: boolean, eliminated: boolean) {
  if (eliminated) return "disabled";
  if (isLocked) {
    if (option.id === question.correctOptionId) return "correct";
    if (option.id === selectedAnswerId) return "incorrect";
    return "disabled";
  }
  return selectedAnswerId === option.id ? "selected" : "idle";
}

export function ConnectionsExerciseView({
  question,
  itemIndex,
  answersVisible,
  isLocked,
  selectedAnswerId,
  eliminatedOptionIds,
  points,
  onSelect,
}: ConnectionsExerciseViewProps) {
  const visibleItems = visibleConnectionItems(question, isLocked ? 3 : itemIndex);
  const options = question.options ?? [
    { id: question.answer.display, label: question.answer.display },
    { id: "option-b", label: "Proposition B" },
    { id: "option-c", label: "Proposition C" },
    { id: "option-d", label: "Proposition D" },
  ];

  return (
    <div className="question-live connections-live">
      <div className="question-value-strip">
        <Badge tone="cyan">{points} points</Badge>
        <span>Element {Math.min(itemIndex + 1, 4)} / 4</span>
      </div>
      <h1>{question.prompt}</h1>
      <div className="connections-card-grid" data-testid="connection-items">
        {question.items.map((item, index) => {
          const isVisible = visibleItems.includes(item);
          return (
            <motion.div
              key={`${question.id}-${item}`}
              className={`connection-card ${isVisible ? "is-visible" : "is-hidden"}`}
              initial={false}
              animate={{ opacity: isVisible ? 1 : 0.34, y: isVisible ? 0 : 8 }}
              transition={{ duration: 0.2 }}
            >
              <span>{index + 1}</span>
              <strong>{isVisible ? item : "?"}</strong>
            </motion.div>
          );
        })}
      </div>
      {answersVisible || isLocked ? (
        <div className="answer-grid live connections-answer-grid" data-testid="connection-answer-options">
          {options.map((option) => {
            const eliminated = eliminatedOptionIds.includes(option.id);
            return (
              <AnswerButton
                key={option.id}
                answerId={option.id}
                label={option.label}
                state={optionState(option, question, selectedAnswerId, isLocked, eliminated)}
                disabled={isLocked || eliminated}
                onClick={() => onSelect(option.id)}
              />
            );
          })}
        </div>
      ) : null}
      {isLocked ? <div className="connection-line" aria-hidden="true" /> : null}
    </div>
  );
}
