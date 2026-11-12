export type Stack = number[];
export type Move = { from: number; to: number };

export function topRun(stack: Stack): number {
  const n = stack.length;
  if (!n) return 0;
  const color = stack[n - 1];
  let run = 1;
  for (let i = n - 2; i >= 0; i--) {
    if (stack[i] !== color) break;
    run++;
  }
  return run;
}

export function pourAmount(from: Stack, to: Stack, capacity: number): number {
  if (!from.length) return 0;
  if (to.length >= capacity) return 0;
  const color = from[from.length - 1]!;
  if (to.length > 0 && to[to.length - 1] !== color) return 0;
  return Math.min(topRun(from), capacity - to.length);
}

export function applyPour(
  bottles: Stack[],
  from: number,
  to: number,
  capacity: number,
): Stack[] | null {
  const source = bottles[from];
  const dest = bottles[to];
  if (!source || !dest) return null;
  const amount = pourAmount(source, dest, capacity);
  if (!amount) return null;
  const next = bottles.map((b) => b.slice());
  const color = next[from]![next[from]!.length - 1]!;
  for (let i = 0; i < amount; i++) {
    next[from]!.pop();
    next[to]!.push(color);
  }
  return next;
}

export function isWon(bottles: Stack[], capacity: number): boolean {
  let any = false;
  for (const bottle of bottles) {
    if (!bottle.length) continue;
    any = true;
    if (bottle.length !== capacity) return false;
    const color = bottle[0];
    for (let i = 1; i < bottle.length; i++) {
      if (bottle[i] !== color) return false;
    }
  }
  return any;
}

export function cloneBottles(bottles: Stack[]): Stack[] {
  return bottles.map((b) => b.slice());
}

export type Layer = { color: number; units: number };

export function stackToLayers(stack: readonly number[]): Layer[] {
  const layers: Layer[] = [];
  for (const color of stack) {
    const last = layers[layers.length - 1];
    if (last && last.color === color) last.units += 1;
    else layers.push({ color, units: 1 });
  }
  return layers;
}

export function displayLayers(
  stack: readonly number[],
  flow: { role: "source" | "dest" | "idle"; color: number; amount: number; p: number },
): Layer[] {
  if (flow.role === "idle" || flow.p <= 0) return stackToLayers(stack);
  if (flow.role === "source") {
    let remove = flow.amount * flow.p;
    const layers = stackToLayers(stack);
    for (let i = layers.length - 1; i >= 0 && remove > 0.0001; i--) {
      const layer = layers[i]!;
      const take = Math.min(layer.units, remove);
      layer.units -= take;
      remove -= take;
      if (layer.units <= 0.001) layers.pop();
    }
    return layers;
  }
  const layers = stackToLayers(stack);
  const add = flow.amount * flow.p;
  if (add <= 0.001) return layers;
  const last = layers[layers.length - 1];
  if (last && last.color === flow.color) last.units += add;
  else layers.push({ color: flow.color, units: add });
  return layers;
}

function solverMoves(bottles: Stack[], capacity: number): Move[] {
  const moves: Move[] = [];
  const firstEmpty = bottles.findIndex((b) => b.length === 0);
  for (let from = 0; from < bottles.length; from++) {
    const source = bottles[from]!;
    if (!source.length) continue;
    if (source.length === capacity && topRun(source) === capacity) continue;
    for (let to = 0; to < bottles.length; to++) {
      if (from === to) continue;
      const dest = bottles[to]!;
      if (!dest.length && to !== firstEmpty) continue;
      if (!dest.length && topRun(source) === source.length) continue;
      if (pourAmount(source, dest, capacity) > 0) moves.push({ from, to });
    }
  }
  return moves;
}

export function keyOf(bottles: Stack[]): string {
  let out = "";
  for (let i = 0; i < bottles.length; i++) {
    if (i) out += "|";
    const bottle = bottles[i]!;
    for (let j = 0; j < bottle.length; j++) {
      if (j) out += ",";
      out += bottle[j];
    }
  }
  return out;
}

export function solve(
  bottles: Stack[],
  capacity: number,
  nodeCap = 20000,
): { move: Move | null; nodes: number; depth: number } {
  if (isWon(bottles, capacity)) return { move: null, nodes: 1, depth: 0 };
  const seen = new Set<string>([keyOf(bottles)]);
  const queue: { bottles: Stack[]; first: Move | null; depth: number }[] = [
    { bottles, first: null, depth: 0 },
  ];
  let qi = 0;
  while (qi < queue.length && seen.size < nodeCap) {
    const cur = queue[qi++]!;
    for (const move of solverMoves(cur.bottles, capacity)) {
      const next = applyPour(cur.bottles, move.from, move.to, capacity);
      if (!next) continue;
      const key = keyOf(next);
      if (seen.has(key)) continue;
      seen.add(key);
      const first = cur.first ?? move;
      const depth = cur.depth + 1;
      if (isWon(next, capacity)) return { move: first, nodes: seen.size, depth };
      queue.push({ bottles: next, first, depth });
    }
  }
  return { move: null, nodes: seen.size, depth: -1 };
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function canUnpour(from: Stack, to: Stack, capacity: number, amount: number): boolean {
  if (amount <= 0 || from.length < amount) return false;
  if (to.length + amount > capacity) return false;
  const color = from[from.length - 1]!;
  const run = topRun(from);
  if (amount > run) return false;
  if (amount === run && from.length !== run) return false;
  const toRun = to.length > 0 && to[to.length - 1] === color ? topRun(to) : 0;
  const stackAtT0 = toRun + amount;
  const spaceAtT0 = capacity - (from.length - amount);
  return Math.min(stackAtT0, spaceAtT0) === amount;
}

type Unpour = { from: number; to: number; amount: number };

function pickUnpour(bottles: Stack[], capacity: number, rand: () => number): Unpour | null {
  const candidates: Unpour[] = [];
  const weights: number[] = [];
  for (let from = 0; from < bottles.length; from++) {
    const source = bottles[from]!;
    if (!source.length) continue;
    const color = source[source.length - 1]!;
    const run = topRun(source);
    for (let to = 0; to < bottles.length; to++) {
      if (from === to) continue;
      const dest = bottles[to]!;
      const space = capacity - dest.length;
      const max = Math.min(run, space);
      for (let amount = 1; amount <= max; amount++) {
        if (!canUnpour(source, dest, capacity, amount)) continue;
        const mixes = dest.length > 0 && dest[dest.length - 1] !== color;
        candidates.push({ from, to, amount });
        weights.push(amount * amount * (mixes ? 4 : 1));
      }
    }
  }
  if (!candidates.length) return null;
  let total = 0;
  for (const w of weights) total += w;
  let r = rand() * total;
  for (let i = 0; i < candidates.length; i++) {
    r -= weights[i]!;
    if (r <= 0) return candidates[i]!;
  }
  return candidates[candidates.length - 1]!;
}

function applyUnpour(bottles: Stack[], move: Unpour) {
  const color = bottles[move.from]![bottles[move.from]!.length - 1]!;
  for (let i = 0; i < move.amount; i++) {
    bottles[move.from]!.pop();
    bottles[move.to]!.push(color);
  }
}

function oneMoveWin(bottles: Stack[], capacity: number): boolean {
  for (let from = 0; from < bottles.length; from++) {
    for (let to = 0; to < bottles.length; to++) {
      if (from === to) continue;
      const next = applyPour(bottles, from, to, capacity);
      if (next && isWon(next, capacity)) return true;
    }
  }
  return false;
}

function hasMixed(bottles: Stack[]): boolean {
  return bottles.some((b) => new Set(b).size > 1);
}

export function scramble(opts: {
  colors: number;
  empties: number;
  capacity: number;
  shuffles: number;
  seed: number;
}): Stack[] {
  const { colors, empties, capacity, shuffles } = opts;
  for (let attempt = 0; attempt < 30; attempt++) {
    const rand = mulberry32(opts.seed + attempt * 9973);
    const bottles: Stack[] = [];
    for (let c = 0; c < colors; c++) {
      bottles.push(Array.from({ length: capacity }, () => c));
    }
    for (let e = 0; e < empties; e++) bottles.push([]);
    let applied = 0;
    let guard = 0;
    while (applied < shuffles && guard < shuffles * 60) {
      guard++;
      const move = pickUnpour(bottles, capacity, rand);
      if (!move) continue;
      applyUnpour(bottles, move);
      applied++;
    }
    if (applied < Math.min(4, shuffles)) continue;
    if (isWon(bottles, capacity) || oneMoveWin(bottles, capacity) || !hasMixed(bottles)) {
      continue;
    }
    return bottles.map((b) => b.slice());
  }
  const bottles: Stack[] = [];
  for (let c = 0; c < colors; c++) bottles.push(Array.from({ length: capacity }, () => c));
  for (let e = 0; e < empties; e++) bottles.push([]);
  return bottles;
}
