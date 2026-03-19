export default class niveau2 extends Phaser.Scene {

    // constructeur de la classe
    constructor() {
        super({
            key: "niveau2"
        });
    }

    preload() {
        this.load.spritesheet("img_perso", "src/assets/astronaut_sheet.png", {
            frameWidth: 32,
            frameHeight: 40,
        });
        this.load.image("img_etoile", "src/assets/star.png");
        this.load.image("img_score", "src/assets/star.png");
        this.load.image("img_levier", "src/assets/levier.png");
        this.load.image("img_horloge", "src/assets/time.png");
        this.load.image("Phaser_tuilesdejeu", "src/assets/tilesetdesert.png");
        this.load.tilemapTiledJSON("carte", "src/assets/Map.mars.tmj");
    }

    create() {

        // remise à zéro des variables si on relance la scène
        score = 0;
        tempsRestant = 60;
        totalStars = 0;
        levelFinished = false;
        gameOver = false;
        allowGravity = false;
        levier_gravite_on = false;
        graviteX = 0;
        graviteY = 300;

        // 1) CARTE ET CALQUES
        const carteDuNiveau = this.add.tilemap("carte");
        largeurCarte = carteDuNiveau.widthInPixels;

        const tileset = carteDuNiveau.addTilesetImage(
            "mars",
            "Phaser_tuilesdejeu"
        );

        carteDuNiveau.createLayer("fond", tileset);

        const Calque_de_Tuiles_2 = carteDuNiveau.createLayer(
            "Calque_de_Tuiles_2",
            tileset
        );

        Calque_de_Tuiles_2.setCollisionByProperty({ solide: true });

        this.physics.world.setBounds(
            0,
            0,
            carteDuNiveau.widthInPixels,
            carteDuNiveau.heightInPixels
        );
        this.cameras.main.setBounds(
            0,
            0,
            carteDuNiveau.widthInPixels,
            carteDuNiveau.heightInPixels
        );

        // gravité par défaut
        this.physics.world.gravity.x = 0;
        this.physics.world.gravity.y = 300;

        // 2) OBJETS DU NIVEAU

        levier_gravite = this.physics.add.staticSprite(25, 450, "img_levier");
        levier_gravite.setScale(0.5);
        levier_gravite.setSize(35, 41);
        levier_gravite.setOffset(10, 8);
        levier_gravite.setTint(0xff0000);
        levier_gravite.setDepth(20);

        // 3) JOUEUR
        player = this.physics.add.sprite(spawnX, spawnY, "img_perso");
        player.setDepth(100);
        player.setScale(0.7, 0.7);
        player.setBounce(0.05);

        // IMPORTANT : on laisse tomber dans le vide
        player.setCollideWorldBounds(false);

        player.body.setSize(30, 41); // definit la hitbox du joueur
        player.body.setOffset(10, 8); // deplace la hitbox a l'interieur du personnage

        // 4) COLLISIONS
        // comme plateforme_mobile est commentée, on ne met pas de collider dessus
        this.physics.add.collider(player, Calque_de_Tuiles_2);

        // 5) CLAVIER
        clavier = this.input.keyboard.createCursorKeys();
        touches = this.input.keyboard.addKeys({
            z: Phaser.Input.Keyboard.KeyCodes.Z,
            s: Phaser.Input.Keyboard.KeyCodes.S,
            q: Phaser.Input.Keyboard.KeyCodes.Q,
            d: Phaser.Input.Keyboard.KeyCodes.D
        });

        keyE = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);

        // 6) ANIMATIONS
        this.anims.create({
            key: "anim_tourne_gauche",
            frames: this.anims.generateFrameNumbers("img_perso", { start: 4, end: 0 }),
            frameRate: 10,
            repeat: -1
        });

        this.anims.create({
            key: "anim_tourne_droite",
            frames: this.anims.generateFrameNumbers("img_perso", { start: 0, end: 4 }),
            frameRate: 10,
            repeat: -1
        });

        this.anims.create({
            key: "anim_face",
            frames: [{ key: "img_perso", frame: 0 }],
            frameRate: 20
        });

        // 7) COLLECTABLES
        groupe_etoiles = this.physics.add.group();
        groupe_horloges = this.physics.add.group();

        const objetsHorloges = carteDuNiveau.getObjectLayer("horloges");
        if (objetsHorloges) {
            objetsHorloges.objects.forEach((obj) => {
                const horloge = groupe_horloges.create(obj.x, obj.y - 10, "img_horloge");
                horloge.setBounce(0);
                horloge.setScale(0.03);
                horloge.body.setAllowGravity(false);
                horloge.body.immovable = true;
            });
        }

        const objetsEtoiles = carteDuNiveau.getObjectLayer("etoile");
        if (objetsEtoiles) {
            totalStars = objetsEtoiles.objects.length;
            objetsEtoiles.objects.forEach((obj) => {
                const etoile = groupe_etoiles.create(obj.x, obj.y - 10, "img_etoile");
                etoile.setScale(1);
                etoile.setBounce(0);
                etoile.body.setAllowGravity(false);
                etoile.body.immovable = true;
            });
        }

        this.physics.add.collider(groupe_horloges, Calque_de_Tuiles_2);
        this.physics.add.collider(groupe_etoiles, Calque_de_Tuiles_2);

        this.physics.add.overlap(player, groupe_horloges, ramasserHorloge, null, this);
        this.physics.add.overlap(player, groupe_etoiles, ramasserEtoile, null, this);

        // 8) INTERFACE (HUD)
        this.add.text(
            10,
            10,
            "E: levier gravité (Z/S/Q/D pour gravité)",
            {
                fontSize: "14px",
                fill: "#ffffff"
            }
        ).setScrollFactor(0).setDepth(200);

        zone_texte_score = this.add.text(16, 35, "Score: 0 / 0", {
            fontSize: "20px",
            fill: "#000"
        });

        zone_texte_timer = this.add.text(16, 50, "Temps: 60", {
            fontSize: "20px",
            fill: "#000"
        });



        zone_texte_score.setText(`Score: ${score} / ${totalStars}`);
        zone_texte_score.setScrollFactor(0).setDepth(200);//  setScrollFactor(0) fixe le score et le timer à l'écran, indépendamment du déplacement de la caméra
        zone_texte_timer.setScrollFactor(0).setDepth(200);// setDepth(200) pour être au dessus des autres éléments du jeu


        // 9) CAMERA
        this.cameras.main.startFollow(player);
    }

    update() {

        // si game over, on bloque le reste sauf affichage coord
        if (
            !gameOver &&
            (
                player.y > this.physics.world.bounds.height + 5 || // bas
                player.y < -15 || // haut
                player.x < -5 || // gauche
                player.x > this.physics.world.bounds.width + 5 // droite
            )
        ) {
            finirPartie(this);
            return
        }

        // timer de jeu
        if (!gameOver) {
            tempsRestant -= this.game.loop.delta / 1000;

            if (tempsRestant <= 0) {
                tempsRestant = 0;
                finirPartie(this);
            }

            zone_texte_timer.setText("Temps: " + Math.ceil(tempsRestant));
        }

        if (gameOver || levelFinished) {
            return;
        }

        let enContact =
            player.body.blocked.down ||
            player.body.blocked.up ||
            player.body.blocked.left ||
            player.body.blocked.right ||
            player.body.touching.down ||
            player.body.touching.up ||
            player.body.touching.left ||
            player.body.touching.right;

        // =========================
        // CHANGEMENT DE GRAVITE
        // =========================
        if (allowGravity) {
            if (Phaser.Input.Keyboard.JustDown(touches.z) && enContact) {
                changerGravite(this, 0, -300);
            }

            if (Phaser.Input.Keyboard.JustDown(touches.s) && enContact) {
                changerGravite(this, 0, 300);
            }

            if (Phaser.Input.Keyboard.JustDown(touches.q) && enContact) {
                changerGravite(this, -300, 0);
            }

            if (Phaser.Input.Keyboard.JustDown(touches.d) && enContact) {
                changerGravite(this, 300, 0);
            }
        }

        // =========================
        // DEPLACEMENT + ANIMATIONS
        // =========================

        // gravité verticale : déplacement horizontal
        if (graviteY !== 0) {           // si la gravité est verticale, on se déplace horizontalement
            player.setVelocityX(0);

            if (clavier.left.isDown) {
                player.setVelocityX(-160);

                if (graviteY > 0) {
                    player.anims.play("anim_tourne_gauche", true);
                    player.setFlipX(false);
                } else {
                    player.anims.play("anim_tourne_droite", true);
                    player.setFlipX(false);
                }
            }
            else if (clavier.right.isDown) {
                player.setVelocityX(160);

                if (graviteY > 0) {
                    player.anims.play("anim_tourne_droite", true);
                    player.setFlipX(false);
                } else {
                    player.anims.play("anim_tourne_gauche", true);
                    player.setFlipX(false);
                }
            }
            else {
                player.anims.play("anim_face", true);
                player.setFlipX(false);
            }
        }

        // gravité horizontale : déplacement vertical sur les murs
        if (graviteX !== 0) {  // si la gravité est horizontale, on se déplace verticalement
            player.setVelocityY(0);

            if (graviteX > 0) {
                if (clavier.left.isDown) {
                    player.setVelocityY(160);
                    player.anims.play("anim_tourne_gauche", true);
                }
                else if (clavier.right.isDown) {
                    player.setVelocityY(-160);
                    player.anims.play("anim_tourne_droite", true);
                }
                else {
                    player.anims.play("anim_face", true);
                }
            }
            else if (graviteX < 0) {
                if (clavier.left.isDown) {
                    player.setVelocityY(-160);
                    player.anims.play("anim_tourne_gauche", true);
                }
                else if (clavier.right.isDown) {
                    player.setVelocityY(160);
                    player.anims.play("anim_tourne_droite", true);
                }
                else {
                    player.anims.play("anim_face", true);
                }
            }
        }

        // =========================
        // SAUT
        // =========================
        if (Phaser.Input.Keyboard.JustDown(clavier.up)) {
            if (graviteY > 0 && player.body.blocked.down) {
                player.setVelocityY(-250);
            }
            else if (graviteY < 0 && player.body.blocked.up) {
                player.setVelocityY(250);
            }
            else if (graviteX > 0 && player.body.blocked.right) {
                player.setVelocityX(-250);
            }
            else if (graviteX < 0 && player.body.blocked.left) {
                player.setVelocityX(250);
            }
        }
        // levier de gravité
        if (
            Phaser.Input.Keyboard.JustDown(keyE) &&
            this.physics.overlap(player, levier_gravite)
        ) {
            levier_gravite_on = !levier_gravite_on;
            allowGravity = levier_gravite_on;
            levier_gravite.setFlipX(levier_gravite_on);
            levier_gravite.setTint(levier_gravite_on ? 0x00ff00 : 0xff0000);
        }

        if (!levelFinished && totalStars > 0 && score >= totalStars) {
            validerNiveau2(this);
        }

    }
}

var clavier;
var player;
var touches;
var keyE;
var graviteX = 0;
var graviteY = 300;
var levier_gravite;
var groupe_etoiles;
var groupe_horloges;
var score = 0;
var zone_texte_score;
var zone_texte_timer;
var tempsRestant = 60;
var levier_gravite_on = false;
var gameOver = false;
var allowGravity = false;
var spawnX = 100;
var spawnY = 100;
var totalStars = 0;
var largeurCarte = 0;
var levelFinished = false;

function changerGravite(scene, gx, gy) {
    scene.physics.world.gravity.x = gx;
    scene.physics.world.gravity.y = gy;

    graviteX = gx;
    graviteY = gy;

    player.setVelocity(0, 0);

    if (gy > 0) {
        player.angle = 0;
    }
    else if (gy < 0) {
        player.angle = 180;
    }
    else if (gx > 0) {
        player.angle = -90;
    }
    else if (gx < 0) {
        player.angle = 90;
    }

    player.setFlipX(false);
}

function ramasserEtoile(un_player, une_etoile) {
    une_etoile.disableBody(true, true); // fait disparaitre l'étoile quand on la ramasse    
    score += 1;
    zone_texte_score.setText("Score: " + score + " / " + totalStars);
}

function ramasserHorloge(un_player, une_horloge) {
    une_horloge.disableBody(true, true); // fait disparaitre l'horloge quand on la ramasse
    tempsRestant += 5;

    if (tempsRestant > 120) {
        tempsRestant = 120;
    }

    zone_texte_timer.setText("Temps: " + Math.ceil(tempsRestant));
}

function finirPartie(scene) {
    if (gameOver) return;

    gameOver = true;
    player.setTint(0xff0000);
    player.setVelocity(0, 0);
    player.body.moves = false;
    player.anims.stop();
    player.setFrame(0);

    const messageDefaite = scene.add.text(400, 280, 'DÉFAITE...', {
        fontSize: '48px',
        align: 'center',
        fill: '#ff4d4d',
        backgroundColor: '#102030',
        padding: { left: 18, right: 18, top: 12, bottom: 12 },
        stroke: '#000000',
        strokeThickness: 6
    }).setOrigin(0.5).setScrollFactor(0).setDepth(300);

    scene.time.delayedCall(2000, () => {
        scene.scene.start('levelSelect');
    });
}

function validerNiveau2(scene) {
    if (levelFinished) return;

    levelFinished = true;
    player.setVelocity(0, 0);
    player.body.moves = false;
    window.sessionStorage.setItem('solarQuestUnlockedLevel', String(Math.max(3, Number(window.sessionStorage.getItem('solarQuestUnlockedLevel') || '1')))); // débloque le niveau 3
    const message = scene.add.text(400, 280, 'Niveau 2 validé !\nNiveau 3 débloqué', {
        fontSize: '34px',
        align: 'center',
        fill: '#9cffb5',
        backgroundColor: '#102030',
        padding: { left: 18, right: 18, top: 12, bottom: 12 },
        stroke: '#000000',
        strokeThickness: 6
    }).setOrigin(0.5).setScrollFactor(0).setDepth(300);

    scene.time.delayedCall(1700, () => {
        message.destroy();
        scene.scene.start('levelSelect');
    });
}

