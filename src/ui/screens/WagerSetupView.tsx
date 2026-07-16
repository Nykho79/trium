import type { Difficulty } from "../../core/types";
import type { WagerQuestion } from "../../rounds/wager";
import {
  availableWagerCategories,
  availableWagerDifficulties,
  coefficientForWagerDifficulty,
  isAllowedWagerAmount,
  isFreeMinimumStake,
  maximumCustomWager,
  selectWagerQuestions,
  STANDARD_WAGER_AMOUNTS,
  wagerDifficultyLabel,
} from "../../rounds/wager";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { Panel } from "../components/Panel";

interface WagerSetupViewProps {
  questions: readonly WagerQuestion[];
  usedQuestionIds: readonly string[];
  seed: string;
  teamScore: number;
  selectedCategoryId: string | undefined;
  selectedDifficulty: Difficulty | undefined;
  selectedAmount: number | undefined;
  customAmount: string;
  isConfirming: boolean;
  answeredCount: number;
  targetCount: number;
  onSelectCategory: (categoryId: string) => void;
  onSelectDifficulty: (difficulty: Difficulty) => void;
  onSelectAmount: (amount: number) => void;
  onCustomAmountChange: (value: string) => void;
  onRequestConfirm: () => void;
  onCancelConfirm: () => void;
  onConfirm: () => void;
  onCompleteRound: () => void;
}

function categoryLabel(questions: readonly WagerQuestion[], categoryId: string | undefined): string {
  return questions.find((question) => question.categoryId === categoryId)?.categoryLabel ?? "Categorie";
}

function matchingQuestionCount(input: {
  questions: readonly WagerQuestion[];
  usedQuestionIds: readonly string[];
  seed: string;
  categoryId: string | undefined;
  difficulty: Difficulty | undefined;
}): number {
  if (!input.categoryId || input.difficulty === undefined) return 0;
  return selectWagerQuestions({
    questions: input.questions,
    alreadyUsedQuestionIds: input.usedQuestionIds,
    categoryId: input.categoryId,
    difficulty: input.difficulty,
    seed: input.seed,
  }).length;
}

export function WagerSetupView({
  questions,
  usedQuestionIds,
  seed,
  teamScore,
  selectedCategoryId,
  selectedDifficulty,
  selectedAmount,
  customAmount,
  isConfirming,
  answeredCount,
  targetCount,
  onSelectCategory,
  onSelectDifficulty,
  onSelectAmount,
  onCustomAmountChange,
  onRequestConfirm,
  onCancelConfirm,
  onConfirm,
  onCompleteRound,
}: WagerSetupViewProps) {
  const categories = availableWagerCategories(questions);
  const difficulties = selectedCategoryId ? availableWagerDifficulties(questions, selectedCategoryId) : [];
  const customMax = maximumCustomWager(teamScore);
  const parsedCustomAmount = Number.parseInt(customAmount, 10);
  const hasCustomAmount = Number.isInteger(parsedCustomAmount) && parsedCustomAmount > 0;
  const customAllowed = hasCustomAmount && isAllowedWagerAmount({ amount: parsedCustomAmount, scoreTotal: teamScore }) && parsedCustomAmount <= customMax;
  const matchCount = matchingQuestionCount({ questions, usedQuestionIds, seed, categoryId: selectedCategoryId, difficulty: selectedDifficulty });
  const canConfirm = selectedCategoryId !== undefined && selectedDifficulty !== undefined && selectedAmount !== undefined && matchCount > 0;
  const freeStake = selectedAmount !== undefined && isFreeMinimumStake(teamScore, selectedAmount);

  if (answeredCount >= targetCount) {
    return (
      <div className="wager-empty-state">
        <Badge tone="amber">Le Pari</Badge>
        <h1>Manche terminee</h1>
        <p>Les cinq paris sont joues.</p>
        <Button variant="primary" onClick={onCompleteRound}>Resultat de manche</Button>
      </div>
    );
  }

  return (
    <div className="wager-setup" data-testid="wager-setup">
      <div className="wager-setup-heading">
        <Badge tone="amber">Pari {answeredCount + 1}</Badge>
        <h1>Choisir le risque</h1>
        <p>Selectionnez une categorie, une difficulte et une mise. Le pari doit etre confirme avant la question.</p>
      </div>

      <div className="wager-step-grid">
        <Panel className="wager-step-panel">
          <h2>1. Categorie</h2>
          <div className="wager-choice-grid">
            {categories.map((category) => (
              <button key={category.id} type="button" className={selectedCategoryId === category.id ? "is-selected" : ""} onClick={() => onSelectCategory(category.id)}>
                {category.label}
              </button>
            ))}
          </div>
        </Panel>

        <Panel className="wager-step-panel">
          <h2>2. Difficulte</h2>
          <div className="wager-choice-grid">
            {difficulties.map((difficulty) => (
              <button key={difficulty} type="button" className={selectedDifficulty === difficulty ? "is-selected" : ""} onClick={() => onSelectDifficulty(difficulty)}>
                <span>{wagerDifficultyLabel(difficulty)}</span>
                <strong>x{coefficientForWagerDifficulty(difficulty)}</strong>
              </button>
            ))}
          </div>
        </Panel>

        <Panel className="wager-step-panel">
          <h2>3. Mise</h2>
          <div className="wager-choice-grid">
            {STANDARD_WAGER_AMOUNTS.map((amount) => {
              const allowed = isAllowedWagerAmount({ amount, scoreTotal: teamScore });
              return (
                <button key={amount} type="button" className={selectedAmount === amount ? "is-selected" : ""} disabled={!allowed} onClick={() => onSelectAmount(amount)}>
                  {amount}
                </button>
              );
            })}
          </div>
          <label className="wager-custom-input">
            <span>Mise libre max {customMax}</span>
            <input inputMode="numeric" value={customAmount} onChange={(event) => onCustomAmountChange(event.target.value)} placeholder="Mise libre" />
          </label>
          <Button variant="secondary" onClick={() => onSelectAmount(parsedCustomAmount)} disabled={!customAllowed}>Utiliser la mise libre</Button>
        </Panel>
      </div>

      <Panel className="wager-summary-panel">
        <div>
          <span>Categorie</span>
          <strong>{categoryLabel(questions, selectedCategoryId)}</strong>
        </div>
        <div>
          <span>Difficulte</span>
          <strong>{selectedDifficulty ? `${wagerDifficultyLabel(selectedDifficulty)} x${coefficientForWagerDifficulty(selectedDifficulty)}` : "A choisir"}</strong>
        </div>
        <div>
          <span>Mise</span>
          <strong>{selectedAmount ?? "A choisir"}{freeStake ? " gratuite" : ""}</strong>
        </div>
        <div>
          <span>Questions disponibles</span>
          <strong>{matchCount}</strong>
        </div>
      </Panel>

      {isConfirming ? (
        <Panel className="wager-confirm-panel" data-testid="wager-confirm-panel">
          <strong>Confirmer ce pari ?</strong>
          <p>Une bonne reponse rapporte la mise multipliee. Une erreur retire uniquement la mise, sans score negatif.</p>
          <div className="screen-actions">
            <Button variant="secondary" onClick={onCancelConfirm}>Modifier</Button>
            <Button variant="primary" onClick={onConfirm} disabled={!canConfirm} data-testid="confirm-wager-button">Confirmer</Button>
          </div>
        </Panel>
      ) : (
        <Button variant="primary" onClick={onRequestConfirm} disabled={!canConfirm} data-testid="validate-wager-button">Valider le pari</Button>
      )}
    </div>
  );
}
