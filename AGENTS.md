# AGENTS.md — Projet TRIUM

## Mission

Construire et maintenir TRIUM, un jeu de quiz coopératif en français pour trois joueurs utilisant un écran commun.

## Priorités

1. Fiabilité du moteur de jeu.
2. Lisibilité sur une télévision.
3. Fluidité de l’expérience.
4. Qualité et traçabilité des questions.
5. Simplicité de maintenance.
6. Performance.
7. Qualité visuelle.

## Règles de développement

* TypeScript strict.
* Aucun `any` non justifié.
* Fonctions courtes et nommées explicitement.
* Composants React centrés sur une responsabilité.
* Logique métier indépendante de React.
* Toute règle de score doit posséder un test.
* Toute modification du format des questions doit mettre à jour le schéma Zod.
* Toute nouvelle manche doit respecter l’interface `GameRound`.
* Toute donnée externe doit être considérée comme non fiable jusqu’à validation.
* Ne jamais exposer de clé API dans le front-end.
* Ne jamais placer de secret dans le dépôt.
* Ne pas introduire de backend sans nécessité démontrée.
* Ne pas ajouter de dépendance lorsqu’une implémentation simple suffit.

## Validation obligatoire

Avant de considérer une tâche terminée :

1. exécuter le lint ;
2. exécuter la vérification TypeScript ;
3. exécuter les tests unitaires ;
4. exécuter les tests Playwright concernés ;
5. vérifier les erreurs dans la console du navigateur ;
6. vérifier l’affichage en 1920 × 1080 ;
7. vérifier l’affichage en 1366 × 768 ;
8. mettre à jour la documentation.

## Questions

Une question doit contenir :

* un identifiant unique ;
* un type ;
* une catégorie ;
* une sous-catégorie ;
* une difficulté ;
* un énoncé ;
* les données nécessaires à son type ;
* la réponse correcte ;
* une explication ;
* des tags ;
* un statut éditorial ;
* une version.

Une question générée automatiquement ne peut pas être considérée comme approuvée.

## Design

* Aucun texte indispensable en dessous de 18 px sur télévision.
* Les réponses doivent être lisibles à plusieurs mètres.
* Les animations ne doivent pas bloquer les interactions.
* Respecter `prefers-reduced-motion`.
* Éviter les effets de verre excessifs.
* Éviter les contrastes faibles.
* Ne pas copier les interfaces de jeux télévisés existants.

## Git

Utiliser des commits atomiques :

* `feat:`
* `fix:`
* `refactor:`
* `test:`
* `docs:`
* `chore:`

Ne pas mélanger une refactorisation générale et une nouvelle fonctionnalité dans le même commit.
