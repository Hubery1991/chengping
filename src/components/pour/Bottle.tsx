import { useLayoutEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group, Mesh } from "three";
import {
  LIQUID_BOTTOM,
  LIQUID_TOP,
  MAX_TILT,
  MOUTH_Y,
  PIVOT_Y,
  RADIAL,
  bottleGeometry,
  brassDeepMaterial,
  brassMaterial,
  glassMaterial,
  hintMaterial,
  lipGeometry,
  liquidGeometry,
  liquidMaterials,
  meniscusMaterials,
  ringGeometry,
  ringMaterial,
} from "@/game/materials";
import { displayLayers } from "@/game/logic";
import { useGame } from "@/game/store";
import { flowEnvelope, mouths, stage, tiltEnvelope, visual } from "@/game/visual";

const SLOTS = 4;

export function Bottle({ index }: { index: number }) {
  const outer = useRef<Group>(null);
  const tilt = useRef<Group>(null);
  const mouth = useRef<Group>(null);
  const liquids = useRef<(Mesh | null)[]>([]);
  const meniscus = useRef<Mesh>(null);
  const ring = useRef<Mesh>(null);
  const lift = useRef(0);

  useLayoutEffect(() => {
    mouths[index] = mouth.current;
    return () => {
      if (mouths[index] === mouth.current) mouths[index] = null;
    };
  }, [index]);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const outerG = outer.current;
    const tiltG = tilt.current;
    if (!outerG || !tiltG) return;
    const st = useGame.getState();
    const rest = stage.positions[index] ?? [0, 0, 0];
    const pour = visual.pour;
    const pouring = pour.active && pour.from === index;
    const env = pouring ? tiltEnvelope(pour.t) : 0;
    const wantLift = !pouring && st.phase === "play" && st.selected === index ? 0.32 : 0;
    lift.current += (wantLift - lift.current) * (1 - Math.exp(-12 * dt));
    const bob =
      pouring || (visual.shake.index === index && visual.shake.life > 0)
        ? 0
        : Math.sin(visual.clock * 1.15 + index * 0.8) * 0.01;

    if (pouring) {
      const dest = stage.positions[pour.to] ?? rest;
      const dx = dest[0] - rest[0];
      const dz = dest[2] - rest[2];
      const len = Math.hypot(dx, dz) || 1;
      const fx = dx / len;
      const fz = dz / len;
      const fullHoriz = Math.sin(MAX_TILT) * RADIAL;
      const fullMouthRel = PIVOT_Y + Math.cos(MAX_TILT) * RADIAL;
      const fullY = MOUTH_Y + 0.48 - fullMouthRel;
      const fullX = dest[0] - fx * fullHoriz;
      const fullZ = dest[2] - fz * fullHoriz;
      outerG.position.set(
        rest[0] + (fullX - rest[0]) * env,
        rest[1] + (fullY - rest[1]) * env,
        rest[2] + (fullZ - rest[2]) * env,
      );
      outerG.rotation.set(0, Math.atan2(fx, fz) * env, 0);
      tiltG.rotation.x = MAX_TILT * env;
    } else {
      let shakeZ = 0;
      if (visual.shake.index === index && visual.shake.life > 0) {
        shakeZ = Math.sin(visual.shake.life * 42) * visual.shake.life * 0.08;
      }
      outerG.position.set(rest[0], rest[1] + lift.current + bob, rest[2]);
      outerG.rotation.set(0, 0, shakeZ);
      tiltG.rotation.x += (0 - tiltG.rotation.x) * (1 - Math.exp(-14 * dt));
    }

    let role: "source" | "dest" | "idle" = "idle";
    let flowP = 0;
    if (pour.active && pour.from === index) {
      role = "source";
      flowP = flowEnvelope(pour.t);
    } else if (pour.active && pour.to === index) {
      role = "dest";
      flowP = flowEnvelope(pour.t);
    }
    const stack = st.bottles[index] ?? [];
    const layers = displayLayers(stack, {
      role,
      color: pour.color,
      amount: pour.amount,
      p: flowP,
    });
    const unit = (LIQUID_TOP - LIQUID_BOTTOM) / st.capacity;
    let y = LIQUID_BOTTOM;
    for (let i = 0; i < SLOTS; i++) {
      const mesh = liquids.current[i];
      const layer = layers[i];
      if (!mesh) continue;
      if (!layer || layer.units < 0.02) {
        mesh.visible = false;
        continue;
      }
      const span = layer.units * unit;
      const h = Math.max(0.02, span - 0.02);
      mesh.visible = true;
      mesh.scale.y = h;
      mesh.position.y = y + h / 2;
      const mat = liquidMaterials[layer.color % liquidMaterials.length]!;
      if (mesh.material !== mat) mesh.material = mat;
      y += span;
    }
    if (meniscus.current) {
      const show = y > LIQUID_BOTTOM + 0.03;
      meniscus.current.visible = show;
      meniscus.current.position.y = y + 0.006;
      const top = layers[layers.length - 1];
      if (top) {
        const mat = meniscusMaterials[top.color % meniscusMaterials.length]!;
        if (meniscus.current.material !== mat) meniscus.current.material = mat;
      }
    }
    if (ring.current) {
      const hintedFrom = st.hint?.from === index;
      const hintedTo = st.hint?.to === index;
      const selected = st.selected === index;
      ring.current.visible = selected || hintedFrom || hintedTo;
      const mat = hintedTo && !selected ? hintMaterial : ringMaterial;
      if (ring.current.material !== mat) ring.current.material = mat;
      const pulse = 1 + Math.sin(visual.clock * 4 + index) * 0.035;
      ring.current.scale.setScalar(selected || hintedFrom ? pulse : 0.94);
    }
  });

  const onClick = (event: { stopPropagation: () => void }) => {
    event.stopPropagation();
    useGame.getState().tap(index);
  };

  return (
    <group ref={outer}>
      <group ref={tilt} position={[0, PIVOT_Y, 0]}>
        <group position={[0, -PIVOT_Y, 0]}>
          <mesh
            geometry={bottleGeometry}
            material={glassMaterial}
            dispose={null}
            renderOrder={2}
          />
          <mesh
            geometry={lipGeometry}
            material={brassMaterial}
            dispose={null}
            position={[0, 2.0, 0]}
            rotation={[Math.PI / 2, 0, 0]}
          />
          <mesh
            geometry={lipGeometry}
            material={brassDeepMaterial}
            dispose={null}
            position={[0, 0.045, 0]}
            rotation={[Math.PI / 2, 0, 0]}
            scale={[2.15, 2.15, 0.7]}
          />
          {Array.from({ length: SLOTS }, (_, i) => (
            <mesh
              key={i}
              ref={(node) => {
                liquids.current[i] = node;
              }}
              geometry={liquidGeometry}
              material={liquidMaterials[0]}
              dispose={null}
              visible={false}
              renderOrder={1}
            />
          ))}
          <mesh
            ref={meniscus}
            material={meniscusMaterials[0]}
            dispose={null}
            rotation={[-Math.PI / 2, 0, 0]}
            visible={false}
            renderOrder={1}
          >
            <circleGeometry args={[0.35, 28]} />
          </mesh>
          <group ref={mouth} position={[0, MOUTH_Y, 0]} />
          <mesh
            position={[0, 1.02, 0]}
            onClick={onClick}
            onPointerOver={(event) => {
              event.stopPropagation();
              if (useGame.getState().phase === "play") document.body.style.cursor = "pointer";
            }}
            onPointerOut={() => {
              document.body.style.cursor = "";
            }}
          >
            <cylinderGeometry args={[0.62, 0.62, 2.2, 10]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          </mesh>
        </group>
      </group>
      <mesh
        ref={ring}
        geometry={ringGeometry}
        material={ringMaterial}
        dispose={null}
        rotation={[Math.PI / 2, 0, 0]}
        position={[0, 0.04, 0]}
        visible={false}
      />
    </group>
  );
}
