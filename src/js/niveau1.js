// --- CONSTANTES DE JEU ---
// Position de réapparition par défaut si aucun spawn n'est trouvé
const DEFAULT_SPAWN = { x: 120, y: 120 };

// Identifiants (GIDs) des tuiles provenant de Tiled pour identifier les zones spéciales
const WATER_GIDS = new Set([109, 110, 111, 112, 113]);
const LAVA_GIDS = new Set([1030, 1032]);
const SPIKE_GIDS = new Set([691, 692, 703, 704]);
// Regroupement des GIDs pour simplifier les tests de collision mortelle
const HAZARD_GIDS = new Set([...WATER_GIDS, ...LAVA_GIDS, ...SPIKE_GIDS]);
const NON_SOLID_GIDS = new Set([...WATER_GIDS, ...LAVA_GIDS]);
const STARTING_LIVES = 5;

export default class niveau1 extends Phaser.Scene {
  constructor() {
    // Clé unique pour identifier cette scène dans Phaser
    super({ key: 'niveau1' });
  }

  /**
   * Chargement de toutes les ressources (images, sons, données JSON)
   */
  preload() {
    // Fond et Carte
    this.load.image('bg_meteor', 'src/assets/meteor_parallax_bg.png');
    this.load.tilemapTiledJSON('map', 'src/assets/tilemap/carte1ermap.tmj');

    // Chargement des différents Tilesets (images utilisées par la carte)
    this.load.image('ts_tuile', 'src/assets/tilemap/Tiles1.png');
    this.load.image('ts_caillou', 'src/assets/tilemap/Props-Rocks.png');
    this.load.image('ts_interieur', 'src/assets/tilemap/Interior-01.png');
    this.load.image('ts_arbre', 'src/assets/tilemap/Tree-Assets.png');
    this.load.image('ts_buildings', 'src/assets/tilemap/Buildings.png');
    this.load.image('ts_jeu', 'src/assets/tilemap/Hive.png');
    this.load.image('ts_textureprojet', 'src/assets/tilemap/textureprojet.png');

    // Personnage et objets
    this.load.spritesheet('astronaut', 'src/assets/astronaut_sheet.png', { frameWidth: 32, frameHeight: 40 });
    this.load.image('checkpoint_flag', 'src/assets/checkpoint_flag.png');
    
    // Audio
    this.load.audio('meteor_sound', 'src/assets/meteor.mp3');
    this.load.audio('checkpoint_sound', 'src/assets/checkpoint.mp3');
  }

  /**
   * Initialisation des éléments de jeu une fois les ressources chargées
   */
  create() {
    // Variables d'état
    this.hasWon = false;
    this.finishTriggered = false;
    this.lives = STARTING_LIVES;
    this.isRespawning = false;

    // Initialisation des systèmes de jeu
    this._buildMeteorTexture(); // Génération dynamique de l'image du météore
    this.createAnimations();    // Création des cycles d'animation (marche, etc.)
    this.createMapLevel();      // Mise en place du décor et de la physique
    this.setupMeteors();        // Système d'apparition des météores
    this.createHUD();           // Affichage (Vies, instructions)
    this.createControls();      // Configuration des touches du clavier

    // Configuration de la caméra pour suivre le joueur
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    this.cameras.main.setDeadzone(220, 120); // Zone centrale où la caméra ne bouge pas
  }

  /**
   * Génère manuellement une spritesheet pour les météores à l'aide de primitives graphiques
   */
  _buildMeteorTexture() {
    const S = 42; // Taille du carré de la frame
    const F = 8;  // Nombre de frames (étapes de rotation)

    if (this.textures.exists('meteor_sheet')) return;

    const g = this.make.graphics({ x: 0, y: 0, add: false });

    for (let f = 0; f < F; f++) {
      const ox = f * S;
      const a = (f / F) * Math.PI * 2; // Angle pour la rotation visuelle
      const ca = Math.cos(a), sa = Math.sin(a);

      // Dessin des couches du météore (ombre, corps, cratères, reflets)
      g.fillStyle(0x110500, 0.8);
      g.fillEllipse(ox + S / 2 + 2.5, S / 2 + 2.5, S * 0.78, S * 0.60);
      g.fillStyle(0x8a6a40, 1);
      g.fillEllipse(ox + S / 2, S / 2, S * 0.80, S * 0.62);
      g.fillStyle(0x6b4e2c, 1);
      g.fillEllipse(ox + S / 2 + ca * 4, S / 2 + sa * 3, S * 0.50, S * 0.38);
      g.fillStyle(0x3a220e, 1);
      g.fillEllipse(ox + S / 2 + ca * 5, S / 2 + sa * 5, S * 0.28, S * 0.20);
      g.fillStyle(0xd4a060, 1);
      g.fillEllipse(ox + S / 2 - ca * 7, S / 2 - sa * 7, S * 0.22, S * 0.16);
      g.fillStyle(0x281408, 1);
      g.fillCircle(ox + S / 2 + ca * 9, S / 2 + sa * 6, 4.5);
      g.fillCircle(ox + S / 2 - ca * 5, S / 2 - sa * 9 + 2, 3);
      g.fillStyle(0x1a0a04, 1);
      g.fillCircle(ox + S / 2 - ca * 8, S / 2 + sa * 4, 2.2);
      g.fillStyle(0xfff8e0, 1);
      g.fillCircle(ox + S / 2 - ca * 8, S / 2 - sa * 8, 2.2);
      g.fillStyle(0xffffff, 0.7);
      g.fillCircle(ox + S / 2 - ca * 6, S / 2 - sa * 6 - 1, 1.2);
    }

    g.generateTexture('meteor_sheet', S * F, S);
    g.destroy();

    // Découpage de la texture générée en frames utilisables
    const tex = this.textures.get('meteor_sheet');
    for (let i = 0; i < F; i++) tex.add(i, 0, i * S, 0, S, S);
  }

  /**
   * Définit les animations du joueur et des météores
   */
  createAnimations() {
    if (!this.anims.exists('player-idle')) {
      this.anims.create({
        key: 'player-idle',
        frames: [{ key: 'astronaut', frame: 0 }],
        frameRate: 1,
        repeat: -1
      });
    }

    if (!this.anims.exists('player-run')) {
      this.anims.create({
        key: 'player-run',
        frames: this.anims.generateFrameNumbers('astronaut', { start: 0, end: 3 }),
        frameRate: 10,
        repeat: -1
      });
    }

    if (!this.anims.exists('meteor-spin')) {
      this.anims.create({
        key: 'meteor-spin',
        frames: Array.from({ length: 8 }, (_, i) => ({ key: 'meteor_sheet', frame: i })),
        frameRate: 14,
        repeat: -1
      });
    }
  }

  /**
   * Construction du monde (tuiles, physique, parallax et joueur)
   */
  createMapLevel() {
    this.map = this.make.tilemap({ key: 'map' });

    // Liaison des images aux noms des tilesets définis dans Tiled
    const tilesets = [
      this.map.addTilesetImage('tuile', 'ts_tuile'),
      this.map.addTilesetImage('caillou', 'ts_caillou'),
      this.map.addTilesetImage('interieur', 'ts_interieur'),
      this.map.addTilesetImage('arbre', 'ts_arbre'),
      this.map.addTilesetImage('buildings', 'ts_buildings'),
      this.map.addTilesetImage('jeu', 'ts_jeu'),
      this.map.addTilesetImage('textureprojet', 'ts_textureprojet')
    ].filter(Boolean);

    const worldWidth = this.map.widthInPixels;
    const worldHeight = this.map.heightInPixels;

    // Limites du monde physique et de la caméra
    this.physics.world.setBounds(0, 0, worldWidth, worldHeight);
    this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);

    // Image de fond avec effet Parallax (bouge moins vite que le joueur)
    const bgScale = Math.max(this.scale.width / this.textures.get('bg_meteor').getSourceImage().width, this.scale.height / this.textures.get('bg_meteor').getSourceImage().height) * 1.22;
    this.parallaxBg = this.add.image(this.scale.width / 2, this.scale.height / 2, 'bg_meteor')
      .setScrollFactor(0)
      .setDepth(-50)
      .setScale(bgScale);

    this.bgBaseX = this.scale.width / 2;
    this.bgBaseY = this.scale.height / 2;
    this.bgMaxOffsetX = Math.max(0, (this.parallaxBg.displayWidth - this.scale.width) / 2);
    this.bgMaxOffsetY = Math.max(0, (this.parallaxBg.displayHeight - this.scale.height) / 2);

    // Création automatique de tous les calques présents dans le fichier JSON
    this.renderedLayers = [];
    this.map.layers.forEach((layerData, index) => {
      const layer = this.map.createLayer(layerData.name, tilesets, 0, 0);
      if (layer) {
        layer.setDepth(index);
        this.renderedLayers.push(layer);
      }
    });

    this.groundLayer = this.renderedLayers[0] || null;

    // Configuration des points de départ et checkpoints
    this.spawnPoint = this.findSpawnPoint() || DEFAULT_SPAWN;
    this.currentRespawnPoint = { ...this.spawnPoint };
    this.checkpointPoints = this.findCheckpointPoints();

    // Initialisation du joueur
    this.player = this.physics.add.sprite(this.spawnPoint.x, this.spawnPoint.y, 'astronaut', 0);
    this.player.setCollideWorldBounds(true);
    this.player.setBounce(0);
    this.player.setDragX(900); // Friction pour s'arrêter plus vite
    this.player.setMaxVelocity(320, 900);
    this.player.body.setSize(24, 38).setOffset(4, 2); // Ajustement de la hitbox
    this.player.play('player-idle');
    this.player.jumpsLeft = 2; // Pour le double saut

    // Gestion des collisions par calque
    this.renderedLayers.forEach((layer) => {
      layer.setCollisionByExclusion([-1]); // Tout entre en collision par défaut
      layer.forEachTile((tile) => {
        // Mais on affine selon la nature de la tuile (solide ou non)
        tile.setCollision(this.shouldTileCollide(tile));
      });
      this.physics.add.collider(this.player, layer, this.onPlayerHitTile, null, this);
    });

    this.createCheckpoints();
  }

  /**
   * Vérifie si une tuile doit bloquer le joueur
   */
  shouldTileCollide(tile) {
    if (!tile || tile.index === -1) return false;
    return !NON_SOLID_GIDS.has(tile.index);
  }

  isSolidTile(tile) {
    return this.shouldTileCollide(tile);
  }

  /**
   * Analyse les calques de haut en bas pour trouver une tuile à un point précis
   */
  getTopmostTileAt(x, y) {
    for (let i = this.renderedLayers.length - 1; i >= 0; i -= 1) {
      const tile = this.renderedLayers[i].getTileAt(x, y);
      if (tile) return tile;
    }
    return null;
  }

  hasSolidAt(x, y) {
    return this.renderedLayers.some((layer) => this.isSolidTile(layer.getTileAt(x, y)));
  }

  /**
   * Algorithme pour trouver un sol vide au début de la carte pour faire apparaître le joueur
   */
  findSpawnPoint() {
    for (let x = 0; x < this.map.width; x += 1) {
      for (let y = this.map.height - 2; y >= 1; y -= 1) {
        const currentSolid = this.hasSolidAt(x, y);
        const aboveSolid = this.hasSolidAt(x, y - 1);
        const belowSolid = this.hasSolidAt(x, y + 1);

        // Si l'espace est vide et qu'il y a un sol dessous
        if (!currentSolid && !aboveSolid && belowSolid) {
          return {
            x: x * this.map.tileWidth + this.map.tileWidth / 2,
            y: y * this.map.tileHeight + this.map.tileHeight / 2
          };
        }
      }
    }
    return null;
  }

  /**
   * Cherche un point sûr pour placer un checkpoint à un certain pourcentage de la carte
   */
  findCheckpointForRatio(ratio) {
    const targetX = Math.floor(this.map.width * ratio);
    const searchRadius = Math.floor(this.map.width * 0.18);

    for (let offset = 0; offset <= searchRadius; offset += 1) {
      const candidates = offset === 0 ? [targetX] : [targetX + offset, targetX - offset];
      for (const x of candidates) {
        if (x < 0 || x >= this.map.width) continue;
        for (let y = this.map.height - 2; y >= 1; y -= 1) {
          const currentSolid = this.hasSolidAt(x, y);
          const aboveSolid = this.hasSolidAt(x, y - 1);
          const belowSolid = this.hasSolidAt(x, y + 1);

          if (!currentSolid && !aboveSolid && belowSolid) {
            return {
              x: x * this.map.tileWidth + this.map.tileWidth / 2,
              y: y * this.map.tileHeight + this.map.tileHeight / 2
            };
          }
        }
      }
    }
    return null;
  }

  tilePointToWorldPoint(tileX, tileY) {
    return {
      x: tileX * this.map.tileWidth + this.map.tileWidth / 2,
      y: tileY * this.map.tileHeight + this.map.tileHeight / 2
    };
  }

  /**
   * Définit les emplacements stratégiques des checkpoints
   */
  findCheckpointPoints() {
    const preferredTilePoints = [
      { x: 46, y: 26 },   // Début
      { x: 198, y: 33 },  // Milieu
      { x: 388, y: 28 }   // Fin
    ];

    const found = [];

    preferredTilePoints.forEach((tilePoint, index) => {
      const isStandable = !this.hasSolidAt(tilePoint.x, tilePoint.y)
        && !this.hasSolidAt(tilePoint.x, tilePoint.y - 1)
        && this.hasSolidAt(tilePoint.x, tilePoint.y + 1);

      const fallbackRatio = index === 0 ? 0.18 : index === 1 ? 0.5 : 0.84;
      const point = isStandable
        ? this.tilePointToWorldPoint(tilePoint.x, tilePoint.y)
        : this.findCheckpointForRatio(fallbackRatio);

      if (!point) return;
      const tooClose = found.some((p) => Math.abs(p.x - point.x) < this.map.tileWidth * 6);
      if (!tooClose) found.push(point);
    });

    return found;
  }

  /**
   * Déclenche la mort si le joueur touche un danger (piques, lave, etc.)
   */
  onPlayerHitTile(_player, tile) {
    if (!tile || this.isRespawning) return true;

    if (HAZARD_GIDS.has(tile.index)) {
      this.loseLifeAndRespawn();
      return false;
    }

    return true;
  }

  /**
   * Création visuelle et physique des drapeaux de checkpoint
   */
  createCheckpoints() {
    this.checkpoints = [];
    if (!this.checkpointPoints || !this.checkpointPoints.length) return;

    this.checkpointPoints.forEach((point, index) => {
      const baseY = point.y + 10;
      const container = this.add.container(point.x, point.y - 28).setDepth(15);

      const glow = this.add.circle(0, 14, 14, 0xffe066, 0.18);
      const flag = this.add.image(0, 6, 'checkpoint_flag').setOrigin(0.18, 1).setScale(0.9);
      container.add([glow, flag]);

      // Zone invisible pour détecter le passage du joueur
      const zone = this.add.zone(point.x, baseY - 24, 44, 78);
      this.physics.world.enable(zone);
      zone.body.setAllowGravity(false);
      zone.body.moves = false;

      const checkpointData = {
        id: index,
        point,
        activated: false,
        container,
        glow,
        flag,
        zone
      };

      this.physics.add.overlap(this.player, zone, () => this.activateCheckpoint(index), null, this);
      this.checkpoints.push(checkpointData);
    });
  }

  /**
   * Active un checkpoint et met à jour le point de respawn
   */
  activateCheckpoint(index) {
    const checkpoint = this.checkpoints?.[index];
    if (!checkpoint || checkpoint.activated) return;

    checkpoint.activated = true;
    this.currentRespawnPoint = { ...checkpoint.point };

    // Changement visuel (devient vert)
    checkpoint.flag.setTint(0x7cffb2);
    checkpoint.glow.setFillStyle(0x4dff88, 0.35);

    // Feedback texte
    if (this.checkpointText) this.checkpointText.destroy();
    this.checkpointText = this.add.text(this.scale.width / 2, 96, 'Checkpoint activé', {
      fontFamily: 'Arial',
      fontSize: '28px',
      color: '#7CFFB2',
      stroke: '#06101d',
      strokeThickness: 6
    }).setOrigin(0.5).setScrollFactor(0).setDepth(25);

    this.time.delayedCall(1200, () => {
      if (this.checkpointText) {
        this.checkpointText.destroy();
        this.checkpointText = null;
      }
    });
    this.sound.play('checkpoint_sound', { volume: 0.8 });
  }

  /**
   * Mise en place du système de particules et du groupe de météores
   */
  setupMeteors() {
    this.meteors = this.physics.add.group();
    this._meteorGlows = new Map();

    // Collisions météores avec le sol et le joueur
    this.renderedLayers.forEach((layer) => {
      this.physics.add.collider(this.meteors, layer, this._onMeteorImpact, null, this);
    });
    this.physics.add.overlap(this.player, this.meteors, this._onMeteorHitPlayer, null, this);

    // Création de la texture de poussière pour l'explosion
    if (!this.textures.exists('dust_dot')) {
      const gd = this.make.graphics({ x: 0, y: 0, add: false });
      gd.fillStyle(0xc49a5a, 1);
      gd.fillCircle(5, 5, 5);
      gd.generateTexture('dust_dot', 10, 10);
      gd.destroy();
    }

    // Émetteur de particules pour les impacts
    this.dustEmitter = this.add.particles(0, 0, 'dust_dot', {
      speed: { min: 60, max: 180 },
      angle: { min: 190, max: 350 },
      scale: { start: 1.1, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: { min: 350, max: 700 },
      gravityY: 500,
      quantity: 0,
      emitting: false
    }).setDepth(12);

    this._scheduleMeteor();
  }

  /**
   * Planifie l'apparition du prochain météore (boucle récursive)
   */
  _scheduleMeteor() {
    this.time.delayedCall(Phaser.Math.Between(1400, 2800), () => {
      if (!this.hasWon) this._spawnMeteor();
      this._scheduleMeteor();
    });
  }

  /**
   * Crée un météore à une position aléatoire au-dessus de la caméra
   */
  _spawnMeteor() {
    const worldW = this.map.widthInPixels;
    const camX = this.cameras.main.scrollX;
    const camW = this.cameras.main.width;
    const rawX = camX + Phaser.Math.Between(60, camW - 60);
    const sx = Phaser.Math.Clamp(rawX, 30, worldW - 30);

    const m = this.meteors.create(sx, -30, 'meteor_sheet', 0);
    m.setDisplaySize(42, 42);
    m.body.setSize(34, 34).setOffset(4, 4);
    m.body.setAllowGravity(false);
    m.setDepth(6);

    // Vitesse et rotation selon la trajectoire
    const vx = Phaser.Math.Between(-90, 90);
    const vy = Phaser.Math.Between(280, 460);
    m.setVelocity(vx, vy);
    m.rotation = Math.atan2(vy, vx) - Math.PI / 2;
    m.play('meteor-spin');

    // Halo lumineux attaché au météore
    const glow = this.add.ellipse(sx, -30, 62, 42, 0xff5500, 0.28).setDepth(5);
    this._meteorGlows.set(m, glow);
  }

  /**
   * Gère l'impact d'un météore au sol
   */
  _onMeteorImpact(meteor) {
    if (!meteor.active) return;
    this._doImpact(meteor.x, meteor.y);
    const g = this._meteorGlows.get(meteor);
    if (g) {
      g.destroy();
      this._meteorGlows.delete(meteor);
    }
    meteor.destroy();
  }

  /**
   * Gère l'impact d'un météore sur le joueur
   */
  _onMeteorHitPlayer(player, meteor) {
    if (!meteor.active) return;
    this._doImpact(meteor.x, meteor.y);
    const g = this._meteorGlows.get(meteor);
    if (g) {
      g.destroy();
      this._meteorGlows.delete(meteor);
    }
    meteor.destroy();
    this.loseLifeAndRespawn();
  }

  /**
   * Effets visuels et sonores de l'explosion du météore
   */
  _doImpact(ix, iy) {
    this.cameras.main.shake(380, 0.022); // Tremblement de terre

    this.dustEmitter.setPosition(ix, iy);
    this.dustEmitter.explode(18);

    // Flash central
    const flash = this.add.circle(ix, iy, 34, 0xffaa33, 0.92).setDepth(14);
    this.tweens.add({
      targets: flash,
      scaleX: 3.2,
      scaleY: 3.2,
      alpha: 0,
      duration: 300,
      ease: 'Power2',
      onComplete: () => flash.destroy()
    });

    // Anneau d'onde de choc
    const ring = this.add.circle(ix, iy, 14, 0xffffff, 0).setDepth(13);
    ring.setStrokeStyle(4, 0xffcc55, 1.0);
    this.tweens.add({
      targets: ring,
      scaleX: 6,
      scaleY: 3.5,
      alpha: 0,
      duration: 460,
      ease: 'Sine.easeOut',
      onComplete: () => ring.destroy()
    });

    // Éclats (débris) projetés
    for (let i = 0; i < 8; i++) {
      const shard = this.add.circle(
        ix + Phaser.Math.Between(-10, 10),
        iy + Phaser.Math.Between(-6, 6),
        Phaser.Math.Between(3, 8),
        Phaser.Utils.Array.GetRandom([0xd4a060, 0x8a6a40, 0xff8833, 0x6b4e2c]),
        1
      ).setDepth(13);
      const ang = Phaser.Math.Between(170, 370) * (Math.PI / 180);
      const spd = Phaser.Math.Between(100, 250);
      this.tweens.add({
        targets: shard,
        x: shard.x + Math.cos(ang) * spd * 0.75,
        y: shard.y + Math.sin(ang) * spd * 0.75,
        alpha: 0,
        scaleX: 0.05,
        scaleY: 0.05,
        duration: Phaser.Math.Between(300, 620),
        ease: 'Power1',
        onComplete: () => shard.destroy()
      });
    }
    this.sound.play('meteor_sound', { volume: 0.6 });
  }

  /**
   * Interface Utilisateur (Vies et Commandes)
   */
  createHUD() {
    this.infoText = this.add.text(
      20,
      18,
      'Flèches = déplacement • Espace / ↑ = saut • Eau / piques = mort • R = recommencer',
      {
        fontFamily: 'Arial',
        fontSize: '22px',
        color: '#ffffff',
        stroke: '#06101d',
        strokeThickness: 6
      }
    ).setScrollFactor(0).setDepth(20);

    this.livesText = this.add.text(20, 52, '', {
      fontFamily: 'Arial',
      fontSize: '24px',
      color: '#ffd54a',
      stroke: '#06101d',
      strokeThickness: 6
    }).setScrollFactor(0).setDepth(20);

    this.updateLivesText();
  }

  updateLivesText() {
    if (this.livesText) {
      this.livesText.setText(`Vies : ${this.lives}`);
    }
  }

  /**
   * Vérifie si la hitbox du joueur touche une tuile appartenant à un groupe (danger)
   */
  isPlayerTouchingHazard(gidSet) {
    if (!this.player || !this.player.body) return false;

    const body = this.player.body;
    const left = body.x + 2;
    const top = body.y + 2;
    const width = Math.max(1, body.width - 4);
    const height = Math.max(1, body.height - 4);

    return this.renderedLayers.some((layer) => {
      const tiles = layer.getTilesWithinWorldXY(left, top, width, height, { isNotEmpty: true });
      return tiles.some((tile) => tile && gidSet.has(tile.index));
    });
  }

  isPlayerTouchingWater() {
    return this.isPlayerTouchingHazard(WATER_GIDS);
  }

  isPlayerTouchingSpikes() {
    return this.isPlayerTouchingHazard(SPIKE_GIDS);
  }

  /**
   * Logique de perte de vie
   */
  loseLifeAndRespawn() {
    if (this.isRespawning) return;

    this.isRespawning = true;
    this.lives -= 1;
    this.updateLivesText();

    if (this.lives <= 0) {
      this.showDefeat();
      return;
    }

    this.player.disableBody(true, true); // Cache le joueur

    this.time.delayedCall(250, () => {
      this.respawnPlayer();
      this.isRespawning = false;
    });
  }

  createControls() {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keyR = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);
    this.keySpace = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
  }

  respawnPlayer() {
    const respawn = this.currentRespawnPoint || this.spawnPoint;
    this.player.enableBody(true, respawn.x, respawn.y, true, true);
    this.player.setVelocity(0, 0);
    this.player.setAcceleration(0, 0);
    this.player.jumpsLeft = 2;
  }

  /**
   * Boucle principale de mise à jour (tourne 60 fois par seconde)
   */
  update() {
    // Touche de retour menu
    if (Phaser.Input.Keyboard.JustDown(this.keyR)) {
      this.scene.start('levelSelect');
      return;
    }

    if (this.isRespawning || !this.player.active) {
      return;
    }

    // --- MOUVEMENT DU JOUEUR ---
    const moveLeft = this.cursors.left.isDown;
    const moveRight = this.cursors.right.isDown;
    const jumpPressed = Phaser.Input.Keyboard.JustDown(this.cursors.up) || Phaser.Input.Keyboard.JustDown(this.keySpace);

    if (moveLeft) {
      this.player.setAccelerationX(-900);
      this.player.setFlipX(true);
    } else if (moveRight) {
      this.player.setAccelerationX(900);
      this.player.setFlipX(false);
    } else {
      this.player.setAccelerationX(0); // S'arrête progressivement grâce au DragX
    }

    // Gestion du saut et double saut
    if ((this.player.body.blocked.down || this.player.body.touching.down) && jumpPressed) {
      this.player.setVelocityY(-250);
      this.player.jumpsLeft = 1;
    } else if (jumpPressed && this.player.jumpsLeft > 0) {
      this.player.setVelocityY(-250);
      this.player.jumpsLeft -= 1;
    }

    if (this.player.body.blocked.down) {
      this.player.jumpsLeft = 2; // Réinitialise les sauts au sol
    }

    // Animation selon la vitesse
    this.player.play(Math.abs(this.player.body.velocity.x) > 8 ? 'player-run' : 'player-idle', true);

    // --- EFFET PARALLAX DU FOND ---
    if (this.parallaxBg) {
      const rawOffsetX = this.cameras.main.scrollX * 0.10;
      const rawOffsetY = this.cameras.main.scrollY * 0.04;
      const offsetX = Phaser.Math.Clamp(rawOffsetX, -this.bgMaxOffsetX, this.bgMaxOffsetX);
      const offsetY = Phaser.Math.Clamp(rawOffsetY, -this.bgMaxOffsetY, this.bgMaxOffsetY);
      this.parallaxBg.x = this.bgBaseX - offsetX;
      this.parallaxBg.y = this.bgBaseY - offsetY;
    }

    // --- MISE À JOUR DES MÉTÉORES ---
    if (this.meteors) {
      this.meteors.children.iterate((m) => {
        if (!m || !m.active) return;
        const glow = this._meteorGlows.get(m);
        if (glow) glow.setPosition(m.x, m.y);
        // Détruit le météore s'il sort des limites du monde
        if (m.y > this.physics.world.bounds.height + 120 || m.x < -100 || m.x > this.physics.world.bounds.width + 100) {
          if (glow) {
            glow.destroy();
            this._meteorGlows.delete(m);
          }
          m.destroy();
        }
      });
    }

    // Vérification constante des dangers et chutes dans le vide
    if (this.isPlayerTouchingWater() || this.isPlayerTouchingSpikes()) {
      this.loseLifeAndRespawn();
      return;
    }

    if (this.player.y > this.physics.world.bounds.height + 120) {
      this.loseLifeAndRespawn();
    }

    // Vérification de la condition de victoire (atteinte de la fin de la carte)
    if (!this.finishTriggered && this.player.x >= this.map.widthInPixels - 140) {
      this.completeLevel();
    }
  }

  /**
   * Gère la réussite du niveau
   */
  completeLevel() {
    if (this.finishTriggered) return;
    this.finishTriggered = true;
    this.hasWon = true;
    
    // Débloque le niveau 2 dans le stockage de session
    window.sessionStorage.setItem('solarQuestUnlockedLevel', String(Math.max(2, Number(window.sessionStorage.getItem('solarQuestUnlockedLevel') || '1'))));
    
    this.player.setVelocity(0, 0);
    this.player.setAcceleration(0, 0);
    this.player.body.enable = false;

    const message = this.add.text(this.scale.width / 2, this.scale.height / 2, 'Niveau 1 validé !\nNiveau 2 débloqué', {
      fontFamily: 'Arial',
      fontSize: '34px',
      align: 'center',
      color: '#9cffb5',
      backgroundColor: '#102030',
      padding: { left: 18, right: 18, top: 12, bottom: 12 },
      stroke: '#000000',
      strokeThickness: 6
    }).setOrigin(0.5).setScrollFactor(0).setDepth(40);

    this.time.delayedCall(1700, () => {
      message.destroy();
      this.scene.start('levelSelect');
    });
  }

  /**
   * Affiche l'écran de défaite
   */
  showDefeat() {
    if (this.finishTriggered) return;
    this.finishTriggered = true;

    this.physics.pause();
    this.player.setVelocity(0, 0);

    const txt = this.add.text(
      this.scale.width / 2,
      this.scale.height / 2,
      "DÉFAITE...",
      {
        fontSize: '48px',
        color: '#ff0000',
        stroke: '#000',
        strokeThickness: 6
      }
    ).setOrigin(0.5).setScrollFactor(0).setDepth(50);

    this.time.delayedCall(2000, () => {
      this.scene.start('levelSelect');
    });
  }
}