export default class LevelSelect extends Phaser.Scene {
  constructor() {
    super({ key: 'levelSelect' });
  }

  preload() {
    this.load.image('menu_fond', 'src/assets/espace.png');
    this.load.image('imageBoutonPlay', 'src/assets/star.png');
  }

  create() {
    const { width, height } = this.scale;
    this.add.image(0, 0, 'menu_fond').setOrigin(0).setDisplaySize(width, height);

    this.add.text(width / 2, 90, 'CHOIX DU NIVEAU', {
      font: '54px Arial',
      fill: '#ffffff',
      stroke: '#000000',
      strokeThickness: 6
    }).setOrigin(0.5);

    this.add.text(width / 2, 145, 'Les niveaux se débloquent au fur et à mesure', {
      font: '24px Arial',
      fill: '#d7e8ff',
      stroke: '#000000',
      strokeThickness: 4
    }).setOrigin(0.5);

    const unlockedLevel = this.getUnlockedLevel();

    const levels = [
      { id: 1, scene: 'niveau1', x: width / 2 - 210, y: 320 },
      { id: 2, scene: 'niveau2', x: width / 2, y: 320 },
      { id: 3, scene: 'niveau3', x: width / 2 + 210, y: 320 }
    ];

    levels.forEach((level) => this.createLevelCard(level, unlockedLevel >= level.id));

    const back = this.add.text(width / 2, height - 70, 'RETOUR', {
      font: '28px Arial',
      fill: '#ffffff',
      backgroundColor: '#203040',
      padding: { left: 18, right: 18, top: 10, bottom: 10 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    back.on('pointerup', () => this.scene.start('menu'));
    back.on('pointerover', () => back.setScale(1.08));
    back.on('pointerout', () => back.setScale(1));
  }

  createLevelCard(level, unlocked) {
    const button = this.add.image(level.x, level.y, 'imageBoutonPlay').setScale(2.8);
    const badge = this.add.circle(level.x, level.y - 80, 42, unlocked ? 0x3bb273 : 0x555555, 0.95);
    const levelNumber = this.add.text(level.x, level.y - 82, `${level.id}`, {
      font: '38px Arial',
      fill: '#ffffff',
      stroke: '#000000',
      strokeThickness: 5
    }).setOrigin(0.5);

    const title = this.add.text(level.x, level.y + 8, `Niveau ${level.id}`, {
      font: '28px Arial',
      fill: '#ffffff',
      stroke: '#000000',
      strokeThickness: 4
    }).setOrigin(0.5);

    const statusText = unlocked ? 'Débloqué' : '🔒 Verrouillé';
    const statusColor = unlocked ? '#9cffb5' : '#ff8f8f';
    const status = this.add.text(level.x, level.y + 58, statusText, {
      font: '22px Arial',
      fill: statusColor,
      stroke: '#000000',
      strokeThickness: 4
    }).setOrigin(0.5);

    if (unlocked) {
      button.setInteractive({ useHandCursor: true });
      title.setInteractive({ useHandCursor: true });

      const goToLevel = () => this.scene.start(level.scene);
      button.on('pointerup', goToLevel);
      title.on('pointerup', goToLevel);
      button.on('pointerover', () => button.setScale(3.15));
      button.on('pointerout', () => button.setScale(2.8));
      title.on('pointerover', () => button.setScale(3.15));
      title.on('pointerout', () => button.setScale(2.8));
    } else {
      button.setTint(0x777777);
      badge.setFillStyle(0x666666, 0.95);
      status.setText('🔒 Verrouillé');
    }
  }

  getUnlockedLevel() {
    const stored = Number(window.sessionStorage.getItem('solarQuestUnlockedLevel') || '1');
    if (!Number.isFinite(stored) || stored < 1) return 1;
    return Math.min(3, stored);
  }
}
