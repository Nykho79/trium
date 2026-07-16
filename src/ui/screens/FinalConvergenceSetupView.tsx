import { FINAL_CONVERGENCE_ADVANTAGES, finalSuccessCount, type FinalConvergenceAdvantageId } from "../../rounds/final-convergence";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { Panel } from "../components/Panel";

interface FinalConvergenceSetupViewProps {
  score: number;
  purchasedAdvantageIds: readonly string[];
  usedQuestionCount: number;
  onBuyAdvantage: (advantageId: FinalConvergenceAdvantageId) => void;
  onStart: () => void;
  answerResults: readonly { isCorrect: boolean }[];
}

export function FinalConvergenceSetupView({ score, purchasedAdvantageIds, usedQuestionCount, onBuyAdvantage, onStart, answerResults }: FinalConvergenceSetupViewProps) {
  const purchased = new Set(purchasedAdvantageIds);
  const successes = finalSuccessCount({ answerResults: answerResults.map((result, index) => ({ questionId: `final-${index}`, isCorrect: result.isCorrect })) });
  return (
    <div className="final-setup" data-testid="final-setup">
      <div className="final-setup-heading">
        <Badge tone="amber">Convergence finale</Badge>
        <h1>{usedQuestionCount > 0 ? "Finale en cours" : "Acheter les avantages"}</h1>
        <p>Cinq etapes combinent culture generale, indices, connexion, memoire et logique. La victoire demande quatre reussites.</p>
      </div>
      <div className="final-status-strip">
        <div><span>Score disponible</span><strong>{score.toLocaleString("fr-FR")}</strong></div>
        <div><span>Reussites</span><strong>{successes} / 5</strong></div>
        <div><span>Avantages</span><strong>{purchased.size}</strong></div>
      </div>
      {usedQuestionCount === 0 ? (
        <div className="final-advantage-grid">
          {FINAL_CONVERGENCE_ADVANTAGES.map((advantage) => {
            const isPurchased = purchased.has(advantage.id);
            const disabled = isPurchased || score < advantage.cost;
            return (
              <button key={advantage.id} type="button" className={isPurchased ? "is-purchased" : ""} disabled={disabled} onClick={() => onBuyAdvantage(advantage.id)} data-testid={`final-advantage-${advantage.id}`}>
                <span>{advantage.label}</span>
                <strong>{advantage.cost.toLocaleString("fr-FR")}</strong>
                <small>{advantage.description}</small>
              </button>
            );
          })}
        </div>
      ) : null}
      <Panel className="final-rules-panel">
        <strong>Regle de victoire</strong>
        <span>Au moins quatre etapes reussies sur cinq. La protection annule une erreur, mais jamais une expiration du temps.</span>
      </Panel>
      <Button variant="primary" onClick={onStart} data-testid="start-final-question">{usedQuestionCount > 0 ? "Etape suivante" : "Lancer la finale"}</Button>
    </div>
  );
}