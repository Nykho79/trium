import { z } from "zod";
import { STORAGE_KEYS, STORAGE_SCHEMA_VERSION } from "../../core/constants/storage";
import { gameStateSchema } from "../../core/schemas";
import type { AppScreen, GameState, QuestionId } from "../../core/types";
import type { RecentQuestionGame } from "../../core/engine/replayability";
import { flattenRecentQuestionHistory, trimRecentQuestionHistory } from "../../core/engine/replayability";

export interface StorageLike {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
}

export type PersistenceResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

const appScreenSchema = z.enum([
  "home",
  "rules",
  "player-setup",
  "format-selection",
  "game-mode",
  "resume-game",
  "game-intro",
  "round-intro",
  "game",
  "question-transition",
  "round-result",
  "finale",
  "summary",
  "game-result",
  "settings",
  "dev-question-bank",
  "design-system",
  "error",
]);

const recentQuestionGameSchema = z.object({
  seed: z.string().min(1),
  questionIds: z.array(z.string().min(1)),
  completedAt: z.string().datetime(),
});

export const savedGameEnvelopeSchema = z.object({
  version: z.literal(STORAGE_SCHEMA_VERSION),
  savedAt: z.string().datetime(),
  screen: appScreenSchema,
  selectedAnswerId: z.string().min(1).optional(),
  gameState: gameStateSchema,
  recentQuestionIds: z.array(z.string().min(1)),
  recentQuestionHistory: z.array(recentQuestionGameSchema).default([]),
});

export type SavedGameEnvelope = z.infer<typeof savedGameEnvelopeSchema>;

const recentQuestionHistorySchema = z.object({
  version: z.literal(STORAGE_SCHEMA_VERSION),
  questionIds: z.array(z.string().min(1)).default([]),
  games: z.array(recentQuestionGameSchema).default([]),
});

function browserStorage(): StorageLike | undefined {
  return typeof window === "undefined" ? undefined : window.localStorage;
}

function stringifyError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return "Erreur de persistance locale inconnue.";
}

function readJson(storage: StorageLike, key: string): PersistenceResult<unknown | null> {
  try {
    const raw = storage.getItem(key);
    return { ok: true, value: raw === null ? null : JSON.parse(raw) };
  } catch (error) {
    return { ok: false, error: `Sauvegarde locale illisible: ${stringifyError(error)}` };
  }
}

export function buildSavedGameEnvelope(input: {
  gameState: GameState;
  screen: AppScreen;
  selectedAnswerId?: string | undefined;
  now?: Date | undefined;
}): SavedGameEnvelope {
  return {
    version: STORAGE_SCHEMA_VERSION,
    savedAt: (input.now ?? new Date()).toISOString(),
    screen: input.screen,
    selectedAnswerId: input.selectedAnswerId,
    gameState: input.gameState,
    recentQuestionIds: input.gameState.recentlyPlayedQuestionIds,
    recentQuestionHistory: input.gameState.recentQuestionHistory,
  };
}

export function loadSavedGame(storage = browserStorage()): PersistenceResult<SavedGameEnvelope | null> {
  if (!storage) {
    return { ok: true, value: null };
  }
  const parsed = readJson(storage, STORAGE_KEYS.savedSession);
  if (!parsed.ok) {
    return parsed;
  }
  if (parsed.value === null) {
    return { ok: true, value: null };
  }

  const migrated = migrateSavedGame(parsed.value);
  if (!migrated.ok) {
    return migrated;
  }
  return { ok: true, value: migrated.value };
}

export function saveGameEnvelope(envelope: SavedGameEnvelope, storage = browserStorage()): PersistenceResult<SavedGameEnvelope> {
  if (!storage) {
    return { ok: true, value: envelope };
  }
  const validation = savedGameEnvelopeSchema.safeParse(envelope);
  if (!validation.success) {
    return { ok: false, error: "Sauvegarde refusee: format de partie invalide." };
  }
  try {
    storage.setItem(STORAGE_KEYS.savedSession, JSON.stringify(validation.data));
    saveRecentQuestionHistory(validation.data.recentQuestionHistory, storage);
    return { ok: true, value: validation.data };
  } catch (error) {
    return { ok: false, error: `Impossible d'ecrire la sauvegarde locale: ${stringifyError(error)}` };
  }
}

export function clearSavedGame(storage = browserStorage()): PersistenceResult<null> {
  if (!storage) {
    return { ok: true, value: null };
  }
  try {
    storage.removeItem(STORAGE_KEYS.savedSession);
    return { ok: true, value: null };
  } catch (error) {
    return { ok: false, error: `Impossible de supprimer la sauvegarde locale: ${stringifyError(error)}` };
  }
}

export function migrateSavedGame(raw: unknown): PersistenceResult<SavedGameEnvelope> {
  const version = z.object({ version: z.number().int() }).safeParse(raw);
  if (!version.success) {
    return { ok: false, error: "Sauvegarde ignoree: version absente ou invalide." };
  }
  if (version.data.version !== STORAGE_SCHEMA_VERSION) {
    return { ok: false, error: `Sauvegarde ignoree: version ${version.data.version} non supportee.` };
  }

  const parsed = savedGameEnvelopeSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "Sauvegarde ignoree: donnees de partie invalides." };
  }
  return { ok: true, value: parsed.data };
}

export function loadRecentQuestionHistory(storage = browserStorage()): PersistenceResult<RecentQuestionGame[]> {
  if (!storage) {
    return { ok: true, value: [] };
  }
  const parsed = readJson(storage, STORAGE_KEYS.recentQuestions);
  if (!parsed.ok) {
    return parsed;
  }
  if (parsed.value === null) {
    return { ok: true, value: [] };
  }
  const validation = recentQuestionHistorySchema.safeParse(parsed.value);
  if (!validation.success) {
    return { ok: false, error: "Historique recent ignore: format invalide." };
  }
  if (validation.data.games.length > 0) {
    return { ok: true, value: trimRecentQuestionHistory(validation.data.games) };
  }
  if (validation.data.questionIds.length === 0) {
    return { ok: true, value: [] };
  }
  return {
    ok: true,
    value: [{ seed: "legacy", questionIds: [...new Set(validation.data.questionIds)], completedAt: new Date(0).toISOString() }],
  };
}

export function saveRecentQuestionHistory(history: readonly RecentQuestionGame[], storage = browserStorage()): PersistenceResult<RecentQuestionGame[]> {
  const trimmed = trimRecentQuestionHistory(history);
  if (!storage) {
    return { ok: true, value: trimmed };
  }
  try {
    storage.setItem(STORAGE_KEYS.recentQuestions, JSON.stringify({
      version: STORAGE_SCHEMA_VERSION,
      questionIds: flattenRecentQuestionHistory(trimmed),
      games: trimmed,
    }));
    return { ok: true, value: trimmed };
  } catch (error) {
    return { ok: false, error: `Impossible d'ecrire l'historique recent: ${stringifyError(error)}` };
  }
}

export function loadRecentQuestionIds(storage = browserStorage()): PersistenceResult<QuestionId[]> {
  const history = loadRecentQuestionHistory(storage);
  if (!history.ok) {
    return history;
  }
  return { ok: true, value: flattenRecentQuestionHistory(history.value) };
}

export function saveRecentQuestionIds(questionIds: readonly QuestionId[], storage = browserStorage()): PersistenceResult<QuestionId[]> {
  const uniqueQuestionIds = [...new Set(questionIds)].slice(-250);
  const history: RecentQuestionGame[] = uniqueQuestionIds.length > 0
    ? [{ seed: "legacy", questionIds: uniqueQuestionIds, completedAt: new Date(0).toISOString() }]
    : [];
  const saved = saveRecentQuestionHistory(history, storage);
  if (!saved.ok) {
    return saved;
  }
  return { ok: true, value: flattenRecentQuestionHistory(saved.value) };
}
