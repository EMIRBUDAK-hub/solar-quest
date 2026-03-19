const CONFIG = {
    width: 960,
    height: 540,
    mapW: 2560,
    mapH: 1280,
    gravity: 930
};

export default class niveau3 extends Phaser.Scene {
    constructor() {
        super('niveau3');
    }

    preload() {
        // MAP + TILESET
        this.load.tilemapTiledJSON('map', 'src/assets/niveau3/mapboss.json');
        this.load.image('tiles', 'src/assets/niveau3/maplave.png');

        // SPRITES
        this.load.image('player', 'src/assets/niveau3/player.png');
        this.load.image('alien', 'src/assets/niveau3/alien.png');
        this.load.image('bullet', 'src/assets/niveau3/bullet.png');
        this.load.image('alienSpit', 'src/assets/niveau3/alien_spit.png');
    }
    create() {
        this.gameFinished = false;

        // --- MAP & MONDE ---
        const map = this.make.tilemap({ key: 'map' });
        const tileset = map.addTilesetImage('map', 'tiles');
        this.lavaLayer = map.createLayer('lave', tileset, 0, 0);
        this.platformLayer = map.createLayer('plateformes', tileset, 0, 0);

        this.platformLayer.setCollisionByExclusion([-1]);
        this.lavaLayer.setCollisionByProperty({ solide: true });
        this.physics.world.setBounds(0, 0, CONFIG.mapW, CONFIG.mapH);

        // --- JOUEUR ---
        this.player = this.physics.add.sprite(160, 540, 'player').setCollideWorldBounds(true);
        Object.assign(this.player, { hp: 100, maxHp: 100, invul: 0 });

        // --- ALIEN (BOSS CORIACE) ---
        this.alien = this.physics.add.sprite(2100, 620, 'alien').setCollideWorldBounds(true);
        Object.assign(this.alien, {
            hp: 300,            // Points de vie doublés
            maxHp: 300,
            invul: 0,
            isRaging: false     // Détecteur de Phase 2
        });

        this.playerShots = this.physics.add.group();
        this.alienShots = this.physics.add.group();

        // --- CAMÉRA ---
        this.cameras.main.setBounds(0, 0, CONFIG.mapW, CONFIG.mapH);
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1).setZoom(1.1);

        // --- COLLISIONS ---
        this.physics.add.collider([this.player, this.alien], [this.platformLayer, this.lavaLayer]);
        this.physics.add.collider([this.playerShots, this.alienShots], this.platformLayer, (s) => s.destroy());

        // Dégâts infligés à l'Alien (réduits pour faire durer le combat)
        this.physics.add.overlap(this.playerShots, this.alien, (alien, shot) => this.handleDamage(alien, shot, 10));
        this.physics.add.overlap(this.alienShots, this.player, (player, shot) => this.handleDamage(player, shot, 10, true));

        // --- INPUTS ---
        this.keys = this.input.keyboard.addKeys('W,A,S,D,F,R,SPACE,LEFT,RIGHT,UP');
        this.buildHud();
    }

    update(time) {
        if (Phaser.Input.Keyboard.JustDown(this.keys.R)) this.scene.restart();
        if (this.gameFinished) return;

        this.handleMovement();
        this.handleShooting(time);
        this.updateAlien(time);
        this.updateHud();
    }

    handleMovement() {
        // moveX vaut :
        //  1 si on va à droite
        // -1 si on va à gauche
        //  0 si aucune direction
        const moveX = (this.keys.D.isDown || this.keys.RIGHT.isDown) - (this.keys.A.isDown || this.keys.LEFT.isDown);

        // Application de la vitesse horizontale au joueur
        this.player.setVelocityX(moveX * 300);

        // Si le joueur bouge, on retourne le sprite selon la direction
        if (moveX !== 0) this.player.setFlipX(moveX < 0);

        // Détection de l'appui sur une touche de saut
        const jump = Phaser.Input.Keyboard.JustDown(this.keys.W) || Phaser.Input.Keyboard.JustDown(this.keys.UP) || Phaser.Input.Keyboard.JustDown(this.keys.SPACE);

        // Le joueur saute uniquement s'il est au sol
        if (jump && this.player.body.blocked.down) this.player.setVelocityY(-480);
    }

    handleShooting(time) {
    const pointer = this.input.activePointer;

    if ((Phaser.Input.Keyboard.JustDown(this.keys.F) || pointer.isDown) && time > (this.lastShot || 0)) {
        this.lastShot = time + 250;

        // position souris convertie en coordonnées du monde
        const mouse = pointer.positionToCamera(this.cameras.main);

        const shot = this.playerShots.create(this.player.x, this.player.y, 'bullet');

        if (shot) {
            shot.body.setAllowGravity(false);

            // calcul de l'angle entre le joueur et la souris
            const angle = Phaser.Math.Angle.Between(
                this.player.x,
                this.player.y,
                mouse.x,
                mouse.y
            );

            // vitesse du projectile dans la bonne direction
            const speed = 600;
            shot.setVelocity(
                Math.cos(angle) * speed,
                Math.sin(angle) * speed
            );

            // optionnel : tourne la balle dans le sens du tir
            shot.setRotation(angle);

            this.time.delayedCall(1500, () => {
                if (shot.active) shot.destroy();
            });
        }
    }
}

    // --- LOGIQUE DE L'ALIEN (MODE RAGE & TIR MULTIPLE) ---
    updateAlien(time) {
        const dist = Phaser.Math.Distance.BetweenPoints(this.player, this.alien);

        // Phase 2 : Rage à moins de 50% de PV
        if (this.alien.hp < this.alien.maxHp * 0.5 && !this.alien.isRaging) {
            this.alien.isRaging = true;
            this.alien.setTint(0xff3333); // Change de couleur en rouge
            this.cameras.main.shake(500, 0.01); // Effet visuel de rage
        }

        if (dist < 800 && dist > 80) {
            const dir = Math.sign(this.player.x - this.alien.x);

            // L'Alien devient plus rapide en mode Rage
            const currentSpeed = this.alien.isRaging ? 260 : 180;
            this.alien.setVelocityX(dir * currentSpeed).setFlipX(dir > 0);

            // Cadence de tir plus élevée en mode Rage
            const fireRate = this.alien.isRaging ? 700 : 1500;

            if (dist < 500 && time > (this.lastAlienShot || 0)) {
                this.lastAlienShot = time + fireRate;
                this.alienShoot();
            }
        }
    }

    alienShoot() {
        // Premier projectile (visé)
        const spit1 = this.alienShots.create(this.alien.x, this.alien.y, 'alienSpit');
        if (spit1) {
            spit1.body.setAllowGravity(false);
            this.physics.moveToObject(spit1, this.player, 350);
        }

        // Tir supplémentaire si en mode Rage
        if (this.alien.isRaging) {
            this.time.delayedCall(150, () => {
                const spit2 = this.alienShots.create(this.alien.x, this.alien.y, 'alienSpit');
                if (spit2) {
                    spit2.body.setAllowGravity(false);
                    // On vise un peu au-dessus du joueur
                    this.physics.moveTo(spit2, this.player.x, this.player.y - 80, 400);
                }
            });
        }
    }

    handleDamage(target, projectile, amount, isPlayer = false) {
        if (this.time.now < target.invul) return;
        if (projectile) projectile.destroy();

        target.hp -= amount;
        target.invul = this.time.now + 400;
        target.setTint(0xff0000);

        // On remet la teinte de rage après le flash de dégâts si besoin
        this.time.delayedCall(100, () => {
            if (target.isRaging) target.setTint(0xff3333);
            else target.clearTint();
        });

        if (isPlayer) this.cameras.main.shake(100, 0.005);
        if (target.hp <= 0) this.finish(!isPlayer);
    }

    buildHud() {
        this.hud = this.add.container(20, 20).setScrollFactor(0).setDepth(1000);
        this.pBar = this.add.rectangle(0, 0, 200, 15, 0x00ffcc).setOrigin(0);
        this.aBar = this.add.rectangle(0, 25, 200, 15, 0xbd00ff).setOrigin(0);

        this.statusText = this.add.text(CONFIG.width / 2, CONFIG.height / 2, '', {
            fontSize: '48px',
            fill: '#fff',
            stroke: '#000',
            strokeThickness: 6
        }).setOrigin(0.5);

        this.hud.add([this.pBar, this.aBar, this.statusText]);
    }

    updateHud() {
        this.pBar.width = Math.max(0, (this.player.hp / this.player.maxHp) * 200);
        this.aBar.width = Math.max(0, (this.alien.hp / this.alien.maxHp) * 200);
    }

    finish(win) {
        this.gameFinished = true;
        this.physics.pause();
        this.statusText.setText(win ? "VICTOIRE !" : "DÉFAITE...");
        this.statusText.setFill(win ? "#00ffcc" : "#ff0000");
    }
}


