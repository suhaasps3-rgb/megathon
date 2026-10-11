/**
 * Road network and street furniture. Units are metres, centred on the origin. The ring road
 * is the loop cars drive on; it sits outside the core buildings so no car can clip a wall.
 */
import { BOUND } from './layout.js';

export const RING_HALF = 20;
export const ROAD_WIDTH = 3;

/** Asphalt rectangles to draw. `x`/`z` is the centre, `w`/`d` the size. */
export const ROADS = Object.freeze([
  { id: 'main-ew', x: 0, z: 0, w: BOUND * 2, d: ROAD_WIDTH },
  { id: 'main-ns', x: 0, z: 0, w: ROAD_WIDTH, d: BOUND * 2 },
  { id: 'ring-w', x: -RING_HALF, z: 0, w: ROAD_WIDTH, d: RING_HALF * 2 + ROAD_WIDTH },
  { id: 'ring-e', x: RING_HALF, z: 0, w: ROAD_WIDTH, d: RING_HALF * 2 + ROAD_WIDTH },
  { id: 'ring-n', x: 0, z: -RING_HALF, w: RING_HALF * 2 + ROAD_WIDTH, d: ROAD_WIDTH },
  { id: 'ring-s', x: 0, z: RING_HALF, w: RING_HALF * 2 + ROAD_WIDTH, d: ROAD_WIDTH },
]);

/** Corners of the ring road, in driving order (clockwise seen from above). */
export const RING_LOOP = Object.freeze([
  { x: -RING_HALF, z: -RING_HALF },
  { x: RING_HALF, z: -RING_HALF },
  { x: RING_HALF, z: RING_HALF },
  { x: -RING_HALF, z: RING_HALF },
]);

const LAMP_OFFSET = 22.3; // just outside the ring road's kerb
const LAMP_SPACING = [-16, -8, 0, 8, 16];

/** Street lamps on the outer kerb of the ring road. Decorative only, so they do not block. */
export const LAMPS = Object.freeze([
  ...LAMP_SPACING.flatMap((t) => [{ x: t, z: -LAMP_OFFSET }, { x: t, z: LAMP_OFFSET }]),
  ...LAMP_SPACING.flatMap((t) => [{ x: -LAMP_OFFSET, z: t }, { x: LAMP_OFFSET, z: t }]),
]);
