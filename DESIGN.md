# Design system TRIUM

## Direction

TRIUM utilise une interface sombre, lisible a distance et adaptee a une television 16:9. La palette combine bleu nuit, violet profond, cyan d'action et ambre de recompense. Les surfaces restent translucides mais contrastées, avec des contours lumineux discrets.

Le design system evite les references directes aux jeux televises existants : pas de plateau copie, pas de formulation empruntee, pas de surcharge lumineuse permanente.

## Tokens

Les tokens principaux sont declares dans `src/ui/theme/tokens.ts` et exposes en CSS custom properties dans `src/styles.css`.

- Fond : `#03070d`, `#07111c`, `#130b2a`.
- Action : cyan `#27d9f2`.
- Recompense : ambre `#ffb020`.
- Danger : `#ff5f6d`.
- Succes : `#72f2a2`.
- Rayon : `8px` pour panneaux et controles.
- Texte courant TV : `24px`.
- Reponses : `24px` minimum.
- Actions : `24px` minimum.

## Composants

Les composants sont dans `src/ui/components` :

- `Button`, `IconButton` ;
- `Card`, `Panel`, `Modal`, `ConfirmationDialog` ;
- `Badge`, `ProgressBar`, `Timer` ;
- `ScoreBoard`, `PlayerBadge`, `CaptainIndicator` ;
- `AnswerButton`, `JokerButton`, `RoundHeader` ;
- `FeedbackBanner`, `LoadingScreen`, `ErrorBoundary`.

Les composants de jeu restent presentationnels. Les regles metier restent dans `src/core` et les stores React ne font que relier l'interface au moteur.

## Accessibilite TV

- Focus visible par outline 4px.
- Boutons principaux >= 72px de hauteur.
- Reponses >= 104px de hauteur et texte >= 24px.
- Aucune information essentielle collee au bord : les ecrans passent par `ScreenFrame`.
- Les animations passent par Framer Motion et sont neutralisees par `prefers-reduced-motion` et `MotionConfig`.

## Page de demonstration

En developpement, la page interne `design-system` est accessible depuis `Parametres -> Design system`. Elle n'est pas rendue en production : si cet ecran est restaure hors dev, l'application affiche les parametres a la place.