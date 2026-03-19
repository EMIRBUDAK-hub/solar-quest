
export default class menu extends Phaser.Scene {
  constructor() {
    super({ key: "menu" });
  }

  preload() {
    this.load.image("menu_fond", "src/assets/espace.png");
    this.load.image("imageBoutonPlay", "src/assets/star.png");
  }

  create() {
    // fond
    this.add
      .image(0, 0, "menu_fond")
      .setOrigin(0)
      .setDisplaySize(800, 600)
      .setDepth(0);
    // titre 
    this.add.text(400, 120, "SPACE GAME", {
      font: "60px Arial",
      fill: "#ffffff",
      stroke: "#000000",
      strokeThickness: 6
    }).setOrigin(0.5);
    // boutons
    const buttons = [
      { text: "Jouer", x: 400, y: 300, action: () => this.scene.start("levelSelect") },
            { text: "Quitter", x: 400, y: 370, action: () => { window.close(); } }
    ];

    buttons.forEach((btn) => {
      const image = this.add.image(btn.x, btn.y, "imageBoutonPlay").setDepth(1).setScale(2);
      const label = this.add.text(btn.x, btn.y, btn.text, {
        font: "30px Arial",
        fill: "#ffffff",// couleur blanche
        stroke: "#000000",// contour noir
        strokeThickness: 4,// definition de l'epaisseur du contour
      }).setOrigin(0.5).setDepth(2);

      image.setInteractive({ useHandCursor: true });

      image.on("pointerover", () => { // pointerover = quand la souris passe sur le bouton
        image.setScale(3);
      });
      image.on("pointerout", () => { // pointerout = quand la souris quitte le bouton
        image.setScale(2);
      });
      image.on("pointerup", btn.action);

      label.setInteractive({ useHandCursor: true });
      label.on("pointerover", () => {
        image.setScale(3);
      });
      label.on("pointerout", () => {
        image.setScale(2);
      });
      label.on("pointerup", btn.action);
    });
  }
}