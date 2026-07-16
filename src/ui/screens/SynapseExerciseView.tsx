import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import type { MultipleChoiceOption, SynapseQuestion } from "../../core/types";
import { synapseExerciseType, synapseOptions } from "../../rounds/synapse";
import { AnswerButton } from "../components/AnswerButton";
import { Badge } from "../components/Badge";
import { Panel } from "../components/Panel";

interface SynapseExerciseViewProps {
  question: SynapseQuestion;
  isLocked: boolean;
  selectedAnswerId: string | undefined;
  onSelect: (answerId: string) => void;
}

function exerciseLabel(question: SynapseQuestion): string {
  const type = synapseExerciseType(question);
  if (type === "digit_memory") return "Memoire de chiffres";
  if (type === "reverse_memory") return "Memoire inversee";
  if (type === "ordering") return "Classement";
  if (type === "visual_matrix") return "Matrice visuelle";
  if (type === "symbol_rule") return "Symbole-regle";
  if (type === "intruder") return "Intrus conceptuel";
  if (type === "sequence") return "Suite logique";
  return "Analogie";
}

function stateForOption(question: SynapseQuestion, option: MultipleChoiceOption, isLocked: boolean, selectedAnswerId: string | undefined) {
  const correctOptionId = "correctOptionId" in question ? question.correctOptionId : undefined;
  if (isLocked) {
    if (option.id === correctOptionId) return "correct";
    if (option.id === selectedAnswerId) return "incorrect";
    return "disabled";
  }
  return selectedAnswerId === option.id ? "selected" : "idle";
}

function SynapseAnswerOptions(props: SynapseExerciseViewProps) {
  const options = synapseOptions(props.question);
  return (
    <div className="answer-grid live synapse-answer-grid" data-testid="synapse-answer-options">
      {options.map((option) => (
        <AnswerButton
          key={option.id}
          answerId={option.id}
          label={option.label}
          state={stateForOption(props.question, option, props.isLocked, props.selectedAnswerId)}
          disabled={props.isLocked}
          onClick={() => props.onSelect(option.id)}
        />
      ))}
    </div>
  );
}

function AnalogyExercise(props: SynapseExerciseViewProps) {
  const question = props.question.type === "analogy" ? props.question : undefined;
  return (
    <>
      {question ? (
        <div className="synapse-relation-row">
          <strong>{question.left}</strong><span>est a</span><strong>{question.right}</strong><span>comme</span><strong>{question.missing}</strong><span>est a...</span>
        </div>
      ) : null}
      <SynapseAnswerOptions {...props} />
    </>
  );
}

function SequenceExercise(props: SynapseExerciseViewProps) {
  const question = props.question.type === "sequence" ? props.question : undefined;
  return (
    <>
      {question ? <div className="synapse-sequence-row">{question.items.map((item) => <strong key={item}>{item}</strong>)}<strong>?</strong></div> : null}
      <SynapseAnswerOptions {...props} />
    </>
  );
}

function MemoryExercise(props: SynapseExerciseViewProps) {
  const question = props.question.type === "memory" ? props.question : undefined;
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setVisible(true);
    const timeout = window.setTimeout(() => setVisible(false), (question?.displaySeconds ?? 1) * 1000);
    return () => window.clearTimeout(timeout);
  }, [question?.id, question?.displaySeconds]);

  if (!question) {
    return <SynapseAnswerOptions {...props} />;
  }

  return (
    <>
      <Panel className="synapse-memory-panel">
        {visible ? (
          <motion.div className="synapse-memory-sequence" initial={{ opacity: 0.2 }} animate={{ opacity: 1 }} transition={{ duration: 0.18 }}>
            {question.items.map((item, index) => <strong key={`${item}-${index}`}>{item}</strong>)}
          </motion.div>
        ) : (
          <div className="synapse-memory-hidden">
            <Badge tone="amber">Sequence masquee</Badge>
            <p>{question.recallPrompt}</p>
          </div>
        )}
      </Panel>
      {!visible ? <SynapseAnswerOptions {...props} /> : null}
    </>
  );
}

function IntruderExercise(props: SynapseExerciseViewProps) {
  return <SynapseAnswerOptions {...props} />;
}

function OrderingExercise(props: SynapseExerciseViewProps) {
  const question = props.question.type === "chronology" ? props.question : undefined;
  return (
    <>
      {question ? <div className="synapse-order-items">{question.items.map((item) => <span key={item.id}>{item.label}</span>)}</div> : null}
      <SynapseAnswerOptions {...props} />
    </>
  );
}

function VisualMatrixExercise(props: SynapseExerciseViewProps) {
  const question = props.question.type === "visual_matrix" ? props.question : undefined;
  return (
    <>
      {question ? (
        <div className="synapse-matrix-grid" aria-label="Matrice visuelle">
          {question.grid.map((cell, index) => <span key={`${cell}-${index}`} className={index === question.missingIndex ? "is-missing" : ""}>{index === question.missingIndex ? "?" : cell}</span>)}
        </div>
      ) : null}
      <SynapseAnswerOptions {...props} />
    </>
  );
}

function SymbolRuleExercise(props: SynapseExerciseViewProps) {
  const question = props.question.type === "symbol_rule" ? props.question : undefined;
  return (
    <>
      {question ? (
        <div className="synapse-symbol-rule">
          <strong>{question.rule}</strong>
          <div>{question.examples.map((example) => <span key={example}>{example}</span>)}</div>
        </div>
      ) : null}
      <SynapseAnswerOptions {...props} />
    </>
  );
}

function renderExercise(props: SynapseExerciseViewProps) {
  if (props.question.type === "analogy") return <AnalogyExercise {...props} />;
  if (props.question.type === "sequence") return <SequenceExercise {...props} />;
  if (props.question.type === "memory") return <MemoryExercise {...props} />;
  if (props.question.type === "intruder") return <IntruderExercise {...props} />;
  if (props.question.type === "chronology") return <OrderingExercise {...props} />;
  if (props.question.type === "visual_matrix") return <VisualMatrixExercise {...props} />;
  return <SymbolRuleExercise {...props} />;
}

export function SynapseExerciseView(props: SynapseExerciseViewProps) {
  const options = useMemo(() => synapseOptions(props.question), [props.question]);
  return (
    <div className="question-live synapse-live">
      <div className="question-value-strip">
        <Badge tone="violet">{exerciseLabel(props.question)}</Badge>
        <span>Difficulte {props.question.difficulty} - {options.length} propositions</span>
      </div>
      <h1>{props.question.prompt}</h1>
      {renderExercise(props)}
    </div>
  );
}
