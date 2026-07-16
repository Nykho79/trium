import { useState } from "react";
import { useGameStore } from "../../app/store/gameStore";
import { AnswerButton } from "../components/AnswerButton";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { CaptainIndicator } from "../components/CaptainIndicator";
import { Card } from "../components/Card";
import { ConfirmationDialog } from "../components/ConfirmationDialog";
import { FeedbackBanner } from "../components/FeedbackBanner";
import { IconButton } from "../components/IconButton";
import { JokerButton } from "../components/JokerButton";
import { LoadingScreen } from "../components/LoadingScreen";
import { Modal } from "../components/Modal";
import { Panel } from "../components/Panel";
import { PlayerBadge } from "../components/PlayerBadge";
import { ProgressBar } from "../components/ProgressBar";
import { RoundHeader } from "../components/RoundHeader";
import { ScoreBoard } from "../components/ScoreBoard";
import { ScreenFrame } from "../components/ScreenFrame";
import { Timer } from "../components/Timer";

export function DesignSystemScreen() {
  const navigate = useGameStore((state) => state.navigate);
  const players = useGameStore((state) => state.session.players);
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmationOpen, setConfirmationOpen] = useState(false);

  return (
    <ScreenFrame title="Design system TRIUM">
      <section className="design-system-screen">
        <RoundHeader roundLabel="Grille des savoirs" questionIndex={2} questionCount={5} categoryLabel="Culture generale · Geographie" />

        <Panel className="ds-section" labelledBy="ds-tokens-title">
          <div className="ds-heading-row">
            <div>
              <Badge tone="cyan">Fondations</Badge>
              <h1 id="ds-tokens-title">Design system TRIUM</h1>
            </div>
            <Button variant="secondary" icon="arrow" onClick={() => navigate("settings")}>Retour</Button>
          </div>
          <div className="token-grid" aria-label="Palette TRIUM">
            <span className="swatch swatch-night">Bleu nuit</span>
            <span className="swatch swatch-violet">Violet profond</span>
            <span className="swatch swatch-cyan">Cyan</span>
            <span className="swatch swatch-amber">Ambre</span>
          </div>
        </Panel>

        <div className="ds-grid">
          <Card accent="cyan">
            <h2>Boutons</h2>
            <div className="component-row">
              <Button variant="primary" icon="play">Primaire</Button>
              <Button variant="secondary" icon="settings">Secondaire</Button>
              <Button variant="ghost">Discret</Button>
              <IconButton icon="close" label="Fermer" />
            </div>
          </Card>

          <Card accent="amber">
            <h2>Score et progression</h2>
            <ScoreBoard score={4250} streak={3} roundLabel="Synapse" />
            <ProgressBar value={3} max={5} label="Avancement" tone="amber" />
            <Timer remainingMs={18_000} totalMs={30_000} />
          </Card>

          <Card accent="violet">
            <h2>Joueurs</h2>
            <div className="component-stack">
              <CaptainIndicator playerName={players[0].name} />
              {players.map((player, index) => <PlayerBadge key={player.id} player={player} isCaptain={index === 0} />)}
            </div>
          </Card>

          <Card accent="neutral">
            <h2>Réponses</h2>
            <div className="answer-grid live">
              <AnswerButton answerId="a" label="Nancy" state="correct" />
              <AnswerButton answerId="b" label="Metz" state="idle" />
              <AnswerButton answerId="c" label="Dijon" state="selected" />
              <AnswerButton answerId="d" label="Besançon" state="incorrect" />
            </div>
          </Card>

          <Card accent="cyan">
            <h2>Jokers</h2>
            <div className="joker-demo-grid">
              <JokerButton label="50/50" remaining={1} icon="target" />
              <JokerButton label="Indice" remaining={2} icon="spark" active />
              <JokerButton label="Temps +" remaining={0} icon="timer" />
            </div>
          </Card>

          <Card accent="amber">
            <h2>Retours</h2>
            <div className="component-stack">
              <FeedbackBanner tone="success" title="Bonne réponse" message="+300 points pour l'équipe." />
              <FeedbackBanner tone="warning" title="Temps faible" message="Le capitaine doit verrouiller une réponse." />
            </div>
          </Card>

          <Card accent="violet">
            <h2>Dialogues</h2>
            <div className="component-row">
              <Button variant="secondary" onClick={() => setModalOpen(true)}>Ouvrir modal</Button>
              <Button variant="danger" onClick={() => setConfirmationOpen(true)}>Confirmer</Button>
            </div>
          </Card>

          <Card accent="neutral">
            <h2>Chargement</h2>
            <LoadingScreen title="Préparation" message="Validation de la banque locale" />
          </Card>
        </div>
      </section>

      <Modal isOpen={modalOpen} title="Fenêtre système" onClose={() => setModalOpen(false)}>
        <p>Les modales conservent de larges zones cliquables et un focus visible.</p>
      </Modal>
      <ConfirmationDialog
        isOpen={confirmationOpen}
        title="Supprimer la partie ?"
        message="La partie en cours sera retirée de cet ordinateur."
        confirmLabel="Supprimer"
        onConfirm={() => setConfirmationOpen(false)}
        onCancel={() => setConfirmationOpen(false)}
      />
    </ScreenFrame>
  );
}