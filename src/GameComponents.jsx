import { useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Html, Stars } from "@react-three/drei";
import * as THREE from "three";
import { useGameStore, useSaveStore } from "./store";
import { targetPosition } from "./game";
import { initAudio, playFeedback } from "./audio";

function worldTime(clock) {
  const s = useGameStore.getState();
  return ["playing", "paused", "result"].includes(s.screen)
    ? s.game.time
    : clock.elapsedTime;
}

function useSceneViewport() {
  const size = useThree((s) => s.size);
  const zoom =
    size.width < 650
      ? size.width / 10
      : Math.min(size.width / 20, size.height / 12);
  // Derive from the same zoom as GameCamera: cached R3F viewport dimensions
  // can lag one resize behind changes to an orthographic camera's zoom.
  return { width: size.width / zoom, height: size.height / zoom };
}

function playfield(viewport) {
  return {
    x: Math.min(viewport.width * 0.39, 7.1),
    y: Math.min(viewport.height * 0.265, viewport.width < 12 ? 5.2 : 3.4),
  };
}

function Ball({
  position = [0, 0, 0],
  scale = 1,
  color,
  roughness = 0.4,
  ...props
}) {
  return (
    <mesh position={position} scale={scale} {...props}>
      <sphereGeometry args={[1, 24, 16]} />
      <meshStandardMaterial color={color} roughness={roughness} />
    </mesh>
  );
}

export function Bobo({
  color = "#ffd36d",
  variant = 0,
  happy = false,
  animate = true,
}) {
  const ref = useRef();
  const eyes = useRef();
  useFrame(({ clock }) => {
    if (!ref.current || !animate) return;
    const t = worldTime(clock);
    const reduced = useSaveStore.getState().reducedMotion;
    ref.current.rotation.z = reduced
      ? 0
      : Math.sin(t * 2.4 + variant) * (happy ? 0.17 : 0.055);
    ref.current.position.y = reduced
      ? 0
      : Math.sin(t * 3 + variant) * (happy ? 0.1 : 0.035);
    ref.current.scale.y = 1 + (reduced ? 0 : Math.sin(t * 3) * 0.025);
    if (eyes.current)
      eyes.current.scale.y = Math.sin(t * 1.1 + variant * 2) > 0.992 ? 0.15 : 1;
  });
  return (
    <group ref={ref}>
      <Ball position={[0, -0.19, 0]} scale={[0.4, 0.44, 0.32]} color={color} />
      <Ball
        position={[0, 0.24, 0.03]}
        scale={[0.43, 0.39, 0.36]}
        color={color}
      />
      <Ball
        position={[0, -0.19, 0.25]}
        scale={[0.25, 0.25, 0.105]}
        color="#fff0cc"
      />
      {[-1, 1].map((side) => (
        <group key={side}>
          <Ball
            position={[side * 0.27, -0.53, 0.08]}
            scale={[0.19, 0.11, 0.23]}
            color={color}
          />
          <Ball
            position={[side * 0.44, -0.12, 0.03]}
            scale={[0.13, 0.21, 0.14]}
            rotation={[0, 0, side * (happy ? -0.85 : 0.45)]}
            color={color}
          />
          {variant % 2 === 0 ? (
            <mesh
              position={[side * 0.25, 0.61, 0]}
              rotation={[0, 0, side * -0.2]}
            >
              <coneGeometry args={[0.12, 0.3, 12]} />
              <meshStandardMaterial
                color={variant === 2 ? "#bd99ff" : "#ff9c75"}
              />
            </mesh>
          ) : (
            <Ball
              position={[side * 0.24, 0.67, 0]}
              scale={[0.12, 0.35, 0.13]}
              color={color}
            />
          )}
          <Ball
            position={[side * 0.28, 0.15, 0.325]}
            scale={[0.085, 0.045, 0.025]}
            color="#ff9caa"
          />
        </group>
      ))}
      <group ref={eyes} position={[0, 0.28, 0.34]}>
        {[-1, 1].map((side) => (
          <group key={side} position={[side * 0.155, 0, 0]}>
            <Ball scale={[0.068, 0.095, 0.047]} color="#26304b" />
            <Ball
              position={[-0.017, 0.034, 0.043]}
              scale={0.022}
              color="#ffffff"
            />
          </group>
        ))}
      </group>
      <mesh position={[0, 0.12, 0.377]} rotation={[0, 0, Math.PI]}>
        <torusGeometry args={[0.065, 0.016, 8, 16, Math.PI]} />
        <meshBasicMaterial color="#493143" />
      </mesh>
      <mesh position={[0, -0.17, 0.365]}>
        <octahedronGeometry args={[0.075]} />
        <meshStandardMaterial
          color="#7deede"
          emissive="#7deede"
          emissiveIntensity={0.3}
        />
      </mesh>
      <Ball
        position={[0, 0.0, -0.3]}
        scale={[0.28, 0.34, 0.16]}
        color="#7e86be"
      />
      <mesh position={[0, -0.03, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.36, 0.025, 8, 40]} />
        <meshStandardMaterial color="#cefcff" metalness={0.3} roughness={0.2} />
      </mesh>
    </group>
  );
}

export function SpaceBackdrop() {
  const orbit = useRef();
  const viewport = useSceneViewport();
  const screen = useGameStore((s) => s.screen);
  const starPositions = useMemo(
    () =>
      new Float32Array(
        Array.from({ length: 100 }, (_, i) => {
          const x = Math.sin(i * 127.1 + 2.7) * 43758.5453;
          const y = Math.sin(i * 269.5 + 4.9) * 18371.127;
          return [
            (x - Math.floor(x) - 0.5) * viewport.width,
            (y - Math.floor(y) - 0.5) * viewport.height,
            -12,
          ];
        }).flat(),
      ),
    [viewport.width, viewport.height],
  );
  useFrame(({ clock }) => {
    if (orbit.current) orbit.current.rotation.z = worldTime(clock) * 0.025;
  });
  return (
    <>
      <ambientLight intensity={1.5} color="#dbe9ff" />
      <directionalLight position={[4, 8, 12]} intensity={2.3} color="#fff2d8" />
      <directionalLight position={[-8, 0, 4]} intensity={1.3} color="#a9a4ff" />
      <Stars
        radius={60}
        depth={20}
        count={650}
        factor={2.3}
        saturation={0.4}
        fade
        speed={0}
      />
      <points>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[starPositions, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.027}
          color="#e4eaff"
          transparent
          opacity={0.45}
          sizeAttenuation
        />
      </points>
      <group
        position={[viewport.width * 0.4, viewport.height * 0.31, -9]}
        scale={viewport.width < 12 ? 0.68 : 1}
        rotation={[0.4, -0.3, -0.4]}
      >
        <Ball scale={1.8} color="#7772bd" />
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[2.55, 0.15, 12, 70]} />
          <meshStandardMaterial color="#dbb6e9" />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[2.9, 0.035, 8, 70]} />
          <meshBasicMaterial color="#8587c5" />
        </mesh>
      </group>
      <group
        ref={orbit}
        position={[
          -viewport.width * 0.47,
          viewport.height * (screen === "home" ? 0.2 : -0.17),
          -8,
        ]}
        scale={0.65}
      >
        <Ball scale={0.6} color="#6fbbc3" />
        <mesh rotation={[0.6, 0.4, 0.8]}>
          <torusGeometry args={[1, 0.06, 8, 40]} />
          <meshStandardMaterial color="#a2f8df" />
        </mesh>
      </group>
      <mesh
        position={[0, -viewport.height * 0.5 - 2.7, -6]}
        scale={[1.8, 1, 1]}
      >
        <sphereGeometry args={[4.3, 48, 24]} />
        <meshStandardMaterial color="#414d89" />
      </mesh>
      <mesh
        position={[0, -viewport.height * 0.5 - 2.68, -5.95]}
        scale={[1.8, 1, 1]}
      >
        <torusGeometry args={[4.3, 0.035, 8, 90]} />
        <meshBasicMaterial color="#88e8da" />
      </mesh>
    </>
  );
}

export function BubbleTarget({ target }) {
  const ref = useRef();
  const ring = useRef();
  const viewport = useSceneViewport();
  const [hover, setHover] = useState(false);
  const field = playfield(viewport);
  const radius = Math.min(0.96, viewport.width * 0.095);
  const isCore = target.kind === "core";
  const isRainbow = target.kind === "rainbow";
  const isArmor = target.kind === "armored" && target.hp > 1;
  const satellite = target.kind === "satellite";
  const color = isRainbow
    ? "#e3b2ff"
    : isArmor
      ? "#ffcf80"
      : satellite
        ? target.color
        : "#99f8e9";
  useFrame(() => {
    if (!ref.current) return;
    const g = useGameStore.getState().game;
    const p = targetPosition(target, g);
    ref.current.position.set(p.x * field.x, p.y * field.y + 0.15, 1);
    const age = g.time - target.bornAt;
    const hitAge = g.time - target.hitAt;
    const entry = Math.min(1, 0.3 + age * 5);
    const reduced = useSaveStore.getState().reducedMotion;
    const bump =
      !reduced && hitAge < 0.25
        ? Math.sin((hitAge * Math.PI) / 0.25) * 0.22
        : 0;
    const s = radius * (hover ? 1.07 : 1) * (reduced ? 1 : entry);
    ref.current.scale.set(s * (1 + bump), s * (1 - bump), s);
    if (ring.current && !reduced)
      ring.current.rotation.z = g.time * (isRainbow ? 1.3 : 0.35);
  });
  const hit = (e) => {
    e.stopPropagation();
    initAudio();
    useGameStore.getState().hit(target.id);
  };
  return (
    <group
      ref={ref}
      onPointerDown={hit}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHover(true);
        if (e.buttons === 1 && target.kind !== "armored") hit(e);
      }}
      onPointerOut={() => setHover(false)}
    >
      <mesh userData={{ targetId: target.id }}>
        <sphereGeometry args={[1.08, 24, 16]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      {isCore ? (
        <>
          <Ball scale={[0.8, 0.64, 0.7]} color="#ffb28c" />
          <Ball
            position={[-0.22, 0.25, 0.62]}
            scale={[0.2, 0.12, 0.08]}
            color="#ffe6d4"
          />
        </>
      ) : satellite ? (
        <mesh rotation={[0, 0, 0.3]}>
          <octahedronGeometry args={[0.63]} />
          <meshStandardMaterial
            color={target.color}
            emissive={target.color}
            emissiveIntensity={0.3}
          />
        </mesh>
      ) : (
        <group scale={0.94}>
          <Bobo color={target.color} variant={target.serial % 4} />
        </group>
      )}
      {!isCore && (
        <mesh renderOrder={2}>
          <sphereGeometry args={[0.99, 32, 24]} />
          <meshStandardMaterial
            color={color}
            transparent
            opacity={0.13}
            metalness={0.15}
            roughness={0.2}
            depthWrite={false}
          />
        </mesh>
      )}
      <group ref={ring}>
        <mesh>
          <torusGeometry args={[1, 0.025, 8, 64]} />
          <meshBasicMaterial color={color} />
        </mesh>
        <mesh rotation={[0, 0, 0.5]}>
          <torusGeometry args={[0.9, 0.035, 8, 32, 0.9]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.85} />
        </mesh>
        {isRainbow &&
          [0, 1, 2, 3, 4, 5].map((i) => (
            <Ball
              key={i}
              position={[
                Math.cos((i * Math.PI) / 3) * 1.04,
                Math.sin((i * Math.PI) / 3) * 1.04,
                0.03,
              ]}
              scale={0.08}
              color={
                [
                  "#ff93b9",
                  "#ffd16d",
                  "#a2eab3",
                  "#77ddea",
                  "#abafff",
                  "#de9beb",
                ][i]
              }
            />
          ))}
        {isArmor && (
          <mesh rotation={[0.6, 0.4, -0.5]}>
            <torusGeometry args={[1.07, 0.06, 8, 40]} />
            <meshStandardMaterial
              color="#ffd183"
              metalness={0.45}
              roughness={0.3}
            />
          </mesh>
        )}
      </group>
      <Ball
        position={[-0.48, 0.58, 0.64]}
        scale={[0.17, 0.085, 0.035]}
        rotation={[0, 0, 0.5]}
        color="#ffffff"
      />
      <Html
        center
        position={[0, -1.38, 0.1]}
        style={{ pointerEvents: "none" }}
        zIndexRange={[2, 0]}
      >
        <span
          className={`target-label ${isRainbow ? "rainbow-label" : ""}`}
          data-target-id={target.id}
        >
          {isCore
            ? "戳鼻子！"
            : satellite
              ? "點亮衛星"
              : isRainbow
                ? "✦ 彩虹連鎖"
                : isArmor
                  ? "雙層 · 點兩下"
                  : target.hp === 1 && target.kind === "armored"
                    ? "再一下！"
                    : ""}
        </span>
      </Html>
    </group>
  );
}

function PopEffect({ effect }) {
  const ref = useRef();
  const rescued = useRef();
  const viewport = useSceneViewport();
  const field = playfield(viewport);
  const reduced = useSaveStore((s) => s.reducedMotion);
  useFrame(() => {
    const age = useGameStore.getState().game.time - effect.at;
    if (!ref.current) return;
    if (rescued.current) {
      rescued.current.position.y = -0.1 + age * (reduced ? 0.15 : 1.4);
      rescued.current.rotation.z = reduced ? 0 : Math.sin(age * 8) * 0.18;
      rescued.current.scale.setScalar(
        0.6 * Math.max(0, Math.min(1, (1.15 - age) * 3)),
      );
    }
    ref.current.children.forEach((child, i) => {
      if (i === 0) {
        child.scale.setScalar(1 + age * (reduced ? 0.5 : 3));
        child.material.opacity = Math.max(0, 1 - age * 2);
      } else if (i <= 8) {
        const angle = (i * Math.PI) / 4;
        const distance = age * (reduced ? 0.6 : 2.7);
        child.position.set(
          Math.cos(angle) * distance,
          Math.sin(angle) * distance - age * age * 1.5,
          0,
        );
        child.scale.setScalar(Math.max(0, 0.09 * (1 - age)));
      }
    });
  });
  return (
    <group position={[effect.x * field.x, effect.y * field.y + 0.15, 2]}>
      <group ref={ref}>
        <mesh>
          <torusGeometry args={[0.55, 0.035, 8, 32]} />
          <meshBasicMaterial color={effect.color} transparent />
        </mesh>
        {Array.from({ length: 8 }, (_, i) => (
          <mesh key={i}>
            <octahedronGeometry args={[1]} />
            <meshBasicMaterial color={i % 2 ? effect.color : "#fff2bc"} />
          </mesh>
        ))}
      </group>
      {effect.kind === "pop" && (
        <group ref={rescued} scale={0.6} position={[0, -0.1, 0]}>
          <Bobo color={effect.color} happy />
        </group>
      )}
      <Html
        center
        position={[0, 0.9, 0]}
        style={{ pointerEvents: "none" }}
        zIndexRange={[4, 0]}
      >
        <span className="pop-number">{effect.text}</span>
      </Html>
    </group>
  );
}

export function GameEffects() {
  const effects = useGameStore((s) => s.game.effects);
  const shot = useGameStore((s) => s.game.shot);
  const beam = useRef();
  const viewport = useSceneViewport();
  const field = playfield(viewport);
  const axis = useMemo(() => new THREE.Vector3(0, 1, 0), []);
  const direction = useMemo(() => new THREE.Vector3(), []);
  useFrame(() => {
    if (!beam.current || !shot) return;
    const age = useGameStore.getState().game.time - shot.at;
    beam.current.visible = age < 0.16;
    const from = new THREE.Vector3(0.7, -viewport.height * 0.42, 3);
    const to = new THREE.Vector3(shot.x * field.x, shot.y * field.y + 0.15, 1);
    direction.subVectors(to, from);
    beam.current.position.copy(from).add(to).multiplyScalar(0.5);
    beam.current.quaternion.setFromUnitVectors(
      axis,
      direction.clone().normalize(),
    );
    beam.current.scale.set(1, direction.length(), 1);
  });
  return (
    <>
      {effects.map((e) => (
        <PopEffect key={e.id} effect={e} />
      ))}
      <mesh ref={beam} visible={false}>
        <cylinderGeometry args={[0.026, 0.055, 1, 8]} />
        <meshBasicMaterial color="#bcfff1" transparent opacity={0.8} />
      </mesh>
      <group
        position={[0.7, -viewport.height * 0.44, 3]}
        rotation={[0.2, 0, -0.28]}
      >
        <mesh>
          <capsuleGeometry args={[0.17, 0.55, 6, 16]} />
          <meshStandardMaterial
            color="#bbb4f5"
            metalness={0.3}
            roughness={0.3}
          />
        </mesh>
        <mesh position={[0, 0.35, 0]}>
          <torusGeometry args={[0.22, 0.07, 10, 24]} />
          <meshStandardMaterial
            color="#8ffff0"
            emissive="#8ffff0"
            emissiveIntensity={0.45}
          />
        </mesh>
        <Ball position={[0, 0.38, 0.02]} scale={0.12} color="#ecfffb" />
      </group>
    </>
  );
}

export function Captain() {
  const ref = useRef();
  const open = useGameStore((s) => s.game.bossOpen);
  const bossHits = useGameStore((s) => s.game.bossHits);
  const viewport = useSceneViewport();
  const scale = Math.min(1.7, viewport.width * 0.14);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = worldTime(clock);
    const reduced = useSaveStore.getState().reducedMotion;
    ref.current.rotation.z = reduced
      ? 0
      : Math.sin(t * 2) * (open ? 0.09 : 0.025);
  });
  return (
    <group position={[0, 0.15, -0.5]} scale={scale} ref={ref}>
      {[-1, -0.5, 0, 0.5, 1].map((x, i) => (
        <Ball
          key={i}
          position={[x * 0.7, Math.sin(i) * 0.22, 0]}
          scale={[0.6, 0.57, 0.4]}
          color={open ? "#c6a8df" : "#828cc0"}
        />
      ))}
      <Ball
        position={[0, -0.4, 0.05]}
        scale={[1.15, 0.4, 0.35]}
        color={open ? "#b3a9e2" : "#7785b6"}
      />
      {[-1, 1].map((side) => (
        <group key={side} position={[side * 0.38, 0.08, 0.41]}>
          <Ball scale={[0.19, 0.23, 0.08]} color="#fff7ef" />
          <Ball
            position={[side * -0.035, 0, 0.075]}
            scale={[0.075, 0.1, 0.04]}
            color="#30304e"
          />
          <mesh
            position={[0, 0.29, 0]}
            rotation={[0, 0, side * (open ? -0.2 : 0.22)]}
          >
            <capsuleGeometry args={[0.035, 0.25, 4, 8]} />
            <meshStandardMaterial color="#43466c" />
          </mesh>
        </group>
      ))}
      {!open && (
        <Ball
          position={[0, -0.06, 0.55]}
          scale={[0.21, 0.15, 0.13]}
          color="#ffbd93"
        />
      )}
      <mesh position={[0, -0.3, 0.43]} rotation={[0, 0, Math.PI]}>
        <torusGeometry args={[0.18, 0.035, 8, 20, Math.PI]} />
        <meshStandardMaterial color="#423851" />
      </mesh>
      <mesh position={[0, 0.73, 0]} rotation={[0, 0, -0.15]}>
        <cylinderGeometry args={[0.25, 0.48, 0.35, 5]} />
        <meshStandardMaterial
          color="#ffce76"
          metalness={0.35}
          roughness={0.4}
        />
      </mesh>
      <Html center position={[0, -1, 0]} style={{ pointerEvents: "none" }}>
        <span className="boss-hearts">
          {Array.from({ length: 3 }, (_, i) => (
            <i key={i} className={i < bossHits ? "lit" : ""}>
              ♥
            </i>
          ))}
        </span>
      </Html>
    </group>
  );
}

export function Pinwheel({ kind = "pinwheel" }) {
  const ref = useRef();
  useFrame(({ clock }) => {
    if (ref.current && !useSaveStore.getState().reducedMotion)
      ref.current.rotation.z =
        worldTime(clock) * (kind === "flower" ? 0.4 : 1.5);
  });
  if (kind === "rocket")
    return (
      <group rotation={[0, 0, -0.25]}>
        <mesh>
          <capsuleGeometry args={[0.18, 0.6, 6, 16]} />
          <meshStandardMaterial color="#f6e9ff" />
        </mesh>
        <mesh position={[0, 0.55, 0]}>
          <coneGeometry args={[0.2, 0.35, 16]} />
          <meshStandardMaterial color="#ff98b8" />
        </mesh>
        <Ball position={[0, 0.08, 0.17]} scale={0.1} color="#90e6e4" />
        <mesh position={[0, -0.6, 0]} rotation={[0, 0, Math.PI]}>
          <coneGeometry args={[0.14, 0.4, 12]} />
          <meshBasicMaterial color="#ffcb7b" />
        </mesh>
      </group>
    );
  if (kind === "crown")
    return (
      <mesh rotation={[0, 0.4, 0.2]}>
        <cylinderGeometry args={[0.4, 0.3, 0.4, 5, 1, true]} />
        <meshStandardMaterial
          color="#ffd271"
          metalness={0.45}
          roughness={0.3}
        />
      </mesh>
    );
  return (
    <group>
      <mesh position={[0, -0.3, 0]}>
        <cylinderGeometry args={[0.035, 0.045, 0.9, 8]} />
        <meshStandardMaterial color="#e9d4ba" />
      </mesh>
      <group ref={ref} position={[0, 0.15, 0.03]}>
        {[0, 1, 2, 3, ...(kind === "flower" ? [4, 5] : [])].map((i, _, arr) => (
          <group key={i} rotation={[0, 0, (i * Math.PI * 2) / arr.length]}>
            <Ball
              position={[0.2, 0.17, 0]}
              scale={[0.24, 0.11, 0.06]}
              color={
                [
                  "#ffabbb",
                  "#ffe49b",
                  "#a8eccc",
                  "#b6b3ff",
                  "#ffabbb",
                  "#ffe49b",
                ][i]
              }
            />
          </group>
        ))}
        <Ball scale={0.08} color="#fff3c6" />
      </group>
    </group>
  );
}

export function Island3D({ preview = false }) {
  const slots = useSaveStore((s) => s.slots);
  const creatures = useSaveStore((s) => s.creatureIds);
  const selected = useGameStore((s) => s.selectedDecoration);
  const viewport = useSceneViewport();
  const [dance, setDance] = useState(0);
  const island = useRef();
  const scale = Math.min(
    preview ? 1.3 : 1.55,
    viewport.width / (preview ? 7.5 : 9),
  );
  useFrame(({ clock }) => {
    if (island.current)
      island.current.position.y =
        -0.5 +
        (useSaveStore.getState().reducedMotion
          ? 0
          : Math.sin(clock.elapsedTime) * 0.07);
  });
  const tapCreature = (e) => {
    e.stopPropagation();
    initAudio();
    playFeedback("chain", 5);
    setDance((n) => n + 1);
  };
  return (
    <group
      ref={island}
      scale={scale}
      position={[preview && viewport.width > 13 ? 3.8 : 0, -0.5, 0]}
    >
      <group rotation={[0.28, 0, 0]}>
        <mesh position={[0, -1.08, 0]}>
          <cylinderGeometry args={[2.75, 2.1, 0.55, 64]} />
          <meshStandardMaterial color="#696ca4" />
        </mesh>
        <mesh position={[0, -0.79, 0]}>
          <cylinderGeometry args={[2.78, 2.78, 0.09, 64]} />
          <meshStandardMaterial color="#a9dbc9" />
        </mesh>
        <mesh position={[0, -0.94, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[2.76, 0.035, 8, 70]} />
          <meshBasicMaterial color="#88fff0" />
        </mesh>
        {[-1, 1].map((i) => (
          <mesh key={i} position={[i * 1.5, -1.6, 0]}>
            <coneGeometry args={[0.28, 0.65, 6]} />
            <meshBasicMaterial color="#80cfff" transparent opacity={0.5} />
          </mesh>
        ))}
      </group>
      <group
        onPointerDown={tapCreature}
        position={[0, -0.08, 0.6]}
        scale={1.35}
      >
        <Bobo key={dance} happy={dance > 0 || preview} />
      </group>
      {(preview || creatures.includes("tangtang")) && (
        <group
          onPointerDown={tapCreature}
          position={[-1.35, -0.16, 0.15]}
          scale={0.95}
        >
          <Bobo color="#ffa8c7" variant={1} happy={dance > 0} />
        </group>
      )}
      {(preview || creatures.includes("dongdong")) && (
        <group
          onPointerDown={tapCreature}
          position={[1.4, -0.16, 0.12]}
          scale={1}
        >
          <Bobo color="#91ead7" variant={2} happy={dance > 0} />
        </group>
      )}
      {[0, 1, 2, 3].map((slot) => {
        const x = [-1.9, -0.67, 0.67, 1.9][slot];
        return (
          <group
            key={slot}
            position={[x, -0.65, 1.35]}
            onPointerDown={(e) => {
              e.stopPropagation();
              if (!preview) useGameStore.getState().decorate(slot);
            }}
          >
            <mesh rotation={[0.28, 0, 0]}>
              <cylinderGeometry args={[0.32, 0.32, 0.05, 32]} />
              <meshStandardMaterial color={selected ? "#ffe3a2" : "#78b5b0"} />
            </mesh>
            {(slots[slot] || (preview && slot === 0)) && (
              <group position={[0, 0.66, 0]} scale={0.75}>
                <Pinwheel kind={slots[slot] || "pinwheel"} />
              </group>
            )}
            {!preview && (
              <Html
                center
                position={[0, -0.3, 0.1]}
                style={{ pointerEvents: "none" }}
              >
                <span className={`slot-label ${selected ? "selectable" : ""}`}>
                  {slot + 1}
                </span>
              </Html>
            )}
          </group>
        );
      })}
      {dance > 0 && (
        <Html
          key={dance}
          center
          position={[0, 1.2, 1]}
          style={{ pointerEvents: "none" }}
        >
          <span className="creature-speech">啵！一起跳舞！♪</span>
        </Html>
      )}
    </group>
  );
}
