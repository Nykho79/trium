import { Button } from "../components/Button";
import { Panel } from "../components/Panel";
import { ScreenFrame } from "../components/ScreenFrame";
import { useGameStore } from "../../app/store/gameStore";

export function PlayerSetupScreen() {
  const players = useGameStore((state) => state.session.players);
  const updatePlayerName = useGameStore((state) => state.updatePlayerName);
  const navigate = useGameStore((state) => state.navigate);

  return (
    <ScreenFrame title="Configuration des joueurs">
      <section className="setup-screen">
        <div className="screen-heading">
          <h1>Configuration des joueurs</h1>
          <p>Trois joueurs exactement. Les noms restent stockés localement sur cet ordinateur.</p>
        </div>
        <div className="setup-grid">
          {players.map((player, index) => (
            <Panel key={player.id} className={`setup-player player-${player.color}`}>
              <label htmlFor={player.id}>Joueur {index + 1}</label>
              <input
                id={player.id}
                value={player.name}
                onChange={(event) => updatePlayerName(index as 0 | 1 | 2, event.target.value)}
              />
              <span>Statut : prêt</span>
            </Panel>
          ))}
        </div>
        <div className="screen-actions">
          <Button variant="secondary" onClick={() => navigate("home")}>Retour</Button>
          <Button variant="primary" onClick={() => navigate("format-selection")}>Choisir le format</Button>
        </div>
      </section>
    </ScreenFrame>
  );
}
