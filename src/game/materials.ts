import {
  CylinderGeometry,
  DoubleSide,
  LatheGeometry,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  TorusGeometry,
  Vector2,
} from "three";
import { PALETTE, scene } from "./palette.ts";

const profile: Array<[number, number]> = [
  [0.02, 0],
  [0.34, 0],
  [0.43, 0.05],
  [0.49, 0.2],
  [0.51, 0.72],
  [0.48, 1.16],
  [0.38, 1.34],
  [0.24, 1.52],
  [0.16, 1.72],
  [0.15, 1.94],
  [0.2, 2.02],
  [0.2, 2.06],
];

export const MOUTH_Y = 2.06;
export const PIVOT_Y = 1.18;
export const RADIAL = MOUTH_Y - PIVOT_Y;
export const MAX_TILT = 1.16;
export const LIQUID_BOTTOM = 0.12;
export const LIQUID_TOP = 1.26;

export const bottleGeometry = new LatheGeometry(
  profile.map(([x, y]) => new Vector2(x, y)),
  40,
);

export const liquidGeometry = new CylinderGeometry(0.36, 0.4, 1, 28);

export const liquidMaterials = PALETTE.map(
  (p) =>
    new MeshStandardMaterial({
      color: p.hex,
      roughness: 0.18,
      metalness: 0.02,
      emissive: p.hex,
      emissiveIntensity: 0.22,
    }),
);

export const meniscusMaterials = PALETTE.map(
  (p) =>
    new MeshStandardMaterial({
      color: p.meniscus,
      roughness: 0.12,
      metalness: 0.02,
      emissive: p.emissive,
      emissiveIntensity: 0.35,
    }),
);

export const glassMaterial = new MeshPhysicalMaterial({
  color: "#f4fbff",
  roughness: 0.04,
  metalness: 0.02,
  transparent: true,
  opacity: 0.16,
  envMapIntensity: 1.35,
  depthWrite: false,
  side: DoubleSide,
});

export const brassMaterial = new MeshStandardMaterial({
  color: scene.brass,
  metalness: 0.82,
  roughness: 0.28,
});

export const brassDeepMaterial = new MeshStandardMaterial({
  color: scene.brassDeep,
  metalness: 0.7,
  roughness: 0.38,
});

export const ringMaterial = new MeshStandardMaterial({
  color: scene.brass,
  emissive: scene.brass,
  emissiveIntensity: 0.85,
  metalness: 0.35,
  roughness: 0.28,
});

export const hintMaterial = new MeshStandardMaterial({
  color: "#2ec4c0",
  emissive: "#1aa8a4",
  emissiveIntensity: 0.8,
  metalness: 0.2,
  roughness: 0.3,
});

export const ringGeometry = new TorusGeometry(0.62, 0.032, 10, 40);
export const lipGeometry = new TorusGeometry(0.2, 0.026, 8, 28);
