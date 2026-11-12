import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import {
  CanvasTexture,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  Quaternion,
  SRGBColorSpace,
  SphereGeometry,
  Vector3,
  type InstancedMesh,
  type Mesh,
  type PerspectiveCamera,
} from "three";
import { Bottle } from "@/components/pour/Bottle";
import { fitCamera } from "@/game/layout";
import { liquidMaterials } from "@/game/materials";
import { scene } from "@/game/palette";
import { useGame } from "@/game/store";
import { flowEnvelope, mouths, stage, visual } from "@/game/visual";

const UP = new Vector3(0, 1, 0);
const fromV = new Vector3();
const toV = new Vector3();
const midV = new Vector3();
const dirV = new Vector3();
const dropV = new Vector3();
const dummy = new Object3D();
const quat = new Quaternion();

function makeShadowTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const grd = ctx.createRadialGradient(64, 64, 6, 64, 64, 64);
  grd.addColorStop(0, "rgba(0,0,0,0.5)");
  grd.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  return tex;
}

function Director() {
  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    visual.clock += dt;
    visual.frames += 1;
    if (!visual.booted) visual.booted = true;
    if (visual.shake.life > 0) {
      visual.shake.life = Math.max(0, visual.shake.life - dt / 0.38);
    }
    const pour = visual.pour;
    if (pour.done) {
      pour.active = false;
      pour.done = false;
      pour.t = 0;
      useGame.getState().commitPour();
      return;
    }
    if (!pour.active) return;
    pour.t += dt / pour.duration;
    if (pour.t >= 1) {
      pour.t = 1;
      pour.done = true;
    }
  });
  return null;
}

function Stage() {
  const count = useGame((s) => s.bottles.length);
  const size = useThree((s) => s.size);
  const camera = useThree((s) => s.camera);
  const positions = useMemo(
    () => fitCamera(count, size.width, size.height, camera as PerspectiveCamera),
    [camera, count, size.width, size.height],
  );
  stage.positions = positions;
  return (
    <>
      {positions.map((_, index) => (
        <Bottle key={`${count}-${positions.length}-${index}`} index={index} />
      ))}
    </>
  );
}

function Table() {
  const count = useGame((s) => s.bottles.length);
  const radius = Math.min(16, 4.2 + Math.sqrt(count) * 1.55);
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
        <circleGeometry args={[radius, 72]} />
        <meshStandardMaterial color={scene.table} metalness={0.42} roughness={0.38} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.015, 0]}>
        <ringGeometry args={[radius - 0.07, radius, 72]} />
        <meshStandardMaterial color={scene.brass} metalness={0.75} roughness={0.32} />
      </mesh>
    </group>
  );
}

function Shadow({ index, map }: { index: number; map: CanvasTexture }) {
  const mat = useMemo(
    () =>
      new MeshBasicMaterial({
        map,
        transparent: true,
        depthWrite: false,
        opacity: 0.8,
      }),
    [map],
  );
  const mesh = useRef<Mesh>(null);
  useFrame(() => {
    const m = mesh.current;
    if (!m) return;
    const pos = stage.positions[index];
    if (!pos) return;
    m.position.set(pos[0], 0.012, pos[2]);
    const st = useGame.getState();
    const lifted =
      st.selected === index || (visual.pour.active && visual.pour.from === index);
    const target = lifted ? 0.22 : 0.75;
    mat.opacity += (target - mat.opacity) * 0.18;
  });
  return (
    <mesh ref={mesh} rotation={[-Math.PI / 2, 0, 0]} material={mat}>
      <planeGeometry args={[1.2, 1.2]} />
    </mesh>
  );
}

function Shadows() {
  const count = useGame((s) => s.bottles.length);
  const map = useMemo(() => makeShadowTexture(), []);
  if (!map) return null;
  return (
    <group>
      {Array.from({ length: count }, (_, index) => (
        <Shadow key={index} index={index} map={map} />
      ))}
    </group>
  );
}

function Stream() {
  const tube = useRef<Mesh>(null);
  const drops = useRef<InstancedMesh>(null);
  const dropGeo = useMemo(() => new SphereGeometry(1, 8, 8), []);
  const dropMat = useMemo(
    () =>
      new MeshStandardMaterial({
        color: "#f4efe6",
        roughness: 0.2,
        emissive: "#ffffff",
        emissiveIntensity: 0.15,
      }),
    [],
  );
  useFrame(() => {
    const mesh = tube.current;
    const inst = drops.current;
    if (!mesh || !inst) return;
    const pour = visual.pour;
    const p = pour.active ? flowEnvelope(pour.t) : 0;
    const show = pour.active && p > 0.02 && p < 0.98;
    const fromObj = mouths[pour.from];
    const toObj = mouths[pour.to];
    if (!show || !fromObj || !toObj) {
      mesh.visible = false;
      inst.visible = false;
      return;
    }
    fromObj.getWorldPosition(fromV);
    toObj.getWorldPosition(toV);
    toV.y -= 0.62;
    mesh.visible = true;
    inst.visible = true;
    midV.lerpVectors(fromV, toV, 0.5);
    dirV.subVectors(toV, fromV);
    const len = Math.max(0.05, dirV.length());
    dirV.multiplyScalar(1 / len);
    mesh.position.copy(midV);
    mesh.scale.set(0.045, len, 0.045);
    quat.setFromUnitVectors(UP, dirV);
    mesh.quaternion.copy(quat);
    const mat = liquidMaterials[pour.color % liquidMaterials.length]!;
    if (mesh.material !== mat) mesh.material = mat;
    if (inst.material !== mat) inst.material = mat;
    const n = inst.count;
    for (let i = 0; i < n; i++) {
      const u = (i + 0.5) / n;
      dropV.lerpVectors(fromV, toV, u);
      dropV.y += Math.sin(visual.clock * 10 + i) * 0.012;
      dummy.position.copy(dropV);
      const s = 0.055 + (i % 3) * 0.012;
      dummy.scale.setScalar(s);
      dummy.updateMatrix();
      inst.setMatrixAt(i, dummy.matrix);
    }
    inst.instanceMatrix.needsUpdate = true;
  });
  return (
    <>
      <mesh ref={tube} visible={false}>
        <cylinderGeometry args={[1, 1, 1, 10]} />
        <primitive object={liquidMaterials[0]} attach="material" />
      </mesh>
      <instancedMesh ref={drops} args={[dropGeo, dropMat, 8]} visible={false} />
    </>
  );
}

function BootFlag() {
  useEffect(() => {
    const id = window.setTimeout(() => {
      visual.booted = true;
    }, 800);
    return () => window.clearTimeout(id);
  }, []);
  return null;
}

export function World() {
  return (
    <Canvas
      className="h-full w-full touch-none"
      dpr={[1, 1.6]}
      gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
      onPointerMissed={() => useGame.getState().clearSelection()}
      onCreated={({ gl }) => {
        gl.setClearColor(scene.bg);
        gl.toneMappingExposure = 1.08;
      }}
    >
      <color attach="background" args={[scene.bg]} />
      <fog attach="fog" args={[scene.fog, 16, 32]} />
      <ambientLight intensity={0.48} color="#d7e7f2" />
      <hemisphereLight color="#f6f1e6" groundColor="#10202c" intensity={0.45} />
      <directionalLight position={[4.5, 8, 4]} intensity={1.45} color="#fff3e2" />
      <directionalLight position={[-5, 3.5, -2]} intensity={0.42} color="#8fd0e8" />
      <Environment frames={2} resolution={128} environmentIntensity={0.85}>
        <Lightformer form="rect" intensity={2.4} color="#fff6e8" position={[0, 5, 2]} scale={[8, 4, 1]} />
        <Lightformer form="rect" intensity={0.9} color="#8fd0e6" position={[-5, 2, -1]} scale={[5, 5, 1]} />
        <Lightformer form="circle" intensity={1.3} color="#e4b56a" position={[3.2, 1.6, 4]} scale={[2.2, 2.2, 1]} />
      </Environment>
      <Director />
      <BootFlag />
      <Table />
      <Shadows />
      <Stage />
      <Stream />
    </Canvas>
  );
}
