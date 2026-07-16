import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AnswerButton } from "../../ui/components/AnswerButton";
import { Button } from "../../ui/components/Button";
import { ConfirmationDialog } from "../../ui/components/ConfirmationDialog";
import { PlayerBadge } from "../../ui/components/PlayerBadge";
import { ProgressBar } from "../../ui/components/ProgressBar";
import { Timer } from "../../ui/components/Timer";
import type { Player } from "../../core/types";

const player: Player = { id: "player-1", name: "Alice", color: "cyan", ready: true };

describe("design system components", () => {
  it("rend les boutons avec des zones interactives accessibles", () => {
    const onClick = vi.fn();
    render(<Button variant="primary" icon="play" onClick={onClick}>Lancer</Button>);

    fireEvent.click(screen.getByRole("button", { name: "Lancer" }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("expose la progression et le chrono avec des labels lisibles", () => {
    render(
      <>
        <ProgressBar value={2} max={5} label="Progression" />
        <Timer remainingMs={12_000} totalMs={30_000} />
      </>,
    );

    expect(screen.getByRole("progressbar", { name: "Progression" })).toHaveAttribute("aria-valuenow", "2");
    expect(screen.getByLabelText("Chrono 00:12")).toBeInTheDocument();
  });

  it("rend une reponse et un badge joueur capitaine", () => {
    render(
      <>
        <AnswerButton answerId="a" label="Nancy" state="selected" />
        <PlayerBadge player={player} isCaptain />
      </>,
    );

    expect(screen.getByRole("button", { name: /Nancy/i })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Alice")).toBeInTheDocument();
  });

  it("affiche un dialogue de confirmation actionnable", () => {
    const onCancel = vi.fn();
    const onConfirm = vi.fn();
    render(
      <ConfirmationDialog
        isOpen
        title="Supprimer la partie ?"
        message="La sauvegarde locale sera retiree."
        confirmLabel="Supprimer"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    expect(screen.getByRole("dialog", { name: "Supprimer la partie ?" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Supprimer" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});