import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import {
  BOUND, OBSTACLES, POIS, PLAYER_RADIUS, WALK_SPEED, RUN_SPEED, JUMP_VELOCITY, GRAVITY, INTERACT_RANGE,
} from '../../neighborhood/layout.js';
import { ROADS, RING_LOOP, LAMPS } from '../../neighborhood/city.js';
import { createCar, stepCar, poseAt } from '../../neighborhood/traffic.js';
import { collides, moveWithCollision, nearestPoi } from '../../neighborhood/movement.js';
import { cameraRelativeMove, keyboardVector } from '../../neighborhood/controls.js';
import { WALKER_ROUTES, createWalker, stepWalker } from '../../neighborhood/pedestrians.js';

const CAMERA_DISTANCE = 8;
const CAMERA_MIN_DISTANCE = 1.5;
const ACCEL = 14; // how quickly the player reaches full speed
const DECEL = 9; // how quickly the player stops

/**
 * Scene and player physics. `inputRef` is owned by the parent and holds the held keys, the
 * joystick vector and the camera look angles, so every control path feeds one place.
 */
export default function World({ inputRef, paused, onNearby }) {
  // Cars still show their positions, but do not drive, for people who ask for less motion.
  const reduced = useMemo(() => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches, []);
  return (
    <Canvas shadows dpr={[1, 2]} camera={{ position: [0, 4.5, 8], fov: 50 }} aria-label="Neighborhood 3D world">
      <color attach="background" args={['#bae6fd']} />
      <fog attach="fog" args={['#cfeeff', 34, 90]} />
      <hemisphereLight args={['#e0f2fe', '#65a30d', 0.55]} />
      <ambientLight intensity={0.35} />
      <directionalLight
        position={[9, 16, 7]}
        intensity={1.15}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0005}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
      />
      <Ground />
      {OBSTACLES.map((o) => <Obstacle key={o.id} o={o} />)}
      {LAMPS.map((l, i) => <Lamp key={i} x={l.x} z={l.z} />)}
      {CAR_INDEXES.map((i) => <Car key={i} index={i} reduced={reduced} />)}
      {POIS.map((p) => <Person key={p.id} p={p} />)}
      {WALKER_ROUTES.map((r) => <Walker key={r.id} route={r} />)}
      <Player inputRef={inputRef} paused={paused} onNearby={onNearby} />
    </Canvas>
  );
}

const CAR_INDEXES = [0, 1, 2, 3];
const CAR_COLORS = ['#ef4444', '#3b82f6', '#eab308', '#f8fafc'];
const CAR_SPEED = 7;

/** Textures are made once and shared. Each use clones one to set its own repeat. */
let windowsTex = null;
const asphaltTexs = {};
function canvasTexture(size, draw) {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
function windowsTexture() {
  if (!windowsTex) {
    windowsTex = canvasTexture(64, (g, n) => {
      g.fillStyle = '#f8fafc';
      g.fillRect(0, 0, n, n);
      g.fillStyle = '#1e3a5f';
      for (const x of [8, 40]) for (const y of [8, 40]) g.fillRect(x, y, 16, 16);
      g.fillStyle = '#93c5fd';
      for (const x of [8, 40]) for (const y of [8, 40]) g.fillRect(x + 2, y + 2, 4, 4);
    });
  }
  return windowsTex;
}
/** Asphalt with one centre dash per tile. `across` runs the dash along the width instead. */
function asphaltTexture(across) {
  const key = across ? 'x' : 'z';
  if (!asphaltTexs[key]) {
    asphaltTexs[key] = canvasTexture(64, (g, n) => {
      g.fillStyle = '#334155';
      g.fillRect(0, 0, n, n);
      g.fillStyle = '#f1f5f9';
      if (across) g.fillRect(0, 30, 36, 4);
      else g.fillRect(30, 0, 4, 36);
    });
  }
  return asphaltTexs[key];
}

function Ground() {
  const roads = useMemo(() => ROADS.map((r) => {
    const across = r.w > r.d;
    const t = asphaltTexture(across).clone();
    const reps = Math.max(1, Math.round(Math.max(r.w, r.d) / 3));
    t.repeat.set(across ? reps : 1, across ? 1 : reps);
    t.needsUpdate = true;
    return { ...r, tex: t };
  }), []);
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[BOUND * 2 + 30, BOUND * 2 + 30]} />
        <meshStandardMaterial color="#86efac" />
      </mesh>
      {roads.map((r) => (
        <mesh key={r.id} rotation={[-Math.PI / 2, 0, 0]} position={[r.x, 0.012, r.z]} receiveShadow>
          <planeGeometry args={[r.w, r.d]} />
          <meshStandardMaterial map={r.tex} roughness={0.95} />
        </mesh>
      ))}
    </group>
  );
}

function Obstacle({ o }) {
  if (o.kind === 'tree') {
    return (
      <group position={[o.x, 0, o.z]}>
        <mesh position={[0, 0.7, 0]} castShadow>
          <cylinderGeometry args={[0.16, 0.22, 1.4, 8]} />
          <meshStandardMaterial color="#78350f" roughness={0.9} />
        </mesh>
        <mesh position={[0, 1.9, 0]} castShadow>
          <icosahedronGeometry args={[0.9, 1]} />
          <meshStandardMaterial color={o.color} roughness={0.85} flatShading />
        </mesh>
      </group>
    );
  }
  const windowed = o.kind !== 'stall' && o.kind !== 'cart';
  return (
    <group position={[o.x, 0, o.z]}>
      <mesh position={[0, o.h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[o.hx * 2, o.h, o.hz * 2]} />
        <WallMaterial color={o.color} windowed={windowed} hx={o.hx} h={o.h} />
      </mesh>
      <mesh position={[0, o.h + 0.12, 0]} castShadow>
        <boxGeometry args={[o.hx * 2 + 0.3, 0.24, o.hz * 2 + 0.3]} />
        <meshStandardMaterial color="#334155" roughness={0.7} />
      </mesh>
      {o.kind === 'tower' && (
        <mesh position={[0, o.h + 1, 0]} castShadow>
          <cylinderGeometry args={[0.05, 0.05, 2, 6]} />
          <meshStandardMaterial color="#64748b" metalness={0.6} roughness={0.4} />
        </mesh>
      )}
    </group>
  );
}

/** Wall with window grid. The grid repeats roughly every 2.2 m wide and 3 m tall. */
function WallMaterial({ color, windowed, hx, h }) {
  const map = useMemo(() => {
    if (!windowed) return null;
    const t = windowsTexture().clone();
    t.repeat.set(Math.max(1, Math.round((hx * 2) / 2.2)), Math.max(1, Math.round(h / 3)));
    t.needsUpdate = true;
    return t;
  }, [windowed, hx, h]);
  return <meshStandardMaterial color={color} map={map} roughness={0.75} />;
}

function Lamp({ x, z }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 1.6, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.07, 3.2, 6]} />
        <meshStandardMaterial color="#475569" metalness={0.5} roughness={0.5} />
      </mesh>
      <mesh position={[0, 3.25, 0]}>
        <sphereGeometry args={[0.2, 10, 8]} />
        <meshStandardMaterial color="#fef9c3" emissive="#fde68a" emissiveIntensity={0.9} />
      </mesh>
    </group>
  );
}

/** A saloon car: body, glass cabin, four wheels, and lights at the front (+z) and back. */
function CarBody({ color }) {
  const wheel = (x, z) => (
    <mesh position={[x, 0.3, z]} rotation={[0, 0, Math.PI / 2]} castShadow>
      <cylinderGeometry args={[0.3, 0.3, 0.22, 12]} />
      <meshStandardMaterial color="#111827" roughness={0.9} />
    </mesh>
  );
  return (
    <group>
      <mesh position={[0, 0.5, 0]} castShadow>
        <boxGeometry args={[1.1, 0.45, 2.2]} />
        <meshStandardMaterial color={color} metalness={0.35} roughness={0.35} />
      </mesh>
      <mesh position={[0, 0.92, -0.2]} castShadow>
        <boxGeometry args={[0.95, 0.4, 1.1]} />
        <meshStandardMaterial color="#0f172a" roughness={0.15} metalness={0.2} />
      </mesh>
      {wheel(-0.58, 0.7)}
      {wheel(0.58, 0.7)}
      {wheel(-0.58, -0.7)}
      {wheel(0.58, -0.7)}
      {[-0.35, 0.35].map((x) => (
        <mesh key={`h${x}`} position={[x, 0.55, 1.11]}>
          <boxGeometry args={[0.2, 0.12, 0.04]} />
          <meshStandardMaterial color="#fefce8" emissive="#fef3c7" emissiveIntensity={1.2} />
        </mesh>
      ))}
      {[-0.35, 0.35].map((x) => (
        <mesh key={`t${x}`} position={[x, 0.55, -1.11]}>
          <boxGeometry args={[0.2, 0.12, 0.04]} />
          <meshStandardMaterial color="#dc2626" emissive="#b91c1c" emissiveIntensity={0.8} />
        </mesh>
      ))}
    </group>
  );
}

/** A car on the ring road. Its position comes from the tested traffic module. */
function Car({ index, reduced }) {
  const groupRef = useRef();
  const car = useMemo(() => createCar({ start: index * 40, speed: CAR_SPEED }), [index]);
  useFrame((_, dt) => {
    if (!groupRef.current) return;
    if (!reduced) stepCar(car, Math.min(dt, 0.05));
    const p = poseAt(RING_LOOP, car.s);
    groupRef.current.position.set(p.x, 0, p.z);
    groupRef.current.rotation.y = p.heading;
  });
  const p0 = poseAt(RING_LOOP, index * 40);
  return (
    <group ref={groupRef} position={[p0.x, 0, p0.z]} rotation={[0, p0.heading, 0]}>
      <CarBody color={CAR_COLORS[index % CAR_COLORS.length]} />
    </group>
  );
}

/** A person standing at a point of interest, with a bobbing idle and a floating marker. */
function Person({ p }) {
  const groupRef = useRef();
  const ringRef = useRef();
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (groupRef.current) groupRef.current.position.y = Math.sin(t * 2 + p.x) * 0.03;
    if (ringRef.current) {
      ringRef.current.rotation.z = t * 1.5;
      ringRef.current.position.y = 2.25 + Math.sin(t * 3) * 0.12;
    }
  });
  return (
    <group position={[p.x, 0, p.z]}>
      <group ref={groupRef}>
        <Figure color={p.color} />
      </group>
      <mesh ref={ringRef} position={[0, 2.25, 0]}>
        <torusGeometry args={[0.26, 0.05, 8, 24]} />
        <meshStandardMaterial color="#facc15" emissive="#f59e0b" emissiveIntensity={0.6} />
      </mesh>
    </group>
  );
}

/** A pedestrian on a sidewalk loop. The walk cycle runs only while it is actually moving. */
function Walker({ route }) {
  const groupRef = useRef();
  const legsRef = useRef();
  const state = useMemo(() => ({ ...createWalker(route), stride: 0 }), [route]);
  useFrame((_, dt) => {
    const d = Math.min(dt, 0.05);
    stepWalker(state, route, d, OBSTACLES);
    if (state.moving) state.stride += d * route.speed * 5;
    if (groupRef.current) {
      groupRef.current.position.set(state.x, 0, state.z);
      groupRef.current.rotation.y = state.heading;
    }
    if (legsRef.current) {
      legsRef.current.rotation.x = state.moving ? Math.sin(state.stride) * 0.5 : 0;
    }
  });
  return (
    <group ref={groupRef}>
      <Figure color={route.color} legsRef={legsRef} />
    </group>
  );
}

/** Shared body for the player and NPCs. `legs` lets the player animate its stride. */
function Figure({ color, legsRef }) {
  return (
    <group>
      <mesh position={[0, 0.85, 0]} castShadow>
        <capsuleGeometry args={[0.32, 0.6, 4, 10]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0, 1.6, 0]} castShadow>
        <sphereGeometry args={[0.26, 16, 12]} />
        <meshStandardMaterial color="#fde68a" />
      </mesh>
      <group ref={legsRef}>
        <mesh position={[-0.14, 0.3, 0]} castShadow>
          <boxGeometry args={[0.16, 0.6, 0.18]} />
          <meshStandardMaterial color="#1e3a8a" />
        </mesh>
        <mesh position={[0.14, 0.3, 0]} castShadow>
          <boxGeometry args={[0.16, 0.6, 0.18]} />
          <meshStandardMaterial color="#1e3a8a" />
        </mesh>
      </group>
    </group>
  );
}

function Player({ inputRef, paused, onNearby }) {
  const groupRef = useRef();
  const legsRef = useRef();
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const s = useMemo(() => ({ x: 0, z: 0, y: 0, vx: 0, vz: 0, vy: 0, yaw: 0, stride: 0, grounded: true, near: null }), []);

  useFrame((state, dt) => {
    const d = Math.min(dt, 0.05);
    const input = inputRef.current;
    const k = input.keys;
    const frozen = pausedRef.current;

    // Keyboard and joystick add together, then are clamped so neither can exceed full tilt.
    const kb = keyboardVector((...codes) => has(k, ...codes));
    const ix = frozen ? 0 : clamp1(kb.x + input.stick.x);
    const iz = frozen ? 0 : clamp1(kb.y + input.stick.y);
    const running = has(k, 'ShiftLeft', 'ShiftRight');
    const speed = running ? RUN_SPEED : WALK_SPEED;
    const dir = cameraRelativeMove(ix, iz, input.look.yaw);
    const hasInput = Math.hypot(ix, iz) > 0;

    // Ease toward the target velocity, so starts and stops feel weighted instead of instant.
    const accel = 1 - Math.exp(-(hasInput ? ACCEL : DECEL) * d);
    s.vx += (dir.x * speed - s.vx) * accel;
    s.vz += (dir.z * speed - s.vz) * accel;

    const next = moveWithCollision(s, s.vx * d, s.vz * d, OBSTACLES, PLAYER_RADIUS, BOUND);
    // A blocked axis stops dead, so the character does not keep pushing into a wall.
    if (next.x === s.x) s.vx = 0;
    if (next.z === s.z) s.vz = 0;
    s.x = next.x;
    s.z = next.z;

    const speedNow = Math.hypot(s.vx, s.vz);
    const moving = speedNow > 0.05;
    if (moving) {
      s.yaw = Math.atan2(s.vx, s.vz);
      s.stride += d * speedNow * 1.4;
    }

    if (!frozen && s.grounded && k.has('Space')) {
      s.vy = JUMP_VELOCITY;
      s.grounded = false;
      k.delete('Space'); // one jump per press; holding Space does not keep bouncing
    }
    s.vy -= GRAVITY * d;
    s.y += s.vy * d;
    if (s.y <= 0) {
      s.y = 0;
      s.vy = 0;
      s.grounded = true;
    }

    if (groupRef.current) {
      groupRef.current.position.set(s.x, s.y, s.z);
      groupRef.current.rotation.y = s.yaw;
    }
    if (legsRef.current) {
      legsRef.current.rotation.x = moving && s.grounded ? Math.sin(s.stride) * 0.6 : 0;
    }

    // Orbit camera: it sits on the ray set by the player's look angles, pulled in when a wall
    // is between it and the player, so it never sits inside a building.
    const { yaw, pitch } = input.look;
    const ux = Math.sin(yaw) * Math.cos(pitch);
    const uz = Math.cos(yaw) * Math.cos(pitch);
    let dist = CAMERA_DISTANCE;
    while (dist > CAMERA_MIN_DISTANCE && collides(s.x + ux * dist, s.z + uz * dist, OBSTACLES, 0.3)) dist -= 0.5;

    const cam = state.camera;
    const f = 1 - Math.exp(-6 * d);
    cam.position.x += (s.x + ux * dist - cam.position.x) * f;
    cam.position.y += (s.y + 1 + Math.sin(pitch) * dist - cam.position.y) * f;
    cam.position.z += (s.z + uz * dist - cam.position.z) * f;
    cam.lookAt(s.x, 1 + s.y, s.z);

    const near = nearestPoi(s, POIS, INTERACT_RANGE);
    const id = near ? near.id : null;
    if (id !== s.near) {
      s.near = id;
      onNearby(id);
    }
  });

  return (
    <group ref={groupRef}>
      <Figure color="#2563eb" legsRef={legsRef} />
    </group>
  );
}

const clamp1 = (v) => Math.max(-1, Math.min(1, v));

function has(set, ...codes) {
  return codes.some((c) => set.has(c));
}
