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


## Noyau métier

Le noyau métier central est défini dans `src/core/types` et validé par les schémas Zod de `src/core/schemas`.

Contrats principaux :

- `Player`, `PlayerId` : joueurs fixes de la partie, exactement trois dans `GameConfig` ;
- `GameConfig`, `GameMode`, `GameStatus`, `GameState` : configuration et états du moteur ;
- `RoundDefinition`, `RoundState`, `GameRound` : contrat commun de toutes les manches ;
- `Question`, `MultipleChoiceQuestion`, `ProgressiveCluesQuestion`, `ConnectionQuestion`, `ChronologyQuestion`, `AnalogyQuestion`, `MemoryQuestion`, `SequenceQuestion` : formats de questions validables depuis JSON ;
- `Joker`, `JokerType`, `JokerState` : inventaire partagé des jokers ;
- `ScoreBreakdown`, `AnswerResult` : résultat pur et détail du score ;
- `GameEvent`, `GameAction` : entrées et événements du moteur.

La commande `npm run check` exécute lint, TypeScript strict et tests unitaires. Sur cette machine, `npm` n'est pas disponible sur le PATH global ; la validation équivalente peut être lancée avec `pnpm check` via le runtime Node local.

## Architecture

Les decisions structurantes sont documentees dans `ARCHITECTURE.md`.

Principes actifs :

- le moteur de jeu reste dans `src/core` et ne depend pas de React ;
- les types metier sont centralises dans `src/core/types` ;
- les schemas Zod sont centralises dans `src/core/schemas` ;
- les ecrans React sont dans `src/ui/screens` ;
- l'etat local d'interface est gere par Zustand et persiste dans `localStorage` ;
- les sons sont centralises dans `src/ui/audio/soundManager.ts`.


## Validation effectuee

Validation locale executee le 2026-07-16 :

- `pnpm lint` : OK ;
- `pnpm typecheck` : OK ;
- `pnpm test` : OK, 7 tests unitaires ;
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


