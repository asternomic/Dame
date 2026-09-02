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
const ENEMY_BULLET_SPEED = 180;
const BOSS_FIRE_INTERVAL_MS = 1200;
const MAX_COIN_SCORE = 1000;
const MIN_COIN_SCORE = 100;
const SCORE_DECAY_PER_SECOND = 35;
const DEATH_SCORE_PENALTY = 1000;
const LEADERBOARD_KEY = 'dame-leaderboard';
const MAX_LEADERBOARD_ENTRIES = 10;

interface SceneData {
  level?: number;
  score?: number;
  wearable?: number;
}

type Enemy = Phaser.Physics.Arcade.Sprite & {
  minX: number;
  maxX: number;
  hp: number;
  canShoot: boolean;
  lastShotAt: number;
};
type Wearable = {
  name: string;
  draw: (g: Phaser.GameObjects.Graphics) => void;
};
type LeaderboardEntry = {
  name: string;
  score: number;
  date: string;
};

const WEARABLES: Wearable[] = [
  {
    name: 'Cap',
    draw: (g) => {
      g.fillStyle(0x276ef1, 1).fillRect(5, 4, 20, 5).fillRect(20, 8, 9, 3);
    },
  },
  {
    name: 'Crown',
    draw: (g) => {
      g.fillStyle(0xffd32a, 1).fillRect(5, 7, 22, 5);
      g.fillTriangle(5, 7, 8, 1, 11, 7);
      g.fillTriangle(13, 7, 16, 0, 19, 7);
      g.fillTriangle(21, 7, 24, 1, 27, 7);
    },
  },
  {
    name: 'Headphones',
    draw: (g) => {
      g.lineStyle(3, 0x22223b, 1).beginPath();
      g.arc(16, 10, 12, Phaser.Math.DegToRad(190), Phaser.Math.DegToRad(350), false);
      g.strokePath();
      g.fillStyle(0xff4d4d, 1).fillRect(1, 14, 5, 10).fillRect(26, 14, 5, 10);
    },
  },
  {
    name: 'Bandana',
    draw: (g) => {
      g.fillStyle(0xff4d4d, 1).fillRect(4, 9, 24, 5);
      g.fillTriangle(24, 10, 31, 7, 28, 15);
    },
  },
  {
    name: 'Halo',
    draw: (g) => {
      g.lineStyle(2, 0xfff0a8, 1).strokeEllipse(16, 3, 22, 7);
    },
  },
  {
    name: 'Visor',
    draw: (g) => {
      g.fillStyle(0x10101f, 1).fillRect(4, 11, 24, 6);
      g.fillStyle(0x5eead4, 1).fillRect(6, 12, 20, 3);
    },
  },
  {
    name: 'Scarf',
    draw: (g) => {
      g.fillStyle(0xf72585, 1).fillRect(3, 25, 26, 5).fillRect(23, 29, 5, 13);
    },
  },
  {
    name: 'Cape',
    draw: (g) => {
      g.fillStyle(0x7209b7, 1).fillTriangle(5, 20, 27, 20, 20, 47);
    },
  },
  {
    name: 'Backpack',
    draw: (g) => {
      g.fillStyle(0x795548, 1).fillRoundedRect(1, 22, 8, 18, 2);
      g.fillStyle(0xffb627, 1).fillRect(3, 25, 4, 3);
    },
  },
  {
    name: 'Bow',
    draw: (g) => {
      g.fillStyle(0xff6bcb, 1);
      g.fillTriangle(8, 7, 15, 3, 15, 11);
      g.fillTriangle(24, 7, 17, 3, 17, 11);
      g.fillRect(15, 5, 2, 4);
    },
  },
  {
    name: 'Medal',
    draw: (g) => {
      g.fillStyle(0x264653, 1).fillTriangle(11, 18, 16, 28, 21, 18);
      g.fillStyle(0xffd32a, 1).fillCircle(16, 29, 5);
    },
  },
  {
    name: 'Boots',
    draw: (g) => {
      g.fillStyle(0x22223b, 1).fillRect(4, 43, 10, 5).fillRect(18, 43, 10, 5);
      g.fillStyle(0xffd32a, 1).fillRect(8, 42, 4, 2).fillRect(22, 42, 4, 2);
    },
  },
];

export class GameScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private fireKey!: Phaser.Input.Keyboard.Key;
  private coins!: Phaser.Physics.Arcade.Group;
  private enemies!: Phaser.Physics.Arcade.Group;
  private bullets!: Phaser.Physics.Arcade.Group;
  private enemyBullets!: Phaser.Physics.Arcade.Group;
  private levelIndex = 0;
  private collected = 0;
  private score = 0;
  private levelStartScore = 0;
  private levelStartedAt = 0;
  private scoreText!: Phaser.GameObjects.Text;
  private wearableIndex = 0;
  private awaitingCustomization = false;
  private customizationLayer?: Phaser.GameObjects.Container;
  private finished = false;
  private facing = 1;
  private lastShotAt = -Infinity;

  constructor() {
    super('GameScene');
  }

  init(data: SceneData) {
    this.levelIndex = Phaser.Math.Clamp(data.level ?? 0, 0, LEVELS.length - 1);
    this.collected = 0;
    this.score = data.score ?? 0;
    this.levelStartScore = this.score;
    this.wearableIndex = data.wearable ?? 0;
    this.awaitingCustomization = data.wearable === undefined;
    this.finished = false;
    this.facing = 1;
    this.lastShotAt = -Infinity;
  }

  preload() {
    for (let i = 0; i < WEARABLES.length; i++) {
      this.makePlayerTexture(i);
    }
    this.makeEnemyTexture();
    this.makeRectTexture('platform', 200, PLATFORM_HEIGHT, 0x6c5ce7);
    this.makeSatoshiTexture();
    this.makeRectTexture('bullet', 10, 4, 0xfff5b7);
    this.makeEnemyBulletTexture();
  }

  create() {
    const level = LEVELS[this.levelIndex];
    this.levelStartedAt = this.time.now;

    const platforms = this.physics.add.staticGroup();
    platforms.create(WIDTH / 2, HEIGHT - 12, 'platform').setScale(5, 1).refreshBody();
    for (const p of level.platforms) {
      platforms.create(p.x, p.y, 'platform').setScale((p.w ?? 200) / 200, 1).refreshBody();
    }

    this.player = this.physics.add.sprite(
      level.playerStart.x,
      level.playerStart.y,
      this.playerTextureKey(this.wearableIndex),
    );
    this.player.setBounce(0.1);
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
      enemy.canShoot = enemy.hp > 1;
      enemy.lastShotAt = this.time.now + 500;
      if (enemy.hp > 1) enemy.setScale(1.6).setTint(0xff8800);
      enemy.setVelocityX(ENEMY_SPEED);
    }
    this.physics.add.overlap(this.player, this.enemies, () => this.die());

    this.bullets = this.physics.add.group({ allowGravity: false });
    this.physics.add.overlap(this.bullets, this.enemies, (b, e) =>
      this.hitEnemy(b as Phaser.Physics.Arcade.Sprite, e as Enemy),
    );

    this.enemyBullets = this.physics.add.group({ allowGravity: false });
    this.physics.add.overlap(this.player, this.enemyBullets, () => this.die());

    this.add.text(16, 16, `Level ${this.levelIndex + 1}`, { fontSize: '24px', color: '#ffffff' });
    this.scoreText = this.add
      .text(WIDTH - 16, 16, `Score ${this.score}`, { fontSize: '24px', color: '#ffd32a' })
      .setOrigin(1, 0);
    const hint = level.enemies?.length
      ? 'Arrows move, Up jumps, Space shoots. Coins boost jump & fire rate!'
      : 'Arrows move, Up jumps. Coins boost your jump!';
    this.add
      .text(WIDTH / 2, 48, `${level.name} — ${hint}`, { fontSize: '16px', color: '#aaaaaa' })
      .setOrigin(0.5, 0);

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.fireKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.input.keyboard!.on('keydown-R', () =>
      this.scene.restart({
        level: this.levelIndex,
        score: this.levelStartScore,
        wearable: this.awaitingCustomization ? undefined : this.wearableIndex,
      }),
    );

    if (this.awaitingCustomization) {
      this.physics.world.pause();
      this.showCustomization();
    }
  }

  update(time: number) {
    if (this.awaitingCustomization) return;

    this.patrolEnemies();
    this.cullBullets();
    this.shootBossBullets(time);
    this.cullEnemyBullets();

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

    this.wrapPlayer();
  }

  private wrapPlayer() {
    const halfWidth = this.player.displayWidth / 2;
    if (this.player.x < -halfWidth) {
      this.player.x = WIDTH + halfWidth;
    } else if (this.player.x > WIDTH + halfWidth) {
      this.player.x = -halfWidth;
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

  private cullEnemyBullets() {
    for (const obj of this.enemyBullets.getChildren()) {
      const b = obj as Phaser.Physics.Arcade.Sprite;
      if (b.x < -30 || b.x > WIDTH + 30 || b.y < -30 || b.y > HEIGHT + 30) b.destroy();
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

  private shootBossBullets(time: number) {
    if (this.finished) return;
    for (const obj of this.enemies.getChildren()) {
      const enemy = obj as Enemy;
      if (!enemy.canShoot || time - enemy.lastShotAt < BOSS_FIRE_INTERVAL_MS) continue;

      const bullet = this.enemyBullets.create(enemy.x, enemy.y, 'enemyBullet') as Phaser.Physics.Arcade.Sprite;
      this.physics.moveToObject(bullet, this.player, ENEMY_BULLET_SPEED);
      enemy.lastShotAt = time;
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
    const restartScore = Math.max(0, this.levelStartScore - DEATH_SCORE_PENALTY);
    this.player.setVelocity(0, 0);
    this.player.setTint(0xff4d4d);
    this.showBanner(`Ouch! -${DEATH_SCORE_PENALTY} points\nRestarting level...`);
    this.time.delayedCall(900, () =>
      this.scene.restart({
        level: this.levelIndex,
        score: restartScore,
        wearable: this.wearableIndex,
      }),
    );
  }

  private collectCoin(coin: Phaser.Physics.Arcade.Sprite) {
    coin.disableBody(true, true);
    this.collected++;
    const points = this.coinScore();
    this.score += points;
    this.scoreText.setText(`Score ${this.score}`);
    this.addScorePop(coin.x, coin.y - 16, points);
    this.pop(coin.x, coin.y, 0xffd32a);

    if (this.coins.countActive(true) === 0) {
      this.finished = true;
      const isLast = this.levelIndex === LEVELS.length - 1;
      if (isLast) {
        this.showLeaderboard();
      } else {
        this.showBanner(`Level ${this.levelIndex + 1} complete!\nScore ${this.score}\nPress Enter for the next level`);
        this.input.keyboard!.once('keydown-ENTER', () =>
          this.scene.restart({
            level: this.levelIndex + 1,
            score: this.score,
            wearable: this.wearableIndex,
          }),
        );
      }
    }
  }

  private coinScore() {
    const elapsedSeconds = (this.time.now - this.levelStartedAt) / 1000;
    return Math.max(
      MIN_COIN_SCORE,
      Math.round(MAX_COIN_SCORE - elapsedSeconds * SCORE_DECAY_PER_SECOND),
    );
  }

  private addScorePop(x: number, y: number, points: number) {
    const text = this.add
      .text(x, y, `+${points}`, { fontSize: '16px', color: '#fff0a8' })
      .setOrigin(0.5);
    this.tweens.add({
      targets: text,
      y: y - 18,
      alpha: 0,
      duration: 450,
      onComplete: () => text.destroy(),
    });
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

  private showLeaderboard() {
    let name = 'YOU';
    let saved = false;
    const layer = this.add.container(0, 0).setDepth(20);
    const title = `Final Score ${this.score}`;
    const nameText = this.add
      .text(WIDTH / 2, 198, `Name: ${name}`, { fontSize: '22px', color: '#ffd32a' })
      .setOrigin(0.5);
    const rowsText = this.add.text(WIDTH / 2 - 180, 248, '', {
      fontSize: '18px',
      color: '#ffffff',
      lineSpacing: 8,
    });
    const statusText = this.add
      .text(WIDTH / 2, 498, 'Type a name, then press Enter to save', {
        fontSize: '16px',
        color: '#aaaaaa',
      })
      .setOrigin(0.5);

    const renderRows = (entries: LeaderboardEntry[]) => {
      const rows = entries.length
        ? entries
            .map((entry, index) => {
              const rank = `${index + 1}.`.padEnd(3, ' ');
              const player = entry.name.padEnd(8, ' ');
              return `${rank} ${player} ${entry.score}`;
            })
            .join('\n')
        : 'No saved scores yet';
      rowsText.setText(rows);
    };

    layer.add(this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x10101f, 0.78));
    layer.add(this.add.rectangle(WIDTH / 2, HEIGHT / 2, 520, 420, 0x1b1d35, 1).setStrokeStyle(2, 0xffd32a));
    layer.add(
      this.add
        .text(WIDTH / 2, 124, 'Leaderboard', { fontSize: '34px', color: '#ffffff' })
        .setOrigin(0.5),
    );
    layer.add(this.add.text(WIDTH / 2, 166, title, { fontSize: '20px', color: '#4ecca3' }).setOrigin(0.5));
    layer.add(nameText);
    layer.add(rowsText);
    layer.add(statusText);

    renderRows(this.loadLeaderboard());

    const handleKey = (event: KeyboardEvent) => {
      if (saved && event.key === 'Enter') {
        this.input.keyboard!.off('keydown', handleKey);
        this.scene.restart({ level: 0 });
        return;
      }

      if (event.key === 'Enter') {
        const entries = this.saveLeaderboard(name, this.score);
        saved = true;
        renderRows(entries);
        statusText.setText('Saved. Press Enter to play again');
        return;
      }

      if (saved) return;

      if (event.key === 'Backspace') {
        name = name.slice(0, -1) || 'YOU';
      } else if (/^[a-zA-Z0-9]$/.test(event.key)) {
        name = (name === 'YOU' ? event.key : `${name}${event.key}`).slice(0, 8).toUpperCase();
      }
      nameText.setText(`Name: ${name}`);
    };

    this.input.keyboard!.on('keydown', handleKey);
  }

  private loadLeaderboard() {
    try {
      const rawEntries = JSON.parse(localStorage.getItem(LEADERBOARD_KEY) ?? '[]') as LeaderboardEntry[];
      if (!Array.isArray(rawEntries)) return [];
      return rawEntries
        .filter((entry) => typeof entry.name === 'string' && Number.isFinite(entry.score))
        .sort((a, b) => b.score - a.score)
        .slice(0, MAX_LEADERBOARD_ENTRIES);
    } catch {
      return [];
    }
  }

  private saveLeaderboard(name: string, score: number) {
    const entry: LeaderboardEntry = {
      name: name.trim().toUpperCase() || 'YOU',
      score,
      date: new Date().toISOString(),
    };
    const entries = [...this.loadLeaderboard(), entry]
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_LEADERBOARD_ENTRIES);
    try {
      localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(entries));
    } catch {
      // Private browsing or disabled storage should not block the end screen.
    }
    return entries;
  }

  private showCustomization() {
    const layer = this.add.container(0, 0).setDepth(20);
    this.customizationLayer = layer;

    layer.add(this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x10101f, 0.55));
    layer.add(this.add.rectangle(WIDTH / 2, HEIGHT / 2, 548, 326, 0x1b1d35, 1).setStrokeStyle(2, 0x4ecca3));
    layer.add(
      this.add
        .text(WIDTH / 2, 170, 'Choose Your Wearable', {
          fontSize: '22px',
          color: '#ffffff',
        })
        .setOrigin(0.5),
    );
    layer.add(
      this.add
        .text(WIDTH / 2, 198, 'Pick one to start', {
          fontSize: '13px',
          color: '#aaaaaa',
        })
        .setOrigin(0.5),
    );

    const columns = 6;
    const cardW = 72;
    const cardH = 72;
    const gap = 10;
    const startX = WIDTH / 2 - ((columns - 1) * (cardW + gap)) / 2;
    const startY = 252;

    WEARABLES.forEach((wearable, index) => {
      const col = index % columns;
      const row = Math.floor(index / columns);
      const x = startX + col * (cardW + gap);
      const y = startY + row * (cardH + gap);
      const card = this.add
        .rectangle(x, y, cardW, cardH, 0x262a49, 1)
        .setStrokeStyle(1, 0x5f6f8f)
        .setInteractive({ useHandCursor: true });
      const preview = this.add.image(x, y - 12, this.playerTextureKey(index)).setScale(1.05);
      const label = this.add
        .text(x, y + 25, wearable.name, { fontSize: '10px', color: '#ffffff' })
        .setOrigin(0.5);

      card.on('pointerover', () => card.setStrokeStyle(2, 0xffd32a).setFillStyle(0x31385f));
      card.on('pointerout', () => card.setStrokeStyle(1, 0x5f6f8f).setFillStyle(0x262a49));
      card.on('pointerdown', () => this.chooseWearable(index));
      preview.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.chooseWearable(index));
      label.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.chooseWearable(index));

      layer.add([card, preview, label]);
    });
  }

  private chooseWearable(index: number) {
    this.wearableIndex = index;
    this.player.setTexture(this.playerTextureKey(index));
    this.customizationLayer?.destroy();
    this.customizationLayer = undefined;
    this.awaitingCustomization = false;
    this.levelStartedAt = this.time.now;
    this.physics.world.resume();
  }

  private makeRectTexture(key: string, w: number, h: number, color: number) {
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(color, 1).fillRect(0, 0, w, h);
    g.generateTexture(key, w, h);
    g.destroy();
  }

  private makeEnemyBulletTexture() {
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0xff7043, 1).fillCircle(5, 5, 5);
    g.fillStyle(0xffc2a1, 1).fillCircle(4, 4, 2);
    g.generateTexture('enemyBullet', 10, 10);
    g.destroy();
  }

  private playerTextureKey(index: number) {
    return `player-${index}`;
  }

  private makePlayerTexture(wearableIndex: number) {
    const w = 32;
    const h = 48;
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0x4ecca3, 1);
    g.fillRoundedRect(1, 10, w - 2, h - 10, 8);
    g.fillTriangle(6, 11, 10, 4, 14, 11);
    g.fillTriangle(13, 11, 16, 2, 20, 11);
    g.fillTriangle(19, 11, 23, 5, 27, 11);
    WEARABLES[wearableIndex].draw(g);
    g.generateTexture(this.playerTextureKey(wearableIndex), w, h);
    g.destroy();
  }

  private makeSatoshiTexture() {
    const s = 16;
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0x8f5600, 1).fillCircle(8, 8, 8);
    g.fillStyle(0xf7a600, 1).fillCircle(8, 8, 7);
    g.fillStyle(0xffcf4d, 1).fillCircle(7, 7, 5);
    g.fillStyle(0x7b4700, 1).fillCircle(8, 8, 5);
    g.fillStyle(0xfff2a8, 1);
    g.fillRect(5, 3, 1, 10);
    g.fillRect(9, 3, 1, 10);
    g.fillRect(4, 4, 5, 2);
    g.fillRect(4, 7, 6, 2);
    g.fillRect(4, 10, 5, 2);
    g.fillRect(8, 5, 2, 2);
    g.fillRect(9, 8, 2, 2);
    g.generateTexture('coin', s, s);
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
