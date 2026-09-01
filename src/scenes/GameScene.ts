import Phaser from 'phaser';

const WIDTH = 800;
const HEIGHT = 600;

export class GameScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private coins!: Phaser.Physics.Arcade.Group;
  private scoreText!: Phaser.GameObjects.Text;
  private score = 0;

  constructor() {
    super('GameScene');
  }

  preload() {
    this.makeTexture('player', 32, 48, 0x4ecca3);
    this.makeTexture('platform', 200, 24, 0x6c5ce7);
    this.makeTexture('coin', 16, 16, 0xffd32a);
  }

  create() {
    this.score = 0;

    const platforms = this.physics.add.staticGroup();
    platforms.create(WIDTH / 2, HEIGHT - 12, 'platform').setScale(4, 1).refreshBody();
    platforms.create(150, 450, 'platform');
    platforms.create(650, 380, 'platform');
    platforms.create(400, 280, 'platform');
    platforms.create(120, 180, 'platform');

    this.player = this.physics.add.sprite(100, HEIGHT - 80, 'player');
    this.player.setBounce(0.1).setCollideWorldBounds(true);
    this.physics.add.collider(this.player, platforms);

    this.coins = this.physics.add.group();
    for (let i = 0; i < 10; i++) {
      const coin = this.coins.create(60 + i * 75, 0, 'coin') as Phaser.Physics.Arcade.Sprite;
      coin.setBounceY(Phaser.Math.FloatBetween(0.4, 0.8));
    }
    this.physics.add.collider(this.coins, platforms);
    this.physics.add.overlap(this.player, this.coins, (_p, c) => this.collectCoin(c as Phaser.Physics.Arcade.Sprite));

    this.scoreText = this.add.text(16, 16, 'Score: 0', { fontSize: '24px', color: '#ffffff' });
    this.add
      .text(WIDTH / 2, 16, 'Arrows to move, Up to jump', { fontSize: '16px', color: '#aaaaaa' })
      .setOrigin(0.5, 0);

    this.cursors = this.input.keyboard!.createCursorKeys();
  }

  update() {
    const speed = 200;
    if (this.cursors.left.isDown) {
      this.player.setVelocityX(-speed);
    } else if (this.cursors.right.isDown) {
      this.player.setVelocityX(speed);
    } else {
      this.player.setVelocityX(0);
    }

    if (this.cursors.up.isDown && this.player.body!.touching.down) {
      this.player.setVelocityY(-450);
    }
  }

  private collectCoin(coin: Phaser.Physics.Arcade.Sprite) {
    coin.disableBody(true, true);
    this.score += 10;
    this.scoreText.setText(`Score: ${this.score}`);

    if (this.coins.countActive(true) === 0) {
      this.add
        .text(WIDTH / 2, HEIGHT / 2, 'You win! Press R to restart', { fontSize: '32px', color: '#4ecca3' })
        .setOrigin(0.5);
      this.input.keyboard!.once('keydown-R', () => this.scene.restart());
    }
  }

  private makeTexture(key: string, w: number, h: number, color: number) {
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(color, 1).fillRect(0, 0, w, h);
    g.generateTexture(key, w, h);
    g.destroy();
  }
}
