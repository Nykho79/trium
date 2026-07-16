# TRIUM

TRIUM est un jeu de quiz cooperatif en francais pour exactement trois joueurs, pense pour un ordinateur branche en HDMI sur une television.

## Statut actuel

Le projet contient maintenant :

- une base React + TypeScript strict + Vite ;
- Tailwind CSS, Framer Motion, Zustand, Zod, Howler.js, Vitest et Playwright declares ;
- une premiere interface TV-first en francais ;
- un flux local accueil -> joueurs -> format -> intro -> jeu -> resultats ;
- une banque de questions JSON locale d'exemple ;
- des schemas Zod pour valider les questions ;
- un generateur aleatoire seedable et une selection anti-repetition ;
- des tests unitaires et Playwright de base ;
- le remote GitHub `origin` configure sur `https://github.com/Nykho79/trium.git`.

La direction visuelle de reference est conservee dans `docs/concepts/trium-primary-screen.png`.

## Commandes

Apres installation des dependances :

```bash
pnpm install
pnpm dev
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
```

Si `pnpm` n'est pas sur le PATH Windows, utiliser le binaire global existant :

```powershell
C:\Users\nicol\AppData\Roaming\npm\pnpm.cmd install
C:\Users\nicol\AppData\Roaming\npm\pnpm.cmd dev
```


## Noyau mÃƒÂ©tier

Le noyau mÃƒÂ©tier central est dÃƒÂ©fini dans `src/core/types` et validÃƒÂ© par les schÃƒÂ©mas Zod de `src/core/schemas`.

Contrats principaux :

- `Player`, `PlayerId` : joueurs fixes de la partie, exactement trois dans `GameConfig` ;
- `GameConfig`, `GameMode`, `GameStatus`, `GameState` : configuration et ÃƒÂ©tats du moteur ;
- `RoundDefinition`, `RoundState`, `GameRound` : contrat commun de toutes les manches ;
- `Question`, `MultipleChoiceQuestion`, `ProgressiveCluesQuestion`, `ConnectionQuestion`, `ChronologyQuestion`, `AnalogyQuestion`, `MemoryQuestion`, `SequenceQuestion` : formats de questions validables depuis JSON ;
- `Joker`, `JokerType`, `JokerState` : inventaire partagÃƒÂ© des jokers ;
- `ScoreBreakdown`, `AnswerResult` : rÃƒÂ©sultat pur et dÃƒÂ©tail du score ;
- `GameEvent`, `GameAction` : entrÃƒÂ©es et ÃƒÂ©vÃƒÂ©nements du moteur.

La commande `npm run check` exÃƒÂ©cute lint, TypeScript strict et tests unitaires. Sur cette machine, `npm` n'est pas disponible sur le PATH global ; la validation ÃƒÂ©quivalente peut ÃƒÂªtre lancÃƒÂ©e avec `pnpm check` via le runtime Node local.


## Stores et persistance locale

L'etat React est separe en trois stores Zustand :

- `src/app/store/gameStore.ts` relie l'interface au moteur pur, conserve l'ecran courant, la session de presentation, le `GameState` actif, les erreurs moteur et les actions de reprise/suppression ;
- `src/app/store/settingsStore.ts` persiste les reglages audio, musique, mode developpement, echelle de timer et preference d'animations reduites ;
- `src/app/store/audioStore.ts` garde l'etat runtime audio, dont le mute global et les volumes bornes entre 0 et 1.

La sauvegarde locale est versionnee par `STORAGE_SCHEMA_VERSION` et validee avec Zod dans `src/app/store/persistence.ts`. Une sauvegarde corrompue ou d'une version inconnue est ignoree avec un message d'erreur stocke dans le store, sans bloquer l'application. La partie en cours, les joueurs, la manche/question courante, le score, les jokers, l'historique recent des questions et la configuration de partie sont serialises dans `localStorage`.
## Architecture

Les decisions structurantes sont documentees dans `ARCHITECTURE.md`.

Principes actifs :

- le moteur de jeu reste dans `src/core` et ne depend pas de React ;
- les types metier sont centralises dans `src/core/types` ;
- les schemas Zod sont centralises dans `src/core/schemas` ;
- les ecrans React sont dans `src/ui/screens` ;
- l'etat local d'interface est gere par Zustand et persiste dans `localStorage` ;
- les sons sont centralises dans `src/ui/audio/soundManager.ts` et pilotes par `settingsStore`/`audioStore`.


## Validation effectuee

Validation locale executee le 2026-07-16 :

- `pnpm lint` : OK ;
- `pnpm typecheck` : OK ;
- `pnpm test` : OK, 33 tests unitaires ;
- `pnpm build` : OK ;
- `pnpm test:e2e` : OK, 6 tests Playwright sur 1920 x 1080 et 1366 x 768 ;
- verification console navigateur : OK, aucune erreur detectee sur l'accueil aux deux resolutions.

Note Windows : `node` et `npm` ne sont pas sur le PATH global de cette machine. Les validations ont ete lancees avec le runtime Node Codex et `C:\Users\nicol\AppData\Roaming\npm\pnpm.cmd`.

## GitHub

Le depot local est initialise et le remote est configure :

```bash
git remote -v
```

Le push peut necessiter une authentification GitHub locale.



