import { beforeEach, describe, expect, it } from "vitest";
import { STORAGE_KEYS, STORAGE_SCHEMA_VERSION } from "../../core/constants/storage";
import { createGame } from "../../core/engine/gameEngine";
import type { GameConfig, Player, RoundDefinition } from "../../core/types";
import {
  buildSavedGameEnvelope,
  clearSavedGame,
  loadRecentQuestionHistory,
  loadRecentQuestionIds,
  loadSavedGame,
  migrateSavedGame,
  saveGameEnvelope,
  saveRecentQuestionHistory,
  saveRecentQuestionIds,
} from "../../app/store/persistence";

const players: [Player, Player, Player] = [
  { id: "player-1", name: "Alice", color: "cyan", ready: true },
  { id: "player-2", name: "Benoit", color: "amber", ready: true },
  { id: "player-3", name: "Camille", color: "magenta", ready: true },
];

const round: RoundDefinition = {
  id: "round-pressure",
  kind: "pressure-choice",
  label: "Choix sous pression",
  description: "QCM test.",
  questionTypes: ["multiple_choice"],
  questionCount: 1,
  maxScore: 500,
};

const config: GameConfig = {
  id: "config-store-test",
  mode: "standard",
  seed: "seed-store-test",
  playerMode: "trio", players,
  rounds: [round],
  questionBankVersion: 1,
  allowRecentlyPlayedFallback: true,
  defaultQuestionTimeMs: 30_000,
};

function makeEnvelope() {
  const gameState = createGame({ config, recentlyPlayedQuestionIds: ["q-old"], now: 0 });
  return buildSavedGameEnvelope({
    gameState,
    screen: "game-intro",
    selectedAnswerId: "a",
    now: new Date("2026-07-16T12:00:00.000Z"),
  });
}

describe("local persistence", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("sauvegarde et restaure une partie versionnee", () => {
    const envelope = makeEnvelope();
    const saved = saveGameEnvelope(envelope, localStorage);
    const loaded = loadSavedGame(localStorage);

    expect(saved.ok).toBe(true);
    expect(loaded.ok).toBe(true);
    if (!loaded.ok || loaded.value === null) {
      throw new Error("La sauvegarde devrait etre restauree.");
    }
    expect(loaded.value.version).toBe(STORAGE_SCHEMA_VERSION);
    expect(loaded.value.gameState.config.players).toHaveLength(3);
    expect(loaded.value.selectedAnswerId).toBe("a");
  });

  it("ignore une sauvegarde corrompue sans lancer d'exception", () => {
    localStorage.setItem(STORAGE_KEYS.savedSession, "{json-invalide");
    const loaded = loadSavedGame(localStorage);

    expect(loaded.ok).toBe(false);
    if (loaded.ok) {
      throw new Error("La sauvegarde corrompue doit etre rejetee.");
    }
    expect(loaded.error).toContain("illisible");
  });

  it("rejette une version non supportee via migration", () => {
    const migrated = migrateSavedGame({ ...makeEnvelope(), version: 99 });

    expect(migrated.ok).toBe(false);
    if (migrated.ok) {
      throw new Error("La migration devrait refuser la version inconnue.");
    }
    expect(migrated.error).toContain("non supportee");
  });

  it("sauvegarde et restaure l'historique recent par partie", () => {
    const saved = saveRecentQuestionHistory([
      { seed: "seed-a", questionIds: ["q-1", "q-1", "q-2"], completedAt: "2026-07-16T12:00:00.000Z" },
    ], localStorage);
    const loaded = loadRecentQuestionHistory(localStorage);

    expect(saved.ok).toBe(true);
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) {
      throw new Error("L'historique structure devrait etre restaure.");
    }
    expect(loaded.value).toEqual([
      { seed: "seed-a", questionIds: ["q-1", "q-2"], completedAt: "2026-07-16T12:00:00.000Z" },
    ]);
  });

  it("supprime la partie sauvegardee sans effacer l'historique recent", () => {
    saveGameEnvelope(makeEnvelope(), localStorage);
    saveRecentQuestionIds(["q-1", "q-2", "q-2"], localStorage);

    const cleared = clearSavedGame(localStorage);
    const loaded = loadSavedGame(localStorage);
    const recent = loadRecentQuestionIds(localStorage);

    expect(cleared.ok).toBe(true);
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) {
      throw new Error("La lecture apres suppression ne doit pas echouer.");
    }
    expect(loaded.value).toBeNull();
    expect(recent.ok).toBe(true);
    if (!recent.ok) {
      throw new Error("L'historique recent devrait etre disponible.");
    }
    expect(recent.value).toEqual(["q-1", "q-2"]);
  });
});