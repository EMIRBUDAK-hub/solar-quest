import menu from './js/menu.js';
import niveau1 from './js/niveau1.js';
import niveau2 from './js/niveau2.js';
import LevelSelect from './js/levelSelect.js';
import Niveau3 from './js/niveau3.js';

var config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: {
                y: 300
            },
            debug: false
        }
    },
    scene: [menu, LevelSelect, niveau1, niveau2, Niveau3]
};

var game = new Phaser.Game(config);
game.scene.start('menu');
