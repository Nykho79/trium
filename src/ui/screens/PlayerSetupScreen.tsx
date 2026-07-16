import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { Panel } from "../components/Panel";
import { PlayerBadge } from "../components/PlayerBadge";
import { ScreenFrame } from "../components/ScreenFrame";
import { useGameStore } from "../../app/store/gameStore";

const MAX_NAME_LENGTH = 14;

type PlayerIndex = 0 | 1 | 2;

function normalizedName(name: string): string {
  return name.trim().toLocaleLowerCase("fr-FR");
}

function validationMessage(names: readonly string[]): string | undefined {
  const trimmed = names.map((name) => name.trim());
  if (trimmed.some((name) => name.length === 0)) {
    return "Les trois prenoms sont obligatoires.";
  }
  if (trimmed.some((name) => name.length > MAX_NAME_LENGTH)) {
    return `Chaque prenom doit faire ${MAX_NAME_LENGTH} caracteres maximum.`;
  }
  if (new Set(trimmed.map(normalizedName)).size !== trimmed.length) {
    return "Les prenoms doivent etre uniques.";
  }
  return undefined;
}

export function PlayerSetupScreen() {
  const players = useGameStore((state) => state.session.players);
  const updatePlayerName = useGameStore((state) => state.updatePlayerName);
  const navigate = useGameStore((state) => state.navigate);
  const names = players.map((player) => player.name);
  const error = validationMessage(names);

  return (
    <ScreenFrame title="Configuration des joueurs">
      <section className="setup-screen general-screen">
        <div className="screen-heading">
          <Badge tone="cyan">Equipe</Badge>
          <h1>Configuration des joueurs</h1>
          <p>Exactement trois prenoms, uniques et courts pour rester lisibles sur television.</p>
        </div>
        <div className="setup-grid">
          {players.map((player, index) => (
            <Panel key={player.id} className={`setup-player player-${player.color}`}>
              <PlayerBadge player={player} />
              <label htmlFor={player.id}>Prenom joueur {index + 1}</label>
              <input
                id={player.id}
                value={player.name}
                maxLength={MAX_NAME_LENGTH}
                aria-invalid={error !== undefined}
                onChange={(event) => updatePlayerName(index as PlayerIndex, event.target.value)}
              />
              <span>Couleur attribuee : {player.color}</span>
            </Panel>
          ))}
        </div>
        {error ? <p className="form-error" role="alert">{error}</p> : <p className="form-success">Equipe validee : trois joueurs prets.</p>}
        <div className="screen-actions">
          <Button variant="secondary" onClick={() => navigate("home")}>Retour</Button>
          <Button variant="primary" onClick={() => navigate("game-mode")} disabled={error !== undefined}>Choisir le mode</Button>
        </div>
      </section>
    </ScreenFrame>
  );
}