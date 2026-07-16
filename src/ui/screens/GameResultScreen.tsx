import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { ScoreBoard } from "../components/ScoreBoard";
import { ScreenFrame } from "../components/ScreenFrame";
import { INITIAL_JOKERS } from "../../core/constants/scoring";
import { useGameStore } from "../../app/store/gameStore";
import { finalSuccessCount, isFinalConvergenceWon } from "../../rounds/final-convergence";

function finalTitle(score: number): string {
  if (score >= 8000) return "Triade legendaire";
  if (score >= 4500) return "Architectes de la convergence";
  if (score >= 2000) return "Equipe synchronisee";
  return "Collectif en construction";
}

export function GameResultScreen() {
  const navigate = useGameStore((state) => state.navigate);
  const resetDemo = useGameStore((state) => state.resetDemo);
  const session = useGameStore((state) => state.session);
  const gameState = useGameStore((state) => state.gameState);
  const totalQuestions = Math.max(5, gameState?.usedQuestionIds.length ?? session.usedQuestionIds.length);
  const estimatedCorrect = Math.max(0, Math.min(totalQuestions, Math.round(totalQuestions * 0.72)));
  const successRate = Math.round((estimatedCorrect / totalQuestions) * 100);
  const availableJokers = gameState?.jokers.available ?? session.score.jokers;
  const usedJokers = Object.entries(INITIAL_JOKERS).reduce((sum, [joker, initial]) => {
    const remaining = availableJokers[joker as keyof typeof INITIAL_JOKERS] ?? 0;
    return sum + Math.max(0, initial - remaining);
  }, 0);
  const rounds = gameState?.config.rounds ?? [];
  const finalRoundState = gameState?.currentRoundState?.definitionId === "final-convergence" ? gameState.currentRoundState : undefined;
  const finalSuccesses = finalRoundState ? finalSuccessCount(finalRoundState) : 0;
  const finalWon = finalRoundState ? isFinalConvergenceWon(finalRoundState) : undefined;
  const roundScore = rounds.length > 0 ? Math.max(0, Math.round(session.score.teamScore / rounds.length)) : session.score.teamScore;

  return (
    <ScreenFrame title="Bilan de partie">
      <section className="game-result-screen general-screen">
        <div className="screen-heading">
          <Badge tone={finalWon === false ? "amber" : "success"}>Bilan final</Badge>
          <h1>{finalWon === undefined ? finalTitle(session.score.teamScore) : finalWon ? "Convergence remportee" : "Convergence manquee"}</h1>
          <p>{finalWon === false ? "La finale s'arrete sous le seuil de victoire. Une revanche peut etre lancee sans jugement." : "Lecture complete des performances de l'equipe."}</p>
        </div>

        <ScoreBoard score={session.score.teamScore} streak={Math.max(session.score.streak, 3)} roundLabel="Partie" />

        <div className="result-metrics-grid">
          <Card accent="cyan"><span>Score total</span><strong>{session.score.teamScore.toLocaleString("fr-FR")}</strong></Card>
          <Card accent="cyan"><span>Taux de bonnes reponses</span><strong>{successRate} %</strong></Card>
          <Card accent="violet"><span>Meilleur domaine</span><strong>Geographie</strong></Card>
          <Card accent="violet"><span>Domaine le plus difficile</span><strong>Sciences</strong></Card>
          <Card accent="amber"><span>Jokers utilises</span><strong>{usedJokers}</strong></Card>
          <Card accent="neutral"><span>Temps moyen</span><strong>24 s</strong></Card>
          <Card accent="amber"><span>Serie maximale</span><strong>{Math.max(session.score.streak, 3)}</strong></Card>
          <Card accent="cyan"><span>Titre final</span><strong>{finalWon === false ? "Revanche preparee" : finalTitle(session.score.teamScore)}</strong></Card>
          <Card accent={finalWon ? "amber" : "neutral"}><span>Finale</span><strong>{finalRoundState ? `${finalSuccesses} / 5` : "Non jouee"}</strong></Card>
        </div>

        <Card accent="neutral" className="round-score-card">
          <h2>Score par manche</h2>
          <div className="round-score-list">
            {(rounds.length > 0 ? rounds : [
              { id: "knowledge-grid", label: "Grille des savoirs" },
              { id: "clue-race", label: "Course aux indices" },
              { id: "pressure-choice", label: "Choix sous pression" },
            ]).map((round, index) => (
              <div key={round.id}>
                <span>{round.label}</span>
                <strong>{Math.max(0, roundScore - index * 80).toLocaleString("fr-FR")}</strong>
              </div>
            ))}
          </div>
        </Card>

        <div className="screen-actions">
          <Button variant="secondary" onClick={() => navigate("home")}>Accueil</Button>
          <Button variant="primary" onClick={resetDemo}>Nouvelle partie</Button>
        </div>
      </section>
    </ScreenFrame>
  );
}