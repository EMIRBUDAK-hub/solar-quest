export default class menu extends Phaser.Scene {
  constructor() {
    // Identifiant unique de la scène pour y faire référence ailleurs (ex: scene.start("menu"))
    super({ key: "menu" });
  }

  /**
   * Chargement des images nécessaires au menu
   */
  preload() {
    this.load.image("menu_fond", "src/assets/espace.png");
    this.load.image("imageBoutonPlay", "src/assets/star.png");
  }

  /**
   * Création des éléments visuels et de l'interactivité
   */
  create() {
    // --- FOND D'ÉCRAN ---
    this.add
      .image(0, 0, "menu_fond")
      .setOrigin(0)            // On place l'origine en haut à gauche (0,0)
      .setDisplaySize(800, 600) // On force l'image à prendre toute la taille de la fenêtre de jeu
      .setDepth(0);             // Arrière-plan (couche la plus basse)

    // --- TITRE DU JEU ---
    this.add.text(400, 120, "SPACE GAME", {
      font: "60px Arial",
      fill: "#ffffff",          // Couleur du texte
      stroke: "#000000",       // Contour noir
      strokeThickness: 6       // Épaisseur du contour pour la lisibilité
    }).setOrigin(0.5);          // Centré sur le point (400, 120)

    // --- CONFIGURATION DES BOUTONS ---
    // On crée un tableau d'objets pour éviter de répéter le code de création
    const buttons = [
      {
        text: "Jouer",
        x: 400,
        y: 300,
        action: () => this.scene.start("levelSelect") // Change de scène vers la sélection de niveau
      },
      {
        text: "Quitter",
        x: 400,
        y: 370,
        action: () => { window.close(); } // Ferme l'onglet du navigateur (si autorisé)
      }
    ];

    // --- GÉNÉRATION AUTOMATIQUE DES BOUTONS ---
    buttons.forEach((btn) => {
      // 1. Création de l'image de fond du bouton (ici une étoile)
      const image = this.add.image(btn.x, btn.y, "imageBoutonPlay")
        .setDepth(1)
        .setScale(2); // Agrandissement initial

      // 2. Création du texte au-dessus du bouton
      const label = this.add.text(btn.x, btn.y, btn.text, {
        font: "30px Arial",
        fill: "#ffffff",
        stroke: "#000000",
        strokeThickness: 4,
      }).setOrigin(0.5).setDepth(2);

      // --- INTERACTIVITÉ ---

      // On rend l'image et le texte interactifs (cliquables)
      image.setInteractive({ useHandCursor: true });
      label.setInteractive({ useHandCursor: true });

      // Effet de "Hover" (survol) : le bouton grossit quand la souris passe dessus
      const onOver = () => {
        image.setScale(3); // On augmente l'échelle
      };

      // Effet quand la souris sort du bouton : il reprend sa taille normale
      const onOut = () => {
        image.setScale(2); // On revient à l'échelle initiale
      };

      // Assignation des événements à l'image
      image.on("pointerover", onOver);
      image.on("pointerout", onOut);
      image.on("pointerup", btn.action); // Déclenche l'action au relâchement du clic

      // Assignation des mêmes événements au texte (pour que tout le bouton réagisse)
      label.on("pointerover", onOver);
      label.on("pointerout", onOut);
      label.on("pointerup", btn.action);
    });
  }
}