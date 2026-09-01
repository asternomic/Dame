import Phaser from 'phaser';
import { ENEMY_SIZE, LEVELS, PLATFORM_HEIGHT } from '../levels';

const WIDTH = 800;
const HEIGHT = 600;
const BASE_JUMP = 400;
const JUMP_PER_COIN = 25;
const BASE_FIRE_INTERVAL_MS = 600;
const FIRE_RATE_PER_COIN = 0.25;
const BULLET_SPEED = 500;
const ENEMY_SPEED = 60;

interface SceneData {
  level?: number;
}

type Enemy = Phaser.Physics.Arcade.Sprite & { minX: number; maxX: number; hp: number };

export class GameScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private fireKey!: Phaser.Input.Keyboard.Key;
  private coins!: Phaser.Physics.Arcade.Group;
  private enemies!: Phaser.Physics.Arcade.Group;
  private bullets!: Phaser.Physics.Arcade.Group;
  private levelIndex = 0;
  private collected = 0;
  private finished = false;
  private facing = 1;
  private lastShotAt = -Infinity;

  constructor() {
    super('GameScene');
  }

  init(data: SceneData) {
    this.levelIndex = Phaser.Math.Clamp(data.level ?? 0, 0, LEVELS.length - 1);
    this.collected = 0;
    this.finished = false;
    this.facing = 1;
    this.lastShotAt = -Infinity;
  }

  preload() {
    this.makePlayerTexture();
    this.makeEnemyTexture();
    this.makeRectTexture('platform', 200, PLATFORM_HEIGHT, 0x6c5ce7);
    this.makeRectTexture('coin', 16, 16, 0xffd32a);
    this.makeRectTexture('bullet', 10, 4, 0xfff5b7);
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

    this.enemies = this.physics.add.group({ allowGravity: false, immovable: true });
    for (const e of level.enemies ?? []) {
      const enemy = this.enemies.create(e.x, e.y, 'enemy') as Enemy;
      enemy.minX = e.x - e.range;
      enemy.maxX = e.x + e.range;
      enemy.hp = e.hp ?? 1;
      if (enemy.hp > 1) enemy.setScale(1.6).setTint(0xff8800);
      enemy.setVelocityX(ENEMY_SPEED);
    }
    this.physics.add.overlap(this.player, this.enemies, () => this.die());

    this.bullets = this.physics.add.group({ allowGravity: false });
    this.physics.add.overlap(this.bullets, this.enemies, (b, e) =>
      this.hitEnemy(b as Phaser.Physics.Arcade.Sprite, e as Enemy),
    );

    this.add.text(16, 16, `Level ${this.levelIndex + 1}`, { fontSize: '24px', color: '#ffffff' });
    const hint = level.enemies?.length
      ? 'Arrows move, Up jumps, Space shoots. Coins boost jump & fire rate!'
      : 'Arrows move, Up jumps. Coins boost your jump!';
    this.add
      .text(WIDTH / 2, 48, `${level.name} — ${hint}`, { fontSize: '16px', color: '#aaaaaa' })
      .setOrigin(0.5, 0);

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.fireKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.input.keyboard!.on('keydown-R', () => this.scene.restart({ level: this.levelIndex }));
  }

  update(time: number) {
    this.patrolEnemies();
    this.cullBullets();

    if (this.finished) {
      this.player.setVelocityX(0);
      return;
    }

    const speed = 200;
    if (this.cursors.left.isDown) {
      this.player.setVelocityX(-speed);
      this.facing = -1;
    } else if (this.cursors.right.isDown) {
      this.player.setVelocityX(speed);
      this.facing = 1;
    } else {
      this.player.setVelocityX(0);
    }
    this.player.setFlipX(this.facing < 0);

    if (this.cursors.up.isDown && this.player.body!.touching.down) {
      this.player.setVelocityY(-this.jumpVelocity());
    }

    if (this.fireKey.isDown && time - this.lastShotAt >= this.fireIntervalMs()) {
      this.shoot();
      this.lastShotAt = time;
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

  private fireIntervalMs() {
    return BASE_FIRE_INTERVAL_MS / (1 + this.collected * FIRE_RATE_PER_COIN);
  }

  private shoot() {
    const bullet = this.bullets.create(
      this.player.x + this.facing * 20,
      this.player.y - 4,
      'bullet',
    ) as Phaser.Physics.Arcade.Sprite;
    bullet.setVelocityX(this.facing * BULLET_SPEED);
  }

  private cullBullets() {
    for (const obj of this.bullets.getChildren()) {
      const b = obj as Phaser.Physics.Arcade.Sprite;
      if (b.x < -20 || b.x > WIDTH + 20) b.destroy();
    }
  }

  private patrolEnemies() {
    for (const obj of this.enemies.getChildren()) {
      const e = obj as Enemy;
      if (e.x <= e.minX && e.body!.velocity.x < 0) {
        e.setVelocityX(ENEMY_SPEED);
      } else if (e.x >= e.maxX && e.body!.velocity.x > 0) {
        e.setVelocityX(-ENEMY_SPEED);
      }
      e.setFlipX(e.body!.velocity.x < 0);
    }
  }

  private hitEnemy(bullet: Phaser.Physics.Arcade.Sprite, enemy: Enemy) {
    bullet.destroy();
    enemy.hp--;
    if (enemy.hp <= 0) {
      this.pop(enemy.x, enemy.y, 0xff4d4d);
      enemy.destroy();
    } else {
      this.tweens.add({ targets: enemy, alpha: 0.3, duration: 60, yoyo: true });
    }
  }

  private die() {
    if (this.finished) return;
    this.finished = true;
    this.player.setVelocity(0, 0);
    this.player.setTint(0xff4d4d);
    this.showBanner('Ouch! Restarting level...');
    this.time.delayedCall(900, () => this.scene.restart({ level: this.levelIndex }));
  }

  private collectCoin(coin: Phaser.Physics.Arcade.Sprite) {
    coin.disableBody(true, true);
    this.collected++;
    this.pop(coin.x, coin.y, 0xffd32a);

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

  private pop(x: number, y: number, color: number) {
    const ring = this.add.circle(x, y, 6).setStrokeStyle(3, color);
    this.tweens.add({
      targets: ring,
      scale: 4,
      alpha: 0,
      duration: 250,
      onComplete: () => ring.destroy(),
    });
  }

  private showBanner(message: string) {
    this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, 120, 0x000000, 0.7).setDepth(10);
    this.add
      .text(WIDTH / 2, HEIGHT / 2, message, { fontSize: '28px', color: '#4ecca3', align: 'center' })
      .setOrigin(0.5)
      .setDepth(11);
  }

  private makeRectTexture(key: string, w: number, h: number, color: number) {
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(color, 1).fillRect(0, 0, w, h);
    g.generateTexture(key, w, h);
    g.destroy();
  }

  private makePlayerTexture() {
    const w = 32;
    const h = 48;
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0x4ecca3, 1).fillRoundedRect(0, 0, w, h, 8);
    g.fillStyle(0x1a1a2e, 1);
    g.fillCircle(11, 16, 3);
    g.fillCircle(21, 16, 3);
    g.lineStyle(2.5, 0x1a1a2e, 1);
    g.beginPath();
    g.arc(w / 2, 22, 8, Phaser.Math.DegToRad(20), Phaser.Math.DegToRad(160), false);
    g.strokePath();
    g.generateTexture('player', w, h);
    g.destroy();
  }

  private makeEnemyTexture() {
    const s = ENEMY_SIZE;
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0xff4d4d, 1).fillRoundedRect(0, 0, s, s, 4);
    g.fillStyle(0x1a1a2e, 1);
    g.fillRect(6, 9, 6, 3);
    g.fillRect(16, 9, 6, 3);
    g.lineStyle(2.5, 0x1a1a2e, 1);
    g.beginPath();
    g.arc(s / 2, 24, 6, Phaser.Math.DegToRad(200), Phaser.Math.DegToRad(340), false);
    g.strokePath();
    g.generateTexture('enemy', s, s);
    g.destroy();
  }
}
