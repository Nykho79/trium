import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { Panel } from "../components/Panel";
import { ScreenFrame } from "../components/ScreenFrame";
import { useGameStore } from "../../app/store/gameStore";

export function ResumeGameScreen() {
  const navigate = useGameStore((state) => state.navigate);
  const resumeSavedGame = useGameStore((state) => state.resumeSavedGame);
  const clearSavedGame = useGameStore((state) => state.clearSavedGame);
  const hasSavedGame = useGameStore((state) => state.hasSavedGame);
  const gameState = useGameStore((state) => state.gameState);
  const persistenceError = useGameStore((state) => state.persistenceError);

  return (
    <ScreenFrame title="Reprendre une partie">
      <section className="result-screen general-screen">
        <Panel className="result-card" tone="strong">
          <Badge tone={hasSavedGame ? "success" : "neutral"}>{hasSavedGame ? "Sauvegarde trouvee" : "Aucune sauvegarde"}</Badge>
          <h1>Reprendre</h1>
          {hasSavedGame && gameState ? (
            <div className="resume-summary">
              <div><span>Etat</span><strong>{gameState.status}</strong></div>
              <div><span>Manche</span><strong>{gameState.currentRoundIndex + 1} / {gameState.config.rounds.length}</strong></div>
              <div><span>Score</span><strong>{gameState.score.total.toLocaleString("fr-FR")}</strong></div>
            </div>
          ) : (
            <p>{persistenceError ?? "Aucune partie interrompue n'est disponible sur cet ordinateur."}</p>
          )}
          <div className="screen-actions">
            <Button variant="secondary" onClick={() => navigate("home")}>Retour</Button>
            <Button variant="danger" onClick={clearSavedGame} disabled={!hasSavedGame}>Supprimer</Button>
            <Button variant="primary" onClick={resumeSavedGame} disabled={!hasSavedGame}>Reprendre la partie</Button>
          </div>
          <Button variant="ghost" onClick={() => navigate("player-setup")}>Demarrer une nouvelle partie</Button>
        </Panel>
      </section>
    </ScreenFrame>
  );
}