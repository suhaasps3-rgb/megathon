import React, { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import {
  BOUND, OBSTACLES, POIS, PLAYER_RADIUS, WALK_SPEED, RUN_SPEED, JUMP_VELOCITY, GRAVITY, INTERACT_RANGE,
} from '../../neighborhood/layout.js';
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
  return (
    <Canvas shadows dpr={[1, 2]} camera={{ position: [0, 4.5, 8], fov: 50 }} aria-label="Neighborhood 3D world">
      <color attach="background" args={['#bae6fd']} />
      <ambientLight intensity={0.7} />
      <directionalLight
        position={[8, 14, 6]}
        intensity={1.1}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
      />
      <Ground />
      {OBSTACLES.map((o) => <Obstacle key={o.id} o={o} />)}
      {POIS.map((p) => <Person key={p.id} p={p} />)}
      {WALKER_ROUTES.map((r) => <Walker key={r.id} route={r} />)}
      <Player inputRef={inputRef} paused={paused} onNearby={onNearby} />
    </Canvas>
  );
}

function Ground() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[BOUND * 2 + 6, BOUND * 2 + 6]} />
        <meshStandardMaterial color="#86efac" />
      </mesh>
      {/* Two crossing roads, slightly raised so they show against the grass. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} receiveShadow>
        <planeGeometry args={[BOUND * 2, 3]} />
        <meshStandardMaterial color="#cbd5e1" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} receiveShadow>
        <planeGeometry args={[3, BOUND * 2]} />
        <meshStandardMaterial color="#cbd5e1" />
      </mesh>
    </group>
  );
}

function Obstacle({ o }) {
  if (o.kind === 'tree') {
    return (
      <group position={[o.x, 0, o.z]}>
        <mesh position={[0, 0.7, 0]} castShadow>
          <cylinderGeometry args={[0.18, 0.22, 1.4, 8]} />
          <meshStandardMaterial color="#92400e" />
        </mesh>
        <mesh position={[0, 1.9, 0]} castShadow>
          <sphereGeometry args={[0.85, 16, 12]} />
          <meshStandardMaterial color={o.color} />
        </mesh>
      </group>
    );
  }
  return (
    <group position={[o.x, 0, o.z]}>
      <mesh position={[0, o.h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[o.hx * 2, o.h, o.hz * 2]} />
        <meshStandardMaterial color={o.color} />
      </mesh>
      <mesh position={[0, o.h + 0.15, 0]} castShadow>
        <boxGeometry args={[o.hx * 2 + 0.3, 0.3, o.hz * 2 + 0.3]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>
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
