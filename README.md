# TRIUM

TRIUM est un jeu de quiz cooperatif en francais pour exactement trois joueurs, pense pour un ordinateur branche en HDMI sur une television.

## Statut actuel

Le projet contient maintenant :

- une base React + TypeScript strict + Vite ;
- Tailwind CSS, Framer Motion, Zustand, Zod, Howler.js, Vitest et Playwright ;
- une interface TV-first en francais ;
- les ecrans generaux : accueil, reprise, regles, joueurs, modes, parametres, intros, resultats et erreur ;
- un design system TRIUM documente dans `DESIGN.md` ;
- un flux local accueil -> joueurs -> mode -> intro -> manche -> jeu -> resultats ;
- la manche jouable `Grille des savoirs` avec grille 5 categories x 4 niveaux, verrouillage, revelation, score et retour grille ;
- un systeme complet de jokers : 50/50, deuxieme chance, changement de question, indice contextuel, temps supplementaire et vote equipe ;
- une banque de questions JSON locale dans `src/data/questions` ;
- un chargeur local qui valide les fichiers JSON avec Zod, filtre les questions jouables et produit un rapport qualite ;
- une selection de questions seedable avec exclusion des questions deja jouees et ponderation categories/difficultes ;
- des schemas Zod pour valider les questions ;
- un generateur aleatoire seedable et une selection anti-repetition ;
- des stores Zustand separes pour la partie, les parametres et l'audio ;
- une persistance locale versionnee et validee ;
- des tests unitaires et Playwright ;
- le remote GitHub `origin` configure sur `https://github.com/Nykho79/trium.git`.

La direction visuelle de reference est conservee dans `docs/concepts/trium-primary-screen.png`.

## Commandes

Apres installation des dependances :

```bash
pnpm install
pnpm dev
pnpm questions
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
```

Le script `pnpm questions` valide les fichiers de `src/data/questions` et affiche le rapport de couverture, de statuts et de doublons. `pnpm questions:json` produit le meme rapport au format JSON.

Si `pnpm` n'est pas sur le PATH Windows, utiliser le binaire global existant :

```powershell
C:\Users\nicol\AppData\Roaming\npm\pnpm.cmd install
C:\Users\nicol\AppData\Roaming\npm\pnpm.cmd dev
C:\Users\nicol\AppData\Roaming\npm\pnpm.cmd questions
```

## Noyau metier

Le noyau metier central est defini dans `src/core/types` et valide par les schemas Zod de `src/core/schemas`.

Contrats principaux :

- `Player`, `PlayerId` : joueurs fixes de la partie, exactement trois dans `GameConfig` ;
- `GameConfig`, `GameMode`, `GameStatus`, `GameState` : configuration et etats du moteur ;
- `RoundDefinition`, `RoundState`, `GameRound` : contrat commun de toutes les manches ;
- `Question`, `MultipleChoiceQuestion`, `ProgressiveCluesQuestion`, `ConnectionQuestion`, `ChronologyQuestion`, `AnalogyQuestion`, `MemoryQuestion`, `SequenceQuestion` : formats de questions validables depuis JSON ;
- `Joker`, `JokerType`, `JokerState`, `JokerEffectState` : inventaire partage des jokers et effets temporaires de question ;
- `ScoreBreakdown`, `AnswerResult` : resultat pur et detail du score ;
- `GameEvent`, `GameAction` : entrees et evenements du moteur.

La commande `npm run check` execute lint, TypeScript strict et tests unitaires. Sur cette machine, `npm` n'est pas disponible sur le PATH global ; la validation equivalente peut etre lancee avec `pnpm check` via le runtime Node local.

## Banque de questions

Les fichiers sources sont places dans `src/data/questions/*.json`. Le module `src/data/localQuestionBank.ts` :

- importe tous les fichiers JSON locaux avec `import.meta.glob` ;
- valide chaque fichier avec Zod ;
- expose les questions sources, les questions jouables normalisees et un rapport ;
- ne rend jouables que les questions `verificationStatus: "verified"` et `status: "approved"` ;
- detecte les doublons exacts et les doublons probables ;
- prepare une selection deterministe par graine, sans repetition dans une partie ;
- evite les questions recemment jouees quand une alternative existe ;
- equilibre categorie et difficulte selon l'historique de la partie.

Etat actuel de la banque locale : 350 questions chargees, 14 categories, aucun doublon exact detecte, aucun doublon probable detecte, mais 0 question jouable car toutes les questions sont encore `to_verify` et `generated`.

La page developpement `DevQuestionBankScreen` permet d'inspecter le rapport, les repartitions et un echantillon des questions chargees depuis l'application.

## Stores et persistance locale

L'etat React est separe en trois stores Zustand :

- `src/app/store/gameStore.ts` relie l'interface au moteur pur, conserve l'ecran courant, la session de presentation, le `GameState` actif, les erreurs moteur et les actions de reprise/suppression ;
- `src/app/store/settingsStore.ts` persiste les reglages audio, musique, mode developpement, echelle de timer et preference d'animations reduites ;
- `src/app/store/audioStore.ts` garde l'etat runtime audio, dont le mute global et les volumes bornes entre 0 et 1.

La sauvegarde locale est versionnee par `STORAGE_SCHEMA_VERSION` et validee avec Zod dans `src/app/store/persistence.ts`. Une sauvegarde corrompue ou d'une version inconnue est ignoree avec un message d'erreur stocke dans le store, sans bloquer l'application.

## Design system

Les composants TV-first reutilisables sont centralises dans `src/ui/components` et documentes dans `DESIGN.md`. La page interne de demonstration est accessible en developpement depuis `Parametres -> Design system`.

## Architecture

Les decisions structurantes sont documentees dans `ARCHITECTURE.md`.

Principes actifs :

- le moteur de jeu reste dans `src/core` et ne depend pas de React ;
- les types metier sont centralises dans `src/core/types` ;
- les schemas Zod sont centralises dans `src/core/schemas` ;
- les donnees de questions sources sont centralisees dans `src/data/questions` ;
- les ecrans React sont dans `src/ui/screens` ;
- l'etat local est reparti entre `gameStore`, `settingsStore` et `audioStore` ;
- les sons sont centralises dans `src/ui/audio/soundManager.ts` et pilotes par `settingsStore`/`audioStore` ;
- les composants TV-first reutilisables sont centralises dans `src/ui/components`.

## Validation effectuee

Validation locale executee le 2026-07-16 :

- `pnpm questions` : OK, 350 questions analysees ;
- `pnpm check` : OK, lint + TypeScript + 56 tests unitaires ;
- `pnpm build` : OK, avec avertissement Vite de chunk superieur a 500 kB ;
- `pnpm test:e2e` : OK, 20 tests Playwright sur 1920 x 1080 et 1366 x 768.

Note Windows : `node` et `npm` ne sont pas sur le PATH global de cette machine. Les validations ont ete lancees avec le runtime Node Codex et `C:\Users\nicol\AppData\Roaming\npm\pnpm.cmd`.

## GitHub

Le depot local est initialise et le remote est configure :

```bash
git remote -v
```

Le push peut necessiter une authentification GitHub locale.
