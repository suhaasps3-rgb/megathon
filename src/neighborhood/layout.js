/** Fixed world layout. Units are metres; the ground is a square centred on the origin. */
export const BOUND = 15;
export const PLAYER_RADIUS = 0.45;
export const WALK_SPEED = 4;
export const RUN_SPEED = 7.5;
export const JUMP_VELOCITY = 6.2;
export const GRAVITY = 18;
/** How close (in metres) the player must stand to a person or place to interact. */
export const INTERACT_RANGE = 2.2;

/** Axis-aligned boxes the player cannot walk through. `hx`/`hz` are half-sizes. */
export const OBSTACLES = [
  { id: 'home', x: -7, z: 6, hx: 2.5, hz: 2, h: 3, color: '#fb7185', kind: 'house' },
  { id: 'bank-building', x: 0, z: -9.5, hx: 2.6, hz: 1.6, h: 4, color: '#60a5fa', kind: 'bank' },
  { id: 'market', x: -8, z: -6, hx: 2.2, hz: 1.5, h: 2.6, color: '#f59e0b', kind: 'stall' },
  { id: 'cycle-mart', x: 8, z: -6, hx: 2.4, hz: 1.6, h: 3.2, color: '#34d399', kind: 'shop' },
  { id: 'chai-cart', x: -3, z: 2.3, hx: 1, hz: 0.7, h: 1.4, color: '#a78bfa', kind: 'cart' },
  { id: 'flat-east', x: 12, z: 4, hx: 2, hz: 2, h: 5, color: '#f472b6', kind: 'flat' },
  { id: 'flat-west', x: -13, z: -1, hx: 2, hz: 2.5, h: 4, color: '#facc15', kind: 'flat' },
  { id: 'store', x: 0, z: 13, hx: 2, hz: 1.2, h: 2.6, color: '#fb923c', kind: 'shop' },
  { id: 'tree-1', x: 4, z: 2, hx: 0.4, hz: 0.4, h: 2.2, color: '#16a34a', kind: 'tree' },
  { id: 'tree-2', x: -5, z: -1, hx: 0.4, hz: 0.4, h: 2.2, color: '#16a34a', kind: 'tree' },
  { id: 'tree-3', x: 11, z: -1.5, hx: 0.4, hz: 0.4, h: 2.2, color: '#16a34a', kind: 'tree' },
];

/** Places the player can talk to or use. `x`/`z` is where the player stands to interact. */
export const POIS = [
  { id: 'ravi', label: 'Ravi', place: 'Gully Market', x: -8, z: -3.4, color: '#f97316' },
  { id: 'cycle', label: 'Cycle Mart', place: 'Bike shop', x: 8, z: -3.4, color: '#10b981' },
  { id: 'bank', label: 'ATM', place: 'Bank', x: 0, z: -7.1, color: '#3b82f6' },
  { id: 'chai', label: 'Chaiwala', place: 'Chai cart', x: -3, z: 3.6, color: '#8b5cf6' },
  { id: 'store', label: 'Corner Store', place: 'Groceries', x: 0, z: 10.4, color: '#f97316' },
];
