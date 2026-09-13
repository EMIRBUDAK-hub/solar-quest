// Configuration globale du niveau (dimensions et physique)
const CONFIG = {
    width: 960,
    height: 540,
    mapW: 2560, // Largeur totale du niveau (plus grand que l'écran)
    mapH: 1280, // Hauteur totale du niveau
    gravity: 930 // Force de la gravité
};

export default class niveau3 extends Phaser.Scene {
    constructor() {
        // Identifiant unique de la scène pour y faire référence
        super('niveau3');
    }

    preload() {
        // Chargement du fichier JSON qui contient la disposition des tuiles
        this.load.tilemapTiledJSON('mapBoss', 'src/assets/mapboss.json');
        // Chargement de l'image (tileset) utilisée pour dessiner la map
        this.load.image('tilesBoss', 'src/assets/maplave.png');

        // Chargement des images des personnages et des projectiles
        this.load.image('player', 'src/assets/player.png');
        this.load.image('alien', 'src/assets/alien.png');
        this.load.image('bullet', 'src/assets/bullet.png');
        this.load.image('alienSpit', 'src/assets/alien_spit.png');
    }

    create() {
        // Variable pour bloquer les actions une fois le jeu fini
        this.gameFinished = false;

        // --- MAP & MONDE ---
        // Initialisation de la carte à partir du JSON chargé
        const map = this.make.tilemap({ key: 'mapBoss' });
        // Liaison entre le nom du tileset dans Tiled ('map') et l'image chargée ('tiles')
        const tileset = map.addTilesetImage('map', 'tilesBoss');
        // Création des couches visuelles (fond de lave et plateformes solides)
        this.lavaLayer = map.createLayer('lave', tileset, 0, 0);
        this.platformLayer = map.createLayer('plateformes', tileset, 0, 0);

        // Définition des collisions : tout ce qui n'est pas vide (-1) est solide
        this.platformLayer.setCollisionByExclusion([-1]);
        // Activation des propriétés spécifiques définies dans Tiled pour la lave
        this.lavaLayer.setCollisionByProperty({ solide: true });
        // Définition des limites physiques du monde pour ne pas sortir de la map
        this.physics.world.setBounds(0, 0, CONFIG.mapW, CONFIG.mapH);

        // --- JOUEUR ---
        // Création du sprite joueur avec physique et collision avec les bords du monde
        this.player = this.physics.add.sprite(160, 540, 'player').setCollideWorldBounds(true);
        // Ajout de propriétés personnalisées : points de vie et temps d'invulnérabilité
        Object.assign(this.player, { hp: 100, maxHp: 100, invul: 0 });

        // --- ALIEN (BOSS) ---
        // Création du boss à une position spécifique
        this.alien = this.physics.add.sprite(2100, 620, 'alien').setCollideWorldBounds(true);
        Object.assign(this.alien, {
            hp: 300,
            maxHp: 300,
            invul: 0,
            isRaging: false // Indique si le boss est en "phase 2"
        });

        // Groupes physiques pour gérer plusieurs projectiles en même temps
        this.playerShots = this.physics.add.group();
        this.alienShots = this.physics.add.group();

        // --- CAMÉRA ---
        // Limite la caméra à la taille de la map
        this.cameras.main.setBounds(0, 0, CONFIG.mapW, CONFIG.mapH);
        // La caméra suit le joueur avec un léger lissage (0.1) et un petit zoom
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1).setZoom(1.1);

        // --- COLLISIONS ---
        // Collision entre les personnages et le décor
        this.physics.add.collider([this.player, this.alien], [this.platformLayer, this.lavaLayer]);
        // Destruction automatique des projectiles s'ils touchent un mur
        this.physics.add.collider([this.playerShots, this.alienShots], this.platformLayer, (s) => s.destroy());

        // Gestion des dégâts : si un tir touche l'adversaire, on appelle handleDamage
        this.physics.add.overlap(this.playerShots, this.alien, (alien, shot) => this.handleDamage(alien, shot, 10));
        this.physics.add.overlap(this.alienShots, this.player, (player, shot) => this.handleDamage(player, shot, 10, true));

        // --- INPUTS ---
        // Déclaration des touches utilisables (Z/Q/S/D ou Flèches + F/R/Espace)
        this.keys = this.input.keyboard.addKeys('W,A,S,D,F,R,SPACE,LEFT,RIGHT,UP');
        // Appel de la fonction pour créer l'interface (barres de vie)
        this.buildHud();
    }

    update(time) {
        // Si on appuie sur R, on retourne au menu de sélection
        if (Phaser.Input.Keyboard.JustDown(this.keys.R)) this.scene.start('levelSelect');
        // Si la partie est finie, on arrête de mettre à jour la logique
        if (this.gameFinished) return;

        // Appels constants des fonctions de mouvement, tir et IA du boss
        this.handleMovement();
        this.handleShooting(time);
        this.updateAlien(time);
        this.updateHud(); // Mise à jour visuelle des barres de vie
    }

    handleMovement() {
        // Calcul de la direction : 1 (droite), -1 (gauche) ou 0 (rien)
        const moveX = (this.keys.D.isDown || this.keys.RIGHT.isDown) - (this.keys.A.isDown || this.keys.LEFT.isDown);
        // Applique la vitesse au joueur
        this.player.setVelocityX(moveX * 300);

        // Retourne l'image du joueur vers la gauche ou la droite
        if (moveX !== 0) this.player.setFlipX(moveX < 0);

        // Vérification de l'appui sur une touche de saut
        const jump = Phaser.Input.Keyboard.JustDown(this.keys.W) || Phaser.Input.Keyboard.JustDown(this.keys.UP) || Phaser.Input.Keyboard.JustDown(this.keys.SPACE);
        // Le saut ne fonctionne que si le joueur touche le sol
        if (jump && this.player.body.blocked.down) this.player.setVelocityY(-480);
    }

    handleShooting(time) {
        const pointer = this.input.activePointer; // Récupère les infos de la souris

        // Tir si clic souris ou touche F, avec un délai (lastShot) pour éviter le tir en continu
        if ((Phaser.Input.Keyboard.JustDown(this.keys.F) || pointer.isDown) && time > (this.lastShot || 0)) {
            this.lastShot = time + 250; // Délai de 250ms entre chaque tir

            // Convertit la position de la souris sur l'écran en position dans le niveau
            const mouse = pointer.positionToCamera(this.cameras.main);
            const shot = this.playerShots.create(this.player.x, this.player.y, 'bullet');

            if (shot) {
                shot.body.setAllowGravity(false); // La balle ne tombe pas

                // Calcul de l'angle entre le joueur et le curseur
                const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, mouse.x, mouse.y);

                // Projection de la vitesse selon l'angle calculé
                const speed = 600;
                shot.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
                shot.setRotation(angle); // Oriente la balle visuellement

                // Détruit la balle après 1.5 seconde si elle n'a rien touché
                this.time.delayedCall(1500, () => { if (shot.active) shot.destroy(); });
            }
        }
    }

    updateAlien(time) {
        // Calcul de la distance entre le joueur et le boss
        const dist = Phaser.Math.Distance.BetweenPoints(this.player, this.alien);

        // Activation de la phase de RAGE (PV < 50%)
        if (this.alien.hp < this.alien.maxHp * 0.5 && !this.alien.isRaging) {
            this.alien.isRaging = true;
            this.alien.setTint(0xff3333); // Teinte rouge
            this.cameras.main.shake(500, 0.01); // Tremblement d'écran
        }

        // Si le joueur est à portée (800px), le boss se déplace vers lui
        if (dist < 800 && dist > 80) {
            const dir = Math.sign(this.player.x - this.alien.x);
            const currentSpeed = this.alien.isRaging ? 260 : 180; // Plus rapide en rage
            this.alien.setVelocityX(dir * currentSpeed).setFlipX(dir > 0);

            // Cadence de tir du boss
            const fireRate = this.alien.isRaging ? 700 : 1500;
            if (dist < 500 && time > (this.lastAlienShot || 0)) {
                this.lastAlienShot = time + fireRate;
                this.alienShoot();
            }
        }
    }

    alienShoot() {
        // Création d'un projectile qui fonce vers le joueur
        const spit1 = this.alienShots.create(this.alien.x, this.alien.y, 'alienSpit');
        if (spit1) {
            spit1.body.setAllowGravity(false);
            this.physics.moveToObject(spit1, this.player, 350);
        }

        // En mode rage, le boss tire un deuxième projectile après 150ms
        if (this.alien.isRaging) {
            this.time.delayedCall(150, () => {
                const spit2 = this.alienShots.create(this.alien.x, this.alien.y, 'alienSpit');
                if (spit2) {
                    spit2.body.setAllowGravity(false);
                    // Vise un peu plus haut pour gêner le joueur
                    this.physics.moveTo(spit2, this.player.x, this.player.y - 80, 400);
                }
            });
        }
    }

    handleDamage(target, projectile, amount, isPlayer = false) {
        // Ne fait rien si la cible est encore dans son temps d'invulnérabilité
        if (this.time.now < target.invul) return;
        if (projectile) projectile.destroy(); // Détruit le projectile à l'impact

        target.hp -= amount; // Baisse les PV
        target.invul = this.time.now + 400; // Donne 400ms d'invincibilité
        target.setTint(0xff0000); // Flash rouge pour indiquer le dégât

        // Retire le flash rouge après 100ms
        this.time.delayedCall(100, () => {
            if (target.isRaging) target.setTint(0xff3333);
            else target.clearTint();
        });

        if (isPlayer) this.cameras.main.shake(100, 0.005);
        // Si les PV tombent à 0, on appelle la fin de partie
        if (target.hp <= 0) this.finish(!isPlayer);
    }

    buildHud() {
        // Création d'un groupe fixe à l'écran (setScrollFactor(0)) pour l'interface
        this.hud = this.add.container(20, 20).setScrollFactor(0).setDepth(1000);
        // Barres de vie représentées par des rectangles colorés
        this.pBar = this.add.rectangle(0, 0, 200, 15, 0x00ffcc).setOrigin(0); // Joueur
        this.aBar = this.add.rectangle(0, 25, 200, 15, 0xbd00ff).setOrigin(0); // Alien

        // Texte central masqué au début pour la Victoire/Défaite
        this.statusText = this.add.text(CONFIG.width / 2, CONFIG.height / 2, '', {
            fontSize: '48px',
            fill: '#fff',
            stroke: '#000',
            strokeThickness: 6
        }).setOrigin(0.5);

        this.hud.add([this.pBar, this.aBar, this.statusText]);
    }

    updateHud() {
        // Ajuste la largeur des barres de vie selon le pourcentage de PV restants
        this.pBar.width = Math.max(0, (this.player.hp / this.player.maxHp) * 200);
        this.aBar.width = Math.max(0, (this.alien.hp / this.alien.maxHp) * 200);
    }

    finish(win) {
        this.gameFinished = true;
        this.physics.pause(); // Arrête tous les mouvements physiques

        // Affiche le message de fin
        this.statusText.setText(win ? "VICTOIRE !" : "DÉFAITE...");
        this.statusText.setFill(win ? "#00ffcc" : "#ff0000");

        // Retour au menu de sélection après 2 secondes
        this.time.delayedCall(2000, () => {
            this.scene.start('levelSelect');
        });
    }
}
