Les fichiers audio dedies seront ajoutes dans un lot ulterieur.

En attendant, `src/ui/audio/soundManager.ts` centralise le mute global via Howler et produit de courts retours sonores synthetiques avec Web Audio pour les interactions importantes, dont l'activation d'un joker. Cette solution evite des references a des assets absents tout en gardant un point unique pour remplacer les sons par des fichiers produits plus tard.
