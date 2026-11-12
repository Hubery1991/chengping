import { Vector3, type PerspectiveCamera } from "three";

const ndc = new Vector3();

export function columnsFor(count: number, width: number): number {
  if (count <= 1) return 1;
  if (width < 560) return Math.min(3, count);
  if (width < 900) return Math.min(count <= 6 ? count : 4, count);
  if (count <= 6) return count;
  return Math.min(6, Math.ceil(count / 2));
}

export function layoutBottles(count: number, columns: number): Array<[number, number, number]> {
  const cols = Math.max(1, Math.min(columns, count));
  const rows = Math.ceil(count / cols);
  const spacingX = cols >= 5 ? 1.28 : 1.48;
  const spacingZ = 1.85;
  const positions: Array<[number, number, number]> = [];
  let i = 0;
  for (let r = 0; r < rows; r++) {
    const n = Math.min(cols, count - i);
    const width = (n - 1) * spacingX;
    const z = ((rows - 1) * spacingZ) / 2 - r * spacingZ;
    for (let c = 0; c < n; c++) {
      positions.push([-width / 2 + c * spacingX, 0, z]);
      i++;
    }
  }
  return positions;
}

export function fitCamera(
  count: number,
  width: number,
  height: number,
  camera: PerspectiveCamera,
) {
  const columns = columnsFor(count, width);
  const positions = layoutBottles(count, columns);
  let minX = 0;
  let maxX = 0;
  let minZ = 0;
  let maxZ = 0;
  for (const [x, , z] of positions) {
    minX = Math.min(minX, x - 0.75);
    maxX = Math.max(maxX, x + 0.75);
    minZ = Math.min(minZ, z - 0.75);
    maxZ = Math.max(maxZ, z + 0.75);
  }
  const minY = 0;
  const maxY = 2.45;
  const cx = (minX + maxX) / 2;
  const cy = 1.05;
  const cz = (minZ + maxZ) / 2;
  const mobile = width < 700;
  const fov = mobile ? 46 : 34;
  const pitch = mobile ? 0.98 : 0.72;
  const yTop = 0.9;
  const yBot = -0.88;
  const xLimit = 0.9;
  camera.fov = fov;
  camera.aspect = width / Math.max(1, height);

  const corners: Array<[number, number, number]> = [];
  for (const x of [minX, maxX]) {
    for (const y of [minY, maxY]) {
      for (const z of [minZ, maxZ]) corners.push([x, y, z]);
    }
  }

  const fits = (dist: number) => {
    camera.position.set(cx, cy + Math.sin(pitch) * dist, cz + Math.cos(pitch) * dist);
    camera.lookAt(cx, cy, cz);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    for (const [x, y, z] of corners) {
      ndc.set(x, y, z).project(camera);
      if (ndc.x < -xLimit || ndc.x > xLimit || ndc.y < yBot || ndc.y > yTop) return false;
    }
    return true;
  };

  let lo = 1.5;
  let hi = 48;
  for (let i = 0; i < 20; i++) {
    const mid = (lo + hi) / 2;
    if (fits(mid)) hi = mid;
    else lo = mid;
  }
  fits(hi * 1.06);
  return positions;
}
