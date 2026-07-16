import { z } from "zod";
import { STORAGE_KEYS, STORAGE_SCHEMA_VERSION } from "../../core/constants/storage";
import { gameStateSchema } from "../../core/schemas";
import type { AppScreen, GameState, QuestionId } from "../../core/types";

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
  "game-intro",
  "round-intro",
  "game",
  "question-transition",
  "round-result",
  "finale",
  "summary",
  "settings",
  "dev-question-bank",
]);

export const savedGameEnvelopeSchema = z.object({
  version: z.literal(STORAGE_SCHEMA_VERSION),
  savedAt: z.string().datetime(),
  screen: appScreenSchema,
  selectedAnswerId: z.string().min(1).optional(),
  gameState: gameStateSchema,
  recentQuestionIds: z.array(z.string().min(1)),
});

export type SavedGameEnvelope = z.infer<typeof savedGameEnvelopeSchema>;

const recentQuestionHistorySchema = z.object({
  version: z.literal(STORAGE_SCHEMA_VERSION),
  questionIds: z.array(z.string().min(1)),
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
    saveRecentQuestionIds(validation.data.recentQuestionIds, storage);
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

export function loadRecentQuestionIds(storage = browserStorage()): PersistenceResult<QuestionId[]> {
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
  return { ok: true, value: validation.data.questionIds };
}

export function saveRecentQuestionIds(questionIds: readonly QuestionId[], storage = browserStorage()): PersistenceResult<QuestionId[]> {
  if (!storage) {
    return { ok: true, value: [...questionIds] };
  }
  const uniqueQuestionIds = [...new Set(questionIds)].slice(-50);
  try {
    storage.setItem(STORAGE_KEYS.recentQuestions, JSON.stringify({
      version: STORAGE_SCHEMA_VERSION,
      questionIds: uniqueQuestionIds,
    }));
    return { ok: true, value: uniqueQuestionIds };
  } catch (error) {
    return { ok: false, error: `Impossible d'ecrire l'historique recent: ${stringifyError(error)}` };
  }
}