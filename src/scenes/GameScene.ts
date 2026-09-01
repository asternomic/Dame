import Phaser from 'phaser';
import { LEVELS, PLATFORM_HEIGHT } from '../levels';

const WIDTH = 800;
const HEIGHT = 600;
const BASE_JUMP = 400;
const JUMP_PER_COIN = 25;

interface SceneData {
  level?: number;
}

export class GameScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private coins!: Phaser.Physics.Arcade.Group;
  private hudText!: Phaser.GameObjects.Text;
  private levelIndex = 0;
  private collected = 0;
  private finished = false;

  constructor() {
    super('GameScene');
  }

  init(data: SceneData) {
    this.levelIndex = Phaser.Math.Clamp(data.level ?? 0, 0, LEVELS.length - 1);
    this.collected = 0;
    this.finished = false;
  }

  preload() {
    this.makeTexture('player', 32, 48, 0x4ecca3);
    this.makeTexture('platform', 200, PLATFORM_HEIGHT, 0x6c5ce7);
    this.makeTexture('coin', 16, 16, 0xffd32a);
  }

  create() {
    const level = LEVELS[this.levelIndex];

    const platforms = this.physics.add.staticGroup();
    platforms.create(WIDTH / 2, HEIGHT - 12, 'platform').setScale(5, 1).refreshBody();
    for (const p of level.platforms) {
      platforms.create(p.x, p.y, 'platform').setScale((p.w ?? 200) / 200, 1).refreshBody();
    }

    this.player = this.physics.add.sprite(level.playerStart.x, level.playerStart.y, 'player');
    this.player.setBounce(0.1);
    this.physics.world.setBounds(-this.player.width, 0, WIDTH + this.player.width * 2, HEIGHT);
    this.physics.world.setBoundsCollision(false, false, true, true);
    this.player.setCollideWorldBounds(true);
    this.physics.add.collider(this.player, platforms);

    this.coins = this.physics.add.group({ allowGravity: false, immovable: true });
    for (const c of level.coins) {
      this.coins.create(c.x, c.y, 'coin');
    }
    this.physics.add.overlap(this.player, this.coins, (_p, c) => this.collectCoin(c as Phaser.Physics.Arcade.Sprite));

    this.hudText = this.add.text(16, 16, '', { fontSize: '24px', color: '#ffffff' });
    this.updateHud();
    this.add
      .text(WIDTH / 2, 48, `${level.name} — Arrows to move, Up to jump. Coins boost your jump!`, {
        fontSize: '16px',
        color: '#aaaaaa',
      })
      .setOrigin(0.5, 0);

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.input.keyboard!.on('keydown-R', () => this.scene.restart({ level: this.levelIndex }));
  }

  update() {
    if (this.finished) {
      this.player.setVelocityX(0);
      return;
    }

    const speed = 200;
    if (this.cursors.left.isDown) {
      this.player.setVelocityX(-speed);
    } else if (this.cursors.right.isDown) {
      this.player.setVelocityX(speed);
    } else {
      this.player.setVelocityX(0);
    }

    if (this.cursors.up.isDown && this.player.body!.touching.down) {
      this.player.setVelocityY(-this.jumpVelocity());
    }

    if (this.player.x <= -this.player.width / 2) {
      this.player.x = WIDTH + this.player.width / 2;
    } else if (this.player.x >= WIDTH + this.player.width / 2) {
      this.player.x = -this.player.width / 2;
    }
  }

  private jumpVelocity() {
    return BASE_JUMP + this.collected * JUMP_PER_COIN;
  }

  private updateHud() {
    const total = LEVELS[this.levelIndex].coins.length;
    this.hudText.setText(`Level ${this.levelIndex + 1}/${LEVELS.length}   Coins ${this.collected}/${total}`);
  }

  private collectCoin(coin: Phaser.Physics.Arcade.Sprite) {
    coin.disableBody(true, true);
    this.collected++;
    this.updateHud();

    if (this.coins.countActive(true) === 0) {
      this.finished = true;
      const isLast = this.levelIndex === LEVELS.length - 1;
      this.showBanner(
        isLast
          ? `You beat all ${LEVELS.length} levels!\nPress Enter to play again`
          : `Level ${this.levelIndex + 1} complete!\nPress Enter for the next level`,
      );
      this.input.keyboard!.once('keydown-ENTER', () =>
        this.scene.restart({ level: isLast ? 0 : this.levelIndex + 1 }),
      );
    }
  }

  private showBanner(message: string) {
    this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, 120, 0x000000, 0.7).setDepth(10);
    this.add
      .text(WIDTH / 2, HEIGHT / 2, message, { fontSize: '28px', color: '#4ecca3', align: 'center' })
      .setOrigin(0.5)
      .setDepth(11);
  }

  private makeTexture(key: string, w: number, h: number, color: number) {
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(color, 1).fillRect(0, 0, w, h);
    g.generateTexture(key, w, h);
    g.destroy();
  }
}
