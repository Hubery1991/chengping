import type { Object3D } from "three";

export const visual = {
  clock: 0,
  booted: false,
  frames: 0,
  pour: {
    active: false,
    pending: false,
    done: false,
    from: 0,
    to: 0,
    color: 0,
    amount: 0,
    t: 0,
    duration: 1.12,
  },
  shake: { index: -1, life: 0 },
};

export const mouths: (Object3D | null)[] = [];

export const stage = {
  positions: [] as Array<[number, number, number]>,
};

export function tiltEnvelope(t: number): number {
  if (t < 0.22) return smooth(t / 0.22);
  if (t < 0.78) return 1;
  return 1 - smooth((t - 0.78) / 0.22);
}

export function flowEnvelope(t: number): number {
  if (t < 0.24) return 0;
  if (t > 0.78) return 1;
  return smooth((t - 0.24) / 0.54);
}

function smooth(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
}

export function beginPour(opts: {
  from: number;
  to: number;
  color: number;
  amount: number;
  reduced: boolean;
}) {
  const pour = visual.pour;
  pour.active = true;
  pour.pending = true;
  pour.done = false;
  pour.from = opts.from;
  pour.to = opts.to;
  pour.color = opts.color;
  pour.amount = opts.amount;
  pour.t = 0;
  pour.duration = opts.reduced ? 0.22 : 1.12;
}

export function reducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
