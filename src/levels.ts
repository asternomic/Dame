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

export interface LevelDef {
  name: string;
  platforms: PlatformDef[];
  coins: Point[];
  playerStart: Point;
}

export const PLATFORM_HEIGHT = 24;
const GROUND_Y = 560;

/** Coin resting on top of a platform at (x, y). */
const on = (x: number, y: number): Point => ({ x, y: y - PLATFORM_HEIGHT / 2 - 10 });
const ground = (x: number): Point => ({ x, y: GROUND_Y });

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
];
