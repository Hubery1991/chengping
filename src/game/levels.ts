import { cloneBottles, scramble, type Stack } from "./logic.ts";

export type LevelData = {
  name: string;
  capacity: number;
  bottles: Stack[];
};

const HAND: LevelData[] = [
  {
    name: "初酌",
    capacity: 4,
    bottles: [
      [0, 0, 1, 1],
      [1, 1, 0, 0],
      [],
    ],
  },
  {
    name: "三色",
    capacity: 4,
    bottles: [
      [0, 0, 2, 2],
      [1, 1, 0, 0],
      [2, 2, 1, 1],
      [],
    ],
  },
];

const GENERATED: {
  name: string;
  colors: number;
  empties: number;
  shuffles: number;
  seed: number;
}[] = [
  { name: "入杯", colors: 4, empties: 2, shuffles: 12, seed: 3201 },
  { name: "四味", colors: 4, empties: 2, shuffles: 22, seed: 4402 },
  { name: "五色", colors: 5, empties: 2, shuffles: 20, seed: 5503 },
  { name: "交错", colors: 5, empties: 2, shuffles: 34, seed: 6604 },
  { name: "六澜", colors: 6, empties: 2, shuffles: 28, seed: 7705 },
  { name: "深瓶", colors: 6, empties: 2, shuffles: 42, seed: 8806 },
  { name: "七弦", colors: 7, empties: 2, shuffles: 34, seed: 9907 },
  { name: "回波", colors: 7, empties: 2, shuffles: 48, seed: 10108 },
  { name: "八珍", colors: 8, empties: 2, shuffles: 40, seed: 11109 },
  { name: "迷津", colors: 8, empties: 2, shuffles: 56, seed: 12110 },
  { name: "九曲", colors: 9, empties: 2, shuffles: 46, seed: 13111 },
  { name: "十全", colors: 10, empties: 2, shuffles: 50, seed: 14112 },
  { name: "归流", colors: 11, empties: 2, shuffles: 54, seed: 15113 },
  { name: "止水", colors: 12, empties: 2, shuffles: 60, seed: 16114 },
];

export const TOTAL_LEVELS = HAND.length + GENERATED.length;

const cache = new Map<number, LevelData>();

export function buildLevel(index: number): LevelData {
  const safe = Math.max(0, Math.min(TOTAL_LEVELS - 1, index));
  const hit = cache.get(safe);
  if (hit) {
    return { name: hit.name, capacity: hit.capacity, bottles: cloneBottles(hit.bottles) };
  }
  let data: LevelData;
  if (safe < HAND.length) {
    const hand = HAND[safe]!;
    data = { name: hand.name, capacity: hand.capacity, bottles: cloneBottles(hand.bottles) };
  } else {
    const spec = GENERATED[safe - HAND.length]!;
    data = {
      name: spec.name,
      capacity: 4,
      bottles: scramble({
        colors: spec.colors,
        empties: spec.empties,
        capacity: 4,
        shuffles: spec.shuffles,
        seed: spec.seed,
      }),
    };
  }
  cache.set(safe, data);
  return { name: data.name, capacity: data.capacity, bottles: cloneBottles(data.bottles) };
}
