export interface PlatformDef {
  x: number;
  y: number;
  /** Width in px; defaults to 200. */
  w?: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface EnemyDef extends Point {
  /** Patrol distance either side of x. */
  range: number;
  hp?: number;
}

export interface LevelDef {
  name: string;
  platforms: PlatformDef[];
  coins: Point[];
  enemies?: EnemyDef[];
  playerStart: Point;
}

export const PLATFORM_HEIGHT = 24;
export const ENEMY_SIZE = 28;
const GROUND_TOP = 576;
const GROUND_Y = 560;

/** Coin resting on top of a platform at (x, y). */
const on = (x: number, y: number): Point => ({ x, y: y - PLATFORM_HEIGHT / 2 - 10 });
const ground = (x: number): Point => ({ x, y: GROUND_Y });
/** Enemy patrolling on top of a platform at (x, y). */
const enemyOn = (x: number, y: number, range: number, hp = 1): EnemyDef => ({
  x,
  y: y - PLATFORM_HEIGHT / 2 - ENEMY_SIZE / 2,
  range,
  hp,
});
const groundEnemy = (x: number, range: number, hp = 1): EnemyDef => ({
  x,
  y: GROUND_TOP - ENEMY_SIZE / 2,
  range,
  hp,
});

export const LEVELS: LevelDef[] = [
  {
    name: 'Warm-up',
    platforms: [
      { x: 150, y: 470 },
      { x: 650, y: 400 },
      { x: 400, y: 320 },
      { x: 120, y: 200 },
    ],
    coins: [
      ground(285), ground(510),
      on(110, 470), on(190, 470),
      on(610, 400), on(690, 400),
      on(360, 320), on(440, 320),
      on(80, 200), on(160, 200),
    ],
    playerStart: { x: 400, y: 520 },
  },
  {
    name: 'Staircase',
    platforms: [
      { x: 100, y: 500 },
      { x: 300, y: 420 },
      { x: 500, y: 340 },
      { x: 700, y: 260 },
      { x: 100, y: 150 },
    ],
    coins: [
      ground(200), ground(400), ground(600),
      on(100, 500), on(300, 420), on(500, 340), on(700, 260),
      on(100, 150),
    ],
    playerStart: { x: 400, y: 520 },
  },
  {
    name: 'Wrap-around',
    platforms: [
      { x: 0, y: 450 },
      { x: 800, y: 450 },
      { x: 400, y: 400 },
      { x: 0, y: 300, w: 160 },
      { x: 800, y: 300, w: 160 },
      { x: 400, y: 220 },
    ],
    coins: [
      ground(300), ground(500),
      on(30, 450), on(770, 450),
      on(400, 400),
      on(20, 300), on(780, 300),
      on(400, 220),
    ],
    playerStart: { x: 400, y: 520 },
  },
  {
    name: 'Towers',
    platforms: [
      { x: 100, y: 450, w: 160 },
      { x: 250, y: 290, w: 160 },
      { x: 100, y: 130, w: 160 },
      { x: 700, y: 450, w: 160 },
      { x: 550, y: 290, w: 160 },
      { x: 700, y: 130, w: 160 },
    ],
    coins: [
      ground(250), ground(330), ground(470), ground(550),
      on(100, 450), on(250, 290), on(100, 130),
      on(700, 450), on(550, 290), on(700, 130),
    ],
    playerStart: { x: 400, y: 520 },
  },
  {
    name: 'Summit',
    platforms: [
      { x: 100, y: 480, w: 100 },
      { x: 300, y: 420, w: 100 },
      { x: 500, y: 480, w: 100 },
      { x: 700, y: 400, w: 100 },
      { x: 400, y: 300, w: 100 },
      { x: 250, y: 130, w: 120 },
    ],
    coins: [
      ground(200), ground(400), ground(600),
      on(100, 480), on(300, 420), on(500, 480), on(700, 400), on(400, 300),
      on(250, 130),
    ],
    playerStart: { x: 50, y: 520 },
  },
  {
    name: 'First contact',
    platforms: [
      { x: 200, y: 450 },
      { x: 600, y: 350 },
    ],
    coins: [
      ground(100), ground(700),
      on(160, 450), on(240, 450),
      on(560, 350), on(640, 350),
    ],
    enemies: [groundEnemy(400, 150)],
    playerStart: { x: 40, y: 520 },
  },
  {
    name: 'Patrol',
    platforms: [
      { x: 150, y: 470 },
      { x: 650, y: 470 },
      { x: 400, y: 330 },
      { x: 150, y: 180, w: 160 },
    ],
    coins: [
      ground(300), ground(500),
      on(90, 470), on(210, 470),
      on(590, 470), on(710, 470),
      on(340, 330), on(460, 330),
      on(150, 180),
    ],
    enemies: [enemyOn(150, 470, 60), enemyOn(650, 470, 60), enemyOn(400, 330, 60)],
    playerStart: { x: 400, y: 520 },
  },
  {
    name: 'Gauntlet',
    platforms: [
      { x: 0, y: 420 },
      { x: 800, y: 420 },
      { x: 400, y: 420 },
      { x: 200, y: 260 },
    ],
    coins: [
      ground(100), ground(700),
      on(40, 420), on(760, 420), on(400, 420),
      on(160, 260), on(240, 260),
    ],
    enemies: [groundEnemy(250, 100), groundEnemy(550, 100), enemyOn(400, 420, 60)],
    playerStart: { x: 400, y: 520 },
  },
  {
    name: 'Swarm',
    platforms: [
      { x: 150, y: 470 },
      { x: 400, y: 380 },
      { x: 650, y: 470 },
      { x: 650, y: 250 },
    ],
    coins: [
      ground(100), ground(250), ground(550), ground(700),
      on(150, 470), on(400, 380), on(650, 470), on(650, 250),
    ],
    enemies: [
      groundEnemy(175, 50),
      groundEnemy(400, 60),
      groundEnemy(625, 50),
      enemyOn(150, 470, 50),
      enemyOn(650, 470, 50),
      enemyOn(400, 380, 70),
    ],
    playerStart: { x: 40, y: 520 },
  },
  {
    name: 'Boss ledge',
    platforms: [
      { x: 150, y: 470 },
      { x: 650, y: 470 },
      { x: 400, y: 360 },
      { x: 150, y: 180, w: 240 },
    ],
    coins: [
      ground(250), ground(550),
      on(150, 470), on(650, 470),
      on(340, 360), on(460, 360),
      on(150, 180),
    ],
    enemies: [groundEnemy(400, 100), enemyOn(400, 360, 60), enemyOn(150, 180, 90, 5)],
    playerStart: { x: 60, y: 520 },
  },
];
