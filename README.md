# TRIUM

TRIUM est un jeu de quiz en francais jouable en solo ou en trio cooperatif, pense pour un ordinateur branche en HDMI sur une television.

## Statut actuel

Le projet contient maintenant :

- une base React + TypeScript strict + Vite ;
- Tailwind CSS, Framer Motion, Zustand, Zod, Howler.js, Vitest et Playwright ;
- une interface TV-first en francais ;
- les ecrans generaux : accueil, reprise, regles, joueurs, modes, parametres, intros, resultats et erreur ;
- un design system TRIUM documente dans `DESIGN.md` ;
- un flux local accueil -> joueurs -> mode -> intro -> manche -> jeu -> resultats ;
- la manche jouable `Grille des savoirs` avec grille 5 categories x 4 niveaux, verrouillage, revelation, score et retour grille ;
- la manche jouable `Course aux indices` avec cinq indices progressifs, propositions sur demande et score decroissant ;
- la manche jouable `Choix sous pression` avec cinq paliers, chrono decroissant, multiplicateurs et points a securiser ;
- la manche jouable `Synapse` avec six mini-epreuves ludiques, generateurs deterministes, memoire masquee, scoring progressif et jokers limites ;
- la manche jouable `Connexions` avec quatre elements progressifs, propositions sur demande, score decroissant, details de revelation et jokers limites ;
- la manche jouable `Le Pari` avec choix categorie/difficulte/mise, confirmation obligatoire, gain ou perte de mise et jokers limites ;
- la finale jouable `Convergence finale` avec cinq etapes, achats d'avantages, seuil de victoire et bilan victoire/echec ;
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

- `Player`, `PlayerId`, `PlayerMode`, `PlayerRoster` : configuration solo ou trio dans `GameConfig` ;
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
- normalise les questions structurellement valides vers les types metier jouables ;
- detecte les doublons exacts et les doublons probables ;
- prepare une selection deterministe par graine, sans repetition dans une partie ;
- evite les questions recemment jouees quand une alternative existe ;
- equilibre categorie et difficulte selon l'historique de la partie.

Etat actuel de la banque locale : `pnpm questions` charge 28 fichiers de donnees, ignore la copie de developpement `conceptual-intruders - Copie.json`, valide 1000 entrees structurellement jouables et rapporte les doublons exacts/probables pour inspection. Cette validation est applicative et ne remplace pas une revue factuelle editoriale source par source.

La page developpement `DevQuestionBankScreen` permet d'inspecter le rapport, les repartitions et un echantillon des questions chargees depuis l'application.

## Stores et persistance locale

L'etat React est separe en trois stores Zustand :

- `src/app/store/gameStore.ts` relie l'interface au moteur pur, conserve l'ecran courant, la session de presentation, le `GameState` actif, les erreurs moteur et les actions de reprise/suppression ;
- `src/app/store/settingsStore.ts` persiste les reglages audio, musique, mode developpement, echelle de timer et preference d'animations reduites ;
- `src/app/store/audioStore.ts` garde l'etat runtime audio, dont le mute global et les volumes bornes entre 0 et 1.

La sauvegarde locale est versionnee par `STORAGE_SCHEMA_VERSION` et validee avec Zod dans `src/app/store/persistence.ts`. Une sauvegarde corrompue ou d'une version inconnue est ignoree avec un message d'erreur stocke dans le store, sans bloquer l'application.


## Usage TV / HDMI

L'application expose des controles globaux adaptes a un ordinateur branche en HDMI :

- bouton `Plein ecran` puis `Sortir` disponible en permanence ;
- raccourci clavier `F` pour basculer le plein ecran ;
- raccourci `Echap` pour ouvrir ou fermer le menu des parametres ;
- avertissement si la fenetre descend sous 1280 x 720 ;
- zoom interne reglable dans `Parametres -> Zoom interface` jusqu'a 125 % ;
- tentative de maintien de l'ecran actif via Screen Wake Lock quand le navigateur le permet ;
- curseur masque apres inactivite et restaure au mouvement ;
- tests Playwright executes sur 1920 x 1080, 1366 x 768 et 1280 x 720.
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

- `pnpm check` : OK, lint + TypeScript + 127 tests unitaires ;
- `pnpm playwright test src/tests/e2e/tv-runtime.spec.ts` : OK, 12 tests Playwright sur 1920 x 1080, 1366 x 768 et 1280 x 720, avec zoom interface 125 % et zoom navigateur simule 125 % ;
- `pnpm test:e2e` : derniere validation complete connue OK, 32 tests Playwright sur 1920 x 1080 et 1366 x 768 ;
- `pnpm build` : OK, build production Vite vers `dist`, avec avertissement Vite de chunk superieur a 500 kB ;
- `pnpm preview --port 4178` : OK, verification locale de `/`, `/manifest.webmanifest`, `/sw.js` et fallback SPA ;
- controle navigateur Playwright sur la preview production : OK, titre `TRIUM`, accueil visible, manifest detecte, service worker actif, aucune erreur console ;
- `pnpm questions:json` : execute, mais les fichiers JSON non verifies presents localement produisent un rapport de rejet et un code de sortie non nul.

Note Windows : `node` et `npm` ne sont pas sur le PATH global de cette machine. Les validations ont ete lancees avec le runtime Node Codex et `C:\Users\nicol\AppData\Roaming\npm\pnpm.cmd`.

## Deploiement Cloudflare Pages

TRIUM est deployable comme site statique Cloudflare Pages, sans backend et sans cle API.

### Creation du depot

1. Creer le depot GitHub `Nykho79/trium`.
2. Depuis le dossier local du projet, verifier le remote :

```bash
git remote -v
```

3. Publier les commits locaux :

```bash
git push origin master
```

### Connexion a Cloudflare Pages

1. Ouvrir le tableau de bord Cloudflare.
2. Aller dans `Workers & Pages` puis `Create application`.
3. Choisir `Pages` puis `Connect to Git`.
4. Autoriser Cloudflare a lire le depot GitHub `Nykho79/trium`.
5. Selectionner la branche de production, actuellement `master`.

### Configuration Pages

Utiliser la configuration suivante :

- framework preset : `Vite` ;
- build command : `npm run build` ;
- build output directory : `dist` ;
- root directory : laisser vide ;
- Node.js version : `20.19.0` minimum, ou une version 22 LTS.

Aucune variable d'environnement n'est requise pour la V1. Ne pas ajouter de cle API, token ou secret dans Cloudflare Pages : l'application fonctionne avec une banque JSON locale et `localStorage`.

### Routage SPA et assets

Le fichier `public/_redirects` contient :

```text
/* /index.html 200
```

Il permet a Cloudflare Pages de renvoyer `index.html` pour les routes SPA. Le build Vite utilise `base: "./"` afin de produire des chemins d'assets relatifs et compatibles avec les previews Cloudflare.

Le manifest est publie depuis `public/manifest.webmanifest`. Le service worker `public/sw.js` est enregistre uniquement en production et reste limite au cache statique same-origin. Le fichier `public/_headers` force notamment `sw.js` a rester revalidable.

### Deploiement

Le premier deploiement se lance automatiquement apres connexion du depot. Pour verifier localement avant de pousser :

```bash
npm run build
npm run preview
```

Sur cette machine Windows, `npm` peut etre absent du PATH ; utiliser alors `pnpm build` puis `pnpm preview`, ce qui execute les memes scripts du projet.

### Mise a jour par git push

Chaque commit pousse sur la branche de production declenche un nouveau build Cloudflare Pages :

```bash
git add .
git commit -m "feat: description courte"
git push origin master
```

Verifier ensuite le statut du deploiement dans Cloudflare Pages. Les previews de branche permettent de tester une version avant fusion ou promotion.

### Restauration d'une version

Dans Cloudflare Pages, ouvrir le projet, aller dans `Deployments`, choisir une version anterieure valide, puis utiliser `Rollback to this deployment` ou promouvoir ce deploiement en production. Si la correction doit etre historisee dans Git, creer aussi un commit de revert :

```bash
git revert <sha-du-commit>
git push origin master
```

### Erreurs frequentes

- `npm: command not found` localement : utiliser `pnpm build` sur cette machine, ou installer Node/npm localement.
- `Node version is not supported` : configurer Cloudflare Pages avec Node `20.19.0` minimum ou une version 22 LTS.
- Page blanche apres deploiement : verifier que le dossier de sortie est bien `dist` et que `public/_redirects` est present dans le build.
- Erreur 404 sur rafraichissement d'une URL : verifier le contenu de `_redirects` dans `dist`.
- Ancienne version servie : vider le cache navigateur ou attendre la mise a jour du service worker ; `sw.js` est configure en `no-cache` pour limiter ce risque.
- Variable manquante : aucune variable n'est necessaire en V1 ; si une fonctionnalite future en exige une, elle doit commencer par `VITE_` et ne jamais contenir de secret.
- Build trop ancien : verifier que le dernier commit a bien ete pousse et que Cloudflare a construit la bonne branche.
## GitHub

Le depot local est initialise et le remote est configure :

```bash
git remote -v
```

Le push peut necessiter une authentification GitHub locale.
