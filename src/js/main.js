// Importation de la scène du premier niveau depuis son fichier externe
import { niveau1 } from './js/niveau1.js';

/**
 * Objet de configuration globale du moteur Phaser
 */
const config = {
  // type: Phaser.AUTO choisit automatiquement entre WebGL (performant) 
  // ou Canvas (compatible) selon le navigateur de l'utilisateur.
  type: Phaser.AUTO,

  // ID de l'élément HTML <div> dans lequel le jeu sera injecté
  parent: 'game-container',

  // Dimensions de la zone de jeu en pixels
  width: 1280,
  height: 720,

  // Couleur de fond (noir ici) avant que les images ne soient chargées
  backgroundColor: '#000000',

  // pixelArt: true empêche le flou lors du redimensionnement (indispensable pour le style rétro)
  pixelArt: true,

  // Configuration du moteur physique
  physics: {
    default: 'arcade', // 'arcade' est le moteur le plus simple et rapide pour les jeux 2D
    arcade: {
      // Gravité globale appliquée à tous les objets physiques (axe Y = vertical)
      gravity: { y: 1600 },

      // debug: true permettrait de voir les boîtes de collision (hitboxes) en violet/vert
      debug: false
    }
  },

  // Gestion du redimensionnement de la fenêtre
  scale: {
    // FIT : Le jeu s'adapte à la taille de l'écran tout en gardant ses proportions
    mode: Phaser.Scale.FIT,

    // Centre automatiquement le canevas de jeu horizontalement et verticalement
    autoCenter: Phaser.Scale.CENTER_BOTH
  },

  /**
   * Liste des scènes du jeu. 
   * La première de la liste (ici niveau1) est lancée automatiquement au démarrage.
   * Pour ajouter le menu et le niveau 2, il faudra les rajouter ici.
   */
  scene: [niveau1]
};

// Initialisation officielle du jeu avec la configuration ci-dessus
new Phaser.Game(config);