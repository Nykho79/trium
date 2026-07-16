# Architecture TRIUM

## 1. Synthese de la specification

TRIUM est une application web locale de quiz cooperatif pour exactement trois joueurs, pensee pour un ordinateur branche en HDMI sur une television 16:9. La V1 doit fonctionner sans authentification, sans multijoueur en ligne, sans API externe pendant la partie et avec une banque de questions locale en JSON.

Le produit doit combiner :

- un moteur de jeu pur, testable et independant de React ;
- une interface React premium, lisible sur TV, entierement en francais ;
- des manches modulaires, chacune avec ses regles, son type de question et son calcul de score ;
- une validation stricte des donnees de questions avec Zod ;
- une persistance locale des parametres et des parties interrompues via `localStorage` ;
- un build statique compatible Cloudflare Pages.

La priorite technique est de construire une base extensible avant d'ajouter les ecrans complets ou les effets visuels.

## 2. Stack retenue

Stack imposee :

- React
- TypeScript strict
- Vite
- Tailwind CSS
- Framer Motion
- Zustand
- Zod
- Howler.js
- Vitest
- Playwright

Regles d'usage :

- TypeScript doit rester en mode strict.
- `any` est interdit sauf justification locale, documentee en commentaire.
- Les types metier sont centralises dans `src/core/types`.
- Les constantes de jeu sont centralisees dans `src/core/constants`.
- Le moteur de jeu ne doit pas importer React, Zustand, Framer Motion, Howler ou le DOM.
- Les fonctions de score sont pures et testees par Vitest.
- Les donnees JSON sont validees au chargement avant toute utilisation.

## 3. Arborescence cible exacte

```txt
trium/
  ARCHITECTURE.md
  README.md
  package.json
  package-lock.json
  tsconfig.json
  tsconfig.node.json
  vite.config.ts
  vitest.config.ts
  playwright.config.ts
  index.html
  public/
    favicon.svg
    questions/
      v1.sample.json
    audio/
      README.md
  src/
    app/
      App.tsx
      routes.ts
      providers/
        AppProviders.tsx
      store/
        gameStore.ts
        settingsStore.ts
        audioStore.ts
        persistence.ts
    core/
      constants/
        game.ts
        rounds.ts
        scoring.ts
        storage.ts
      engine/
        gameMachine.ts
        gameReducer.ts
        questionSelection.ts
        random.ts
        recentQuestions.ts
        scoring.ts
      schemas/
        questionSchemas.ts
        saveGameSchemas.ts
      types/
        answer.ts
        game.ts
        player.ts
        question.ts
        round.ts
        scoring.ts
        settings.ts
        storage.ts
    rounds/
      knowledge-grid/
        index.ts
        types.ts
        scoring.ts
        reducer.ts
      clue-race/
        index.ts
        types.ts
        scoring.ts
        reducer.ts
      pressure-choice/
        index.ts
        types.ts
        scoring.ts
        reducer.ts
      synapse/
        index.ts
        types.ts
        scoring.ts
        reducer.ts
      connections/
        index.ts
        types.ts
        scoring.ts
        reducer.ts
      wager/
        index.ts
        types.ts
        scoring.ts
        reducer.ts
      final-convergence/
        index.ts
        types.ts
        scoring.ts
        reducer.ts
      registry.ts
    data/
      loadQuestionBank.ts
      questionBank.ts
    ui/
      components/
        Button.tsx
        FocusRing.tsx
        Layout.tsx
        Panel.tsx
      screens/
        HomeScreen.tsx
        RulesScreen.tsx
        PlayerSetupScreen.tsx
        FormatSelectionScreen.tsx
        GameIntroScreen.tsx
        RoundIntroScreen.tsx
        GameScreen.tsx
        QuestionTransitionScreen.tsx
        RoundResultScreen.tsx
        FinaleScreen.tsx
        FinalSummaryScreen.tsx
        SettingsScreen.tsx
        DevQuestionBankScreen.tsx
      theme/
        tokens.ts
        motion.ts
      audio/
        soundManager.ts
    tests/
      fixtures/
        questionBank.valid.json
        questionBank.invalid.json
      unit/
        gameMachine.test.ts
        questionSchemas.test.ts
        questionSelection.test.ts
        random.test.ts
        recentQuestions.test.ts
        scoring.test.ts
        storageSchemas.test.ts
      rounds/
        knowledge-grid.test.ts
        clue-race.test.ts
        pressure-choice.test.ts
        synapse.test.ts
        connections.test.ts
        wager.test.ts
        final-convergence.test.ts
      e2e/
        smoke.spec.ts
        keyboard.spec.ts
        resume-game.spec.ts
```

Notes :

- L'arborescence ci-dessus est la cible du projet apres les premiers lots, pas une obligation de tout creer immediatement.
- Chaque manche a son module dans `src/rounds/*`.
- `src/rounds/registry.ts` expose les manches disponibles sans que l'interface ait a connaitre les details internes de chaque manche.
- `src/core/engine` contient uniquement du TypeScript pur.

## 4. Types TypeScript metier

Les types ci-dessous definissent le contrat central. Ils seront repartis dans `src/core/types`.

```ts
export type PlayerId = "player-1" | "player-2" | "player-3";

export interface Player {
  id: PlayerId;
  name: string;
  color: PlayerColor;
}

export type PlayerColor = "cyan" | "magenta" | "amber";

export type RoundKind =
  | "knowledge-grid"
  | "clue-race"
  | "pressure-choice"
  | "synapse"
  | "connections"
  | "wager"
  | "final-convergence";

export type Difficulty = 1 | 2 | 3 | 4 | 5;

export type QuestionId = string;
export type CategoryId = string;
export type GameSeed = string;

export interface GameFormat {
  id: string;
  label: string;
  roundOrder: RoundKind[];
  questionCountByRound: Partial<Record<RoundKind, number>>;
}

export interface GameSettings {
  soundEnabled: boolean;
  musicEnabled: boolean;
  reducedMotion: boolean;
  timerScale: 0.75 | 1 | 1.25 | 1.5;
  devModeEnabled: boolean;
}

export interface GameSession {
  id: string;
  seed: GameSeed;
  players: [Player, Player, Player];
  format: GameFormat;
  state: GameState;
  score: ScoreState;
  usedQuestionIds: QuestionId[];
  recentlyPlayedQuestionIds: QuestionId[];
  createdAt: string;
  updatedAt: string;
}

export interface ScoreState {
  teamScore: number;
  roundScores: Partial<Record<RoundKind, number>>;
  advantages: FinalAdvantage[];
  jokers: JokerInventory;
}

export type JokerKind =
  | "fifty-fifty"
  | "second-chance"
  | "question-swap"
  | "contextual-clue"
  | "extra-time"
  | "three-player-vote";

export type JokerInventory = Record<JokerKind, number>;

export interface FinalAdvantage {
  id: string;
  label: string;
  sourceRound: RoundKind;
  effect: "extra-step-time" | "answer-elimination" | "score-multiplier" | "retry";
  value: number;
}
```

## 5. Types des questions

Toutes les questions partagent un socle commun, puis chaque manche ajoute son payload specifique.

```ts
export interface BaseQuestion {
  id: QuestionId;
  kind: RoundKind;
  categoryId: CategoryId;
  categoryLabel: string;
  subCategoryId: string;
  subCategoryLabel: string;
  difficulty: Difficulty;
  prompt: string;
  explanation?: string;
  tags: string[];
  editorialStatus: QuestionEditorialStatus;
  version: number;
  source?: string;
  author?: string;
}

export type QuestionEditorialStatus = "draft" | "review" | "approved" | "rejected";

export interface MultipleChoiceOption {
  id: string;
  label: string;
}

export interface KnowledgeGridQuestion extends BaseQuestion {
  kind: "knowledge-grid";
  value: 100 | 200 | 300 | 400 | 500;
  answer: {
    accepted: string[];
    display: string;
  };
}

export interface ClueRaceQuestion extends BaseQuestion {
  kind: "clue-race";
  clues: [string, string, string] | [string, string, string, string];
  answer: {
    accepted: string[];
    display: string;
  };
  pointsByClueIndex: number[];
}

export interface PressureChoiceQuestion extends BaseQuestion {
  kind: "pressure-choice";
  options: [MultipleChoiceOption, MultipleChoiceOption, MultipleChoiceOption, MultipleChoiceOption];
  correctOptionId: string;
  timeLimitSeconds: number;
}

export type SynapseTaskKind = "sequence" | "analogy" | "ranking" | "memory" | "categorization";

export interface SynapseQuestion extends BaseQuestion {
  kind: "synapse";
  taskKind: SynapseTaskKind;
  items: string[];
  expectedOrder?: string[];
  expectedPairs?: Array<{ left: string; right: string }>;
  expectedCategories?: Array<{ label: string; itemIds: string[] }>;
}

export interface ConnectionsQuestion extends BaseQuestion {
  kind: "connections";
  items: [string, string, string, string];
  connection: {
    accepted: string[];
    display: string;
  };
}

export interface WagerQuestion extends BaseQuestion {
  kind: "wager";
  answer: {
    accepted: string[];
    display: string;
  };
  minWager: number;
  maxWager: number;
}

export interface FinalConvergenceQuestion extends BaseQuestion {
  kind: "final-convergence";
  step: 1 | 2 | 3 | 4 | 5;
  answer: {
    accepted: string[];
    display: string;
  };
  basePoints: number;
}

export type Question =
  | KnowledgeGridQuestion
  | ClueRaceQuestion
  | PressureChoiceQuestion
  | SynapseQuestion
  | ConnectionsQuestion
  | WagerQuestion
  | FinalConvergenceQuestion;
```

## 6. Schema Zod des questions

Le schema doit valider :

- la coherence du discriminant `kind` ;
- les valeurs de difficulte ;
- les tailles minimales des tableaux ;
- l'unicite des IDs de questions dans une banque ;
- l'exclusion des questions incompletes avant demarrage d'une partie.

Schema cible :

```ts
import { z } from "zod";

const difficultySchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
]);

const baseQuestionSchema = z.object({
  id: z.string().min(1),
  categoryId: z.string().min(1),
  categoryLabel: z.string().min(1),
  subCategoryId: z.string().min(1),
  subCategoryLabel: z.string().min(1),
  difficulty: difficultySchema,
  prompt: z.string().min(1),
  explanation: z.string().min(1).optional(),
  tags: z.array(z.string().min(1)).default([]),
  editorialStatus: z.union([
    z.literal("draft"),
    z.literal("review"),
    z.literal("approved"),
    z.literal("rejected"),
  ]),
  version: z.number().int().positive(),
  source: z.string().min(1).optional(),
  author: z.string().min(1).optional(),
});

const answerSchema = z.object({
  accepted: z.array(z.string().min(1)).min(1),
  display: z.string().min(1),
});

const optionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
});

export const questionSchema = z.discriminatedUnion("kind", [
  baseQuestionSchema.extend({
    kind: z.literal("knowledge-grid"),
    value: z.union([z.literal(100), z.literal(200), z.literal(300), z.literal(400), z.literal(500)]),
    answer: answerSchema,
  }),
  baseQuestionSchema.extend({
    kind: z.literal("clue-race"),
    clues: z.array(z.string().min(1)).min(3).max(4),
    answer: answerSchema,
    pointsByClueIndex: z.array(z.number().int().positive()).min(3).max(4),
  }),
  baseQuestionSchema.extend({
    kind: z.literal("pressure-choice"),
    options: z.tuple([optionSchema, optionSchema, optionSchema, optionSchema]),
    correctOptionId: z.string().min(1),
    timeLimitSeconds: z.number().int().min(5).max(120),
  }).superRefine((question, ctx) => {
    const optionIds = new Set(question.options.map((option) => option.id));
    if (!optionIds.has(question.correctOptionId)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["correctOptionId"],
        message: "correctOptionId doit correspondre a une option existante.",
      });
    }
  }),
  baseQuestionSchema.extend({
    kind: z.literal("synapse"),
    taskKind: z.union([
      z.literal("sequence"),
      z.literal("analogy"),
      z.literal("ranking"),
      z.literal("memory"),
      z.literal("categorization"),
    ]),
    items: z.array(z.string().min(1)).min(2),
    expectedOrder: z.array(z.string().min(1)).optional(),
    expectedPairs: z.array(z.object({ left: z.string().min(1), right: z.string().min(1) })).optional(),
    expectedCategories: z.array(z.object({
      label: z.string().min(1),
      itemIds: z.array(z.string().min(1)).min(1),
    })).optional(),
  }),
  baseQuestionSchema.extend({
    kind: z.literal("connections"),
    items: z.tuple([z.string().min(1), z.string().min(1), z.string().min(1), z.string().min(1)]),
    connection: answerSchema,
  }),
  baseQuestionSchema.extend({
    kind: z.literal("wager"),
    answer: answerSchema,
    minWager: z.number().int().min(0),
    maxWager: z.number().int().positive(),
  }).refine((question) => question.maxWager >= question.minWager, {
    path: ["maxWager"],
    message: "maxWager doit etre superieur ou egal a minWager.",
  }),
  baseQuestionSchema.extend({
    kind: z.literal("final-convergence"),
    step: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
    answer: answerSchema,
    basePoints: z.number().int().positive(),
  }),
]);

export const questionBankSchema = z.object({
  version: z.literal(1),
  questions: z.array(questionSchema).min(1),
}).superRefine((bank, ctx) => {
  const seen = new Set<string>();
  for (const [index, question] of bank.questions.entries()) {
    if (seen.has(question.id)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["questions", index, "id"],
        message: `ID de question duplique: ${question.id}`,
      });
    }
    seen.add(question.id);
  }
});
```

Decision a valider : pour `synapse`, on peut renforcer les contraintes par `taskKind` avec un schema discriminant interne. C'est recommande des que les formats exacts sont figes.

## 7. Machine d'etat d'une partie

La machine d'etat est geree par le moteur pur, puis exposee a React via Zustand.

```ts
export type GamePhase =
  | "home"
  | "rules"
  | "player-setup"
  | "format-selection"
  | "game-intro"
  | "round-intro"
  | "question-selection"
  | "question-active"
  | "question-reveal"
  | "question-transition"
  | "round-result"
  | "finale-intro"
  | "finale-active"
  | "finale-result"
  | "game-summary"
  | "settings"
  | "dev-question-bank";

export interface GameState {
  phase: GamePhase;
  currentRoundIndex: number;
  currentRoundKind?: RoundKind;
  currentQuestionId?: QuestionId;
  selectedCategoryId?: CategoryId;
  timer?: TimerState;
  pendingAnswer?: PendingAnswer;
}

export interface TimerState {
  startedAt: number;
  durationMs: number;
  pausedRemainingMs?: number;
}

export type GameEvent =
  | { type: "OPEN_RULES" }
  | { type: "OPEN_SETTINGS" }
  | { type: "OPEN_DEV_QUESTION_BANK" }
  | { type: "START_PLAYER_SETUP" }
  | { type: "SET_PLAYERS"; players: [Player, Player, Player] }
  | { type: "SELECT_FORMAT"; format: GameFormat }
  | { type: "START_GAME"; seed: GameSeed }
  | { type: "START_ROUND" }
  | { type: "SELECT_QUESTION"; questionId: QuestionId }
  | { type: "SUBMIT_ANSWER"; answer: SubmittedAnswer }
  | { type: "USE_JOKER"; joker: JokerKind }
  | { type: "REVEAL_ANSWER" }
  | { type: "NEXT_QUESTION" }
  | { type: "END_ROUND" }
  | { type: "START_FINALE" }
  | { type: "END_GAME" }
  | { type: "RESTORE_SESSION"; session: GameSession }
  | { type: "RESET_GAME" };
```

Transitions principales :

```txt
home
  -> rules
  -> player-setup
  -> settings
  -> dev-question-bank

player-setup
  -> format-selection

format-selection
  -> game-intro

game-intro
  -> round-intro

round-intro
  -> question-selection ou question-active selon la manche

question-selection
  -> question-active

question-active
  -> question-reveal
  -> question-transition

question-reveal
  -> question-transition

question-transition
  -> question-selection
  -> round-result

round-result
  -> round-intro
  -> finale-intro

finale-intro
  -> finale-active

finale-active
  -> finale-result
  -> game-summary

settings/dev-question-bank
  -> retour vers la phase precedente si une partie est en cours
```

Regles d'integrite :

- Une session valide contient toujours exactement trois joueurs.
- Une question deja presente dans `usedQuestionIds` ne peut pas etre selectionnee.
- Les questions presentes dans `recentlyPlayedQuestionIds` sont evitees si une alternative existe.
- Les transitions invalides retournent une erreur typable ou ignorent l'evenement selon le contexte UI.
- Le seed controle l'ordre aleatoire des questions, categories et variations de manches.
- `localStorage` persiste uniquement des donnees serialisables et validees au restore.

## 8. Selection aleatoire, seed et anti-repetition

Le moteur utilisera un generateur pseudo-aleatoire deterministe initialise par `GameSeed`.

Responsabilites :

- `random.ts` : PRNG deterministe, shuffle stable, tirage pondere.
- `questionSelection.ts` : selection par manche, categorie, difficulte et exclusions.
- `recentQuestions.ts` : politique d'evitement des questions recentes.

Regles cible :

1. Filtrer les questions par `kind`.
2. Exclure toutes les questions de `usedQuestionIds`.
3. Exclure les questions recentes si le volume restant est suffisant.
4. Si aucune question n'est disponible hors questions recentes, autoriser les recentes mais jamais les questions deja jouees dans la partie.
5. Lever une erreur metier si aucune question eligible n'existe.

## 9. Modules de manches

Chaque module de manche expose le meme contrat minimal via l'interface `GameRound` :

```ts
export interface GameRound<TState, TEvent> {
  kind: RoundKind;
  label: string;
  createInitialState(input: RoundStartInput): TState;
  reducer(state: TState, event: TEvent): TState;
  score(input: RoundScoreInput): RoundScoreResult;
  getQuestionRequirements(format: GameFormat): QuestionRequirement[];
}
```

Responsabilites par manche :

- `knowledge-grid` : grille categories/valeurs, choix libre, valeur fixe par case.
- `clue-race` : revelation progressive d'indices, points decroissants.
- `pressure-choice` : QCM, chrono, difficulte croissante, jokers.
- `synapse` : logique, analogie, classement, memoire, categorisation.
- `connections` : lien commun entre quatre elements.
- `wager` : choix categorie/difficulte/mise avant la question.
- `final-convergence` : cinq etapes et application des avantages acquis.

## 10. Persistance locale

Cles proposees :

```ts
export const STORAGE_KEYS = {
  settings: "trium.settings.v1",
  savedSession: "trium.saved-game.v1",
  recentQuestions: "trium.recent-questions.v1",
} as const;
```

Contraintes :

- Toute lecture `localStorage` passe par un schema Zod.
- Les donnees invalides sont ignorees avec fallback sain.
- La partie sauvegardee est mise a jour apres chaque transition significative.
- La reprise de partie est proposee a l'accueil si une session valide existe.
- Les questions recentes peuvent survivre a plusieurs parties.

## 11. Interface et direction visuelle

Direction cible :

- fond sombre ;
- surfaces translucides mais lisibles ;
- contrastes forts ;
- typographie grande, stable et lisible a distance ;
- boutons larges ;
- focus visible ;
- animations mesurees avec `prefers-reduced-motion` ;
- aucune reference directe a des jeux televises existants.

Principes UI :

- premier viewport adapte a une TV 16:9 ;
- navigation souris prioritaire, clavier utilisable ;
- progression toujours visible : manche, question, score, jokers, etat du chrono ;
- composants reutilisables dans `src/ui/components` ;
- ecrans metier separes dans `src/ui/screens` ;
- Framer Motion limite aux transitions, apparitions et changements d'etat lisibles.

## 12. Decisions ambigues a trancher

1. Le score est-il purement collectif ou faut-il suivre une contribution par joueur ?
2. Quels formats de partie V1 sont requis : court, standard, long ?
3. Combien de questions par manche dans le format standard ?
4. Les joueurs repondent-ils toujours collectivement ou certains jokers imposent-ils un vote joueur par joueur ?
5. La grille des savoirs doit-elle avoir une taille fixe, par exemple 5 categories x 5 valeurs ?
6. Pour `Synapse`, quels sous-formats sont prioritaires en V1 ?
7. Les reponses ouvertes doivent-elles etre auto-validees par normalisation simple ou validees manuellement par les joueurs ?
8. Le chrono doit-il etre bloquant ou seulement indicatif dans certaines manches ?
9. Quels avantages exacts sont gagnables avant la finale ?
10. Le mode developpement de banque de questions doit-il permettre l'edition locale ou seulement la validation/inspection ?
11. Faut-il prevoir des sons des le lot 1 ou seulement l'architecture audio ?
12. Quelle politique de recentQuestions : nombre fixe, duree, ou les deux ?

Hypothese recommandee pour demarrer : score collectif uniquement, reponses ouvertes auto-verifiees par normalisation basique mais corrigibles manuellement, format standard court pour tester le flux complet.

## 13. Plan d'implementation par lots

### Lot 1 - Socle technique et moteur minimal

Objectif : creer le projet Vite/React/TS, configurer les outils, poser les types centraux, les schemas Zod, le PRNG seedable, la selection anti-repetition et les premieres fonctions pures.

Livrables :

- scaffold React + Vite + TypeScript strict ;
- Tailwind configure ;
- Vitest configure ;
- Playwright configure ;
- README initialise ;
- `src/core/types` ;
- `src/core/schemas/questionSchemas.ts` ;
- `src/core/engine/random.ts` ;
- `src/core/engine/questionSelection.ts` ;
- fixtures JSON valides/invalides ;
- page d'accueil minimale confirmant que l'app demarre.

Tests attendus :

- `questionSchemas.test.ts` valide une banque correcte ;
- `questionSchemas.test.ts` rejette une banque avec ID duplique ;
- `questionSchemas.test.ts` rejette un QCM dont `correctOptionId` n'existe pas ;
- `random.test.ts` prouve qu'un meme seed produit le meme ordre ;
- `questionSelection.test.ts` empeche la repetition dans une partie ;
- `questionSelection.test.ts` evite les questions recentes si une alternative existe ;
- `smoke.spec.ts` ouvre l'accueil.

### Lot 2 - Machine d'etat et persistance

Objectif : implementer `gameMachine`, `gameReducer`, les schemas de sauvegarde et le store Zustand.

Tests attendus :

- transitions valides du debut de partie ;
- rejet ou neutralisation des transitions invalides ;
- exactement trois joueurs requis ;
- sauvegarde/restauration d'une session valide ;
- fallback sain sur `localStorage` corrompu ;
- reprise de partie visible depuis l'accueil.

### Lot 3 - Systeme UI et navigation d'ecrans

Objectif : mettre en place l'App shell, les composants de base, les ecrans principaux et la direction visuelle initiale.

Tests attendus :

- navigation accueil -> configuration -> format -> intro ;
- focus visible sur boutons ;
- interactions clavier minimales ;
- capture Playwright TV 16:9 sans debordement evident ;
- verification du mode reduced motion.

### Lot 4 - Grille des savoirs

Objectif : premiere manche jouable avec grille, selection de question, reponse, revelation et score.

Tests attendus :

- construction de grille par categorie et valeur ;
- score pur par valeur ;
- impossibilite de rejouer une case ;
- transition vers resultat de manche ;
- parcours e2e d'une manche complete.

### Lot 5 - Course aux indices et Connexions

Objectif : ajouter deux manches a logique courte, bien testables.

Tests attendus :

- score decroissant selon indice ;
- impossibilite de reveler au-dela du dernier indice ;
- validation du lien commun ;
- non-repetition des questions entre manches.

### Lot 6 - Choix sous pression et jokers

Objectif : QCM chronometre, difficulte croissante et premiers jokers.

Tests attendus :

- QCM valide avec bonne option ;
- 50/50 retire deux mauvaises options ;
- deuxieme chance autorise une seule erreur ;
- temps supplementaire modifie le timer ;
- jokers decrementees correctement ;
- timer testable sans dependance au temps reel.

### Lot 7 - Synapse et Le Pari

Objectif : ajouter les formats de logique et la mecanique de mise.

Tests attendus :

- scoring par sous-type Synapse ;
- validation des classements/categorisations ;
- mise bornee par min/max ;
- perte/gain de points selon resultat du pari ;
- selection categorie/difficulte respecte la banque disponible.

### Lot 8 - Convergence finale et bilan

Objectif : finale en cinq etapes, avantages, bilan detaille.

Tests attendus :

- ordre fixe des cinq etapes ;
- application des avantages ;
- calcul final stable ;
- affichage du bilan avec score par manche ;
- reprise impossible apres fin de partie sauf nouvelle partie.

### Lot 9 - Mode developpement banque de questions

Objectif : inspecter la banque locale, afficher erreurs Zod, couverture par manche/categorie/difficulte.

Tests attendus :

- banque valide affichee ;
- erreurs lisibles sur banque invalide ;
- compte par manche exact ;
- acces mode dev conditionne par parametre.

### Lot 10 - Polish TV, audio et deploiement Cloudflare Pages

Objectif : animations mesurees, sons Howler, verification TV, documentation de deploiement.

Tests attendus :

- build statique ;
- lint ;
- typecheck ;
- tests unitaires ;
- tests Playwright ;
- verification visuelle 16:9 ;
- boutons utilisables souris/clavier ;
- sons desactivables ;
- documentation Cloudflare Pages.

## 14. Commandes de verification par lot

Commandes cible apres scaffold :

```bash
npm run lint
npm run typecheck
npm run test
npm run test:e2e
npm run build
```

Une tache ne doit pas etre declaree terminee si une de ces commandes echoue, sauf si l'echec est explicitement hors perimetre, documente, et accepte pour le lot en cours.

## 15. Definition of Done par lot

Un lot est termine seulement si :

- les modifications sont documentees brievement ;
- le code est implemente dans le perimetre du lot ;
- le README est mis a jour ;
- `lint`, `typecheck`, tests unitaires, tests Playwright et build sont executes ;
- les erreurs trouvees sont corrigees ;
- l'affichage est verifie dans le navigateur ;
- un commit Git clair est cree ;
- les echecs restants, s'il y en a, sont bloques ou explicitement exclus avant validation.

Etat actuel : cette phase ne cree pas encore le scaffold applicatif et ne peut donc pas executer ces commandes.
## 16. Noyau metier central

Le noyau metier ne depend pas de React. Les contrats sont centralises dans `src/core/types` et les validations JSON dans `src/core/schemas`.

Types ajoutes ou stabilises :

- `Player`, `PlayerId` pour les trois joueurs fixes ;
- `GameConfig`, `GameMode`, `GameStatus`, `GameState` pour la configuration et la machine d'etat ;
- `RoundDefinition`, `RoundState`, `GameRound` pour imposer une interface commune aux manches ;
- `Question` et ses variantes `MultipleChoiceQuestion`, `ProgressiveCluesQuestion`, `ConnectionQuestion`, `ChronologyQuestion`, `AnalogyQuestion`, `MemoryQuestion`, `SequenceQuestion` ;
- `Joker`, `JokerType`, `JokerState` ;
- `ScoreBreakdown`, `AnswerResult` ;
- `GameEvent`, `GameAction`.

`GameRound` impose a chaque manche d'initialiser/restaurer son etat, selectionner ses questions, gerer une reponse, calculer son score, determiner sa fin et produire un resume. Les calculs restent purs et testables.

Les schemas Zod correspondants valident les donnees externes avant usage : joueurs, questions, score, jokers, manches, config, etat, actions et evenements.

## 17. Moteur de jeu central

Le moteur central est implemente dans `src/core/engine/gameEngine.ts`. Il est independant de React et expose des fonctions pures qui transforment un `GameState` en nouveau `GameState`.

Fonctions publiques : `createGame`, `startGame`, `startRound`, `loadQuestion`, `submitAnswer`, `revealAnswer`, `completeRound`, `advanceRound`, `completeGame`, `pauseGame`, `resumeGame`, `restoreGame`, `applyJoker`, `rotateCaptain`.

Garanties actuelles :

- exactement trois joueurs dans la configuration ;
- progression explicite entre les etats ;
- rejet des transitions invalides par `GameEngineError` ;
- verrouillage d'une reponse avant revelation ;
- score calcule une seule fois par question ;
- reponse refusee apres expiration du timer ;
- aucune question ne peut etre chargee deux fois dans une meme partie ;
- capitaine derive de la progression des questions et change automatiquement ;
- jokers decrementes et journalises ;
- pause/reprise avec conservation du temps restant ;
- restauration validee par Zod ;
- journal interne `eventLog` pour tracer les actions du moteur.

## 18. Stores Zustand et sauvegarde locale

La couche React consomme le moteur via trois stores explicites :

- `gameStore` porte le `GameState` actif, l'ecran courant, la session de presentation, l'erreur moteur, l'erreur de persistance et les actions qui appellent les fonctions pures du moteur (`startGame`, `startRound`, `loadQuestion`, `submitAnswer`, `revealAnswer`, `applyJoker`, pause/reprise, fin de manche et fin de partie) ;
- `settingsStore` persiste les preferences utilisateur : sons d'interface, musique, animations reduites, mode developpement et echelle de timer ;
- `audioStore` garde l'etat runtime non metier : mute global, volume UI et volume musique.

La persistance est centralisee dans `src/app/store/persistence.ts`. Le format de sauvegarde est enveloppe par `{ version, savedAt, screen, selectedAnswerId, gameState, recentQuestionIds }` et valide avec Zod avant restauration. Une sauvegarde corrompue ou d'une version inconnue renvoie une erreur claire dans le store et n'empeche pas l'application de demarrer. La suppression d'une partie retire uniquement la partie en cours ; l'historique recent des questions peut rester disponible pour les prochaines parties.

## 19. Design system TV-first

Le design system TRIUM est documente dans `DESIGN.md` et implemente dans `src/ui/components` avec des tokens dans `src/ui/theme/tokens.ts` et `src/styles.css`.

Composants disponibles : `Button`, `IconButton`, `Card`, `Panel`, `Modal`, `Badge`, `ProgressBar`, `Timer`, `ScoreBoard`, `PlayerBadge`, `CaptainIndicator`, `AnswerButton`, `JokerButton`, `RoundHeader`, `FeedbackBanner`, `LoadingScreen`, `ErrorBoundary`, `ConfirmationDialog`.

La page interne `DesignSystemScreen` est accessible uniquement en developpement depuis les parametres. Elle sert de banc de verification visuelle pour les tailles TV, les etats interactifs, les feedbacks et les dialogues.

## 20. Ecrans generaux

Les ecrans generaux du jeu sont implementes dans `src/ui/screens` : `HomeScreen`, `RulesScreen`, `PlayerSetupScreen`, `GameModeScreen`, `ResumeGameScreen`, `SettingsScreen`, `GameIntroScreen`, `RoundIntroScreen`, `RoundResultScreen`, `GameResultScreen` et `ErrorScreen`.

Le parcours V1 active uniquement le mode classique. Les modes express et grande aventure sont visibles mais desactives. La configuration joueurs impose trois prenoms, uniques et limites a 14 caracteres. Les parametres couvrent volumes musique/effets, mute global, animations reduites, duree des chronometres, plein ecran, reinitialisation de partie et reinitialisation des questions recentes.

## 21. Chargement de la banque de questions locale

Le pipeline local de questions est implemente dans `src/data/localQuestionBank.ts` et verifie par `scripts/questions.mjs`.

Responsabilites du module applicatif :

- importer tous les fichiers `src/data/questions/*.json` via `import.meta.glob` ;
- valider chaque fichier et chaque question source avec Zod ;
- exclure des questions jouables tout element qui n'est pas `verificationStatus: "verified"` et `status: "approved"` ;
- conserver les questions sources pour l'inspection developpement ;
- normaliser les questions approuvees en `Question` metier ;
- produire un `QuestionLoadReport` avec totals, categories, sous-categories, difficultes, repartition des bonnes reponses, compte verifie, compte rejete, doublons exacts, doublons probables et erreurs de validation.

Responsabilites de selection :

- selection deterministe par graine ;
- exclusion stricte des questions deja utilisees dans la partie ;
- evitement des questions recemment jouees quand une alternative existe ;
- ponderation simple pour reduire la surexposition d'une categorie ou d'une difficulte ;
- erreur metier explicite `QuestionAvailabilityError` si aucune question eligible n'existe.

Le script `pnpm questions` execute la validation hors React et affiche un rapport lisible dans le terminal. `pnpm questions:json` produit le meme rapport en JSON pour de futurs controles CI.

La page `DevQuestionBankScreen` affiche le rapport dans l'application en mode developpement, avec un echantillon des questions chargees et les erreurs eventuelles.

## 22. Manche Grille des savoirs

La manche `knowledge-grid` est le premier module autonome dans `src/rounds/knowledge-grid`. Elle expose des fonctions pures pour construire une grille, selectionner une case, refuser une case deja jouee, calculer le score et determiner la fin de manche.

Regles implementees :

- grille de 5 colonnes et 4 niveaux par defaut ;
- valeurs 100, 200, 300 et 400, avec support de 500 si la difficulte 5 est activee ;
- fin apres 8 questions selectionnees ;
- bonus de rapidite de 20 % si la reponse arrive dans la premiere moitie du temps ;
- bonus de serie de 100 points toutes les trois bonnes reponses consecutives ;
- aucune penalite directe en cas d'erreur ;
- case indisponible apres selection ;
- erreur explicite si aucune question n'existe pour une categorie/difficulte.

Le moteur conserve maintenant `answerResults` dans `RoundState` afin de calculer les series de bonnes reponses de maniere pure et restaurable. L'ecran `GameScreen` branche cette manche sur le moteur : choix de case, affichage QCM, verrouillage, revelation, explication et retour a la grille.
## 23. Systeme complet de jokers

Le systeme de jokers est porte par le moteur pur dans `src/core/engine/gameEngine.ts`, sans dependance React. Les types sont centralises dans `src/core/types/scoring.ts` et valides par `src/core/schemas/scoringSchemas.ts`.

Jokers disponibles :

- `fifty_fifty` : retire deux mauvaises reponses d'un QCM par selection deterministe seedee, sans jamais retirer la bonne reponse ;
- `second_chance` : apres une erreur, remet la question en etat actif et permet une seconde reponse ; une bonne reponse au second essai rapporte 50 % du score calcule ;
- `change_question` : remplace la question active par une question de meme manche, type, categorie et difficulte ; l'ancienne question reste bloquee pour la partie ;
- `contextual_hint` : affiche un indice prepare via `contextualHint`, ou a defaut une partie de l'explication ; aucune generation IA n'est appelee pendant la partie ;
- `extra_time` : ajoute 20 secondes au timer actif et est refuse apres expiration ;
- `team_vote` : ouvre un etat de vote d'equipe. L'interface collecte les trois votes successivement, masque les votes precedents puis revele la majorite avant la reponse finale du capitaine.

Regles globales implementees :

- l'inventaire initial contient exactement trois jokers : `fifty_fifty`, `second_chance` et `extra_time` ;
- les autres jokers commencent a zero et peuvent etre ajoutes par `awardJoker` ;
- chaque joker est consomme une seule fois par partie via `JokerState.used` ;
- les effets de question sont serialisables dans `JokerEffectState` pour la sauvegarde locale ;
- l'utilisation est journalisee dans `eventLog` ;
- les jokers indisponibles sont desactives dans `GameScreen` ;
- certains jokers peuvent etre interdits par manche, par exemple `fifty_fifty` et `team_vote` dans `clue-race`, et `change_question` et `team_vote` dans `final-convergence`.

L'interface `GameScreen` ajoute une confirmation avant consommation, un feedback visible pour l'indice et la seconde chance, l'etat 50/50 directement sur les reponses, le panneau de vote equipe et un retour sonore centralise dans `src/ui/audio/soundManager.ts`.

## 24. Manche Course aux indices

La manche `clue-race` est implementee dans `src/rounds/clue-race`. Elle respecte l'interface `GameRound` et expose des fonctions pures pour selectionner les enigmes, reveler les indices, afficher les propositions, calculer le score et determiner la fin de manche.

Regles implementees :

- cinq enigmes par manche ;
- cinq indices par enigme ;
- score decroissant par indice : 500, 400, 300, 200, 100 ;
- aucune penalite lorsqu'un indice supplementaire est demande ;
- les quatre propositions ne sont affichees que lorsque l'equipe choisit `Repondre maintenant` ;
- une mauvaise reponse termine l'enigme avec 0 point ;
- changement automatique de capitaine a chaque nouvelle enigme ;
- `extra_time` est autorise pendant l'enigme ;
- `fifty_fifty` est autorise uniquement apres affichage des propositions ;
- `second_chance`, `change_question`, `contextual_hint` et `team_vote` sont interdits dans cette manche.

Le format `progressive_clues` exige maintenant cinq indices et cinq valeurs de score dans le schema Zod. Il peut contenir quatre propositions et un `correctOptionId`, necessaires pour l'interface TV et le joker 50/50. L'ecran `GameScreen` affiche un grand panneau central avec compteur d'indices, points encore disponibles, bouton `Indice suivant`, bouton `Repondre maintenant`, verrouillage et revelation.

## 25. Manche Choix sous pression

La manche `pressure-choice` est implementee dans `src/rounds/pressure-choice`. Elle respecte l'interface `GameRound` et expose des fonctions pures pour les multiplicateurs, les durees, le score multiplie, les points a risque et la securisation.

Regles implementees :

- cinq questions de difficulte croissante, de 1 a 5 ;
- selection automatique filtree par difficulte attendue pour les paliers 1, 2, 3, 4 et 5 ;
- multiplicateurs : x1, x1,5, x2, x3, x5 ;
- chronometres : 35 s, 30 s, 25 s, 20 s, 15 s ;
- une bonne reponse ajoute le score multiplie aux points a risque ;
- les points a risque ne sont ajoutes au score global qu'a la securisation ou a la fin reussie de la manche ;
- une erreur ou une expiration fait perdre les points a risque et termine la manche ;
- le bouton `Securiser` termine volontairement la manche en conservant les points a risque ;
- tous les jokers restent autorises, sauf `change_question` sur la derniere question ;
- les actions de securisation et d'expiration sont exposees par le moteur et branchees dans `gameStore`.

L'ecran `GameScreen` affiche l'echelle de progression, les points securises, les points a risque, le multiplicateur, le chronometre et les QCM. L'ecran de transition propose `Continuer` ou `Securiser` apres une bonne reponse.
