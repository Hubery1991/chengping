import { create } from "zustand";
import { audio } from "./audio.ts";
import { TOTAL_LEVELS, buildLevel } from "./levels.ts";
import { applyPour, isWon, pourAmount, solve, type Stack } from "./logic.ts";
import { beginPour, reducedMotion, visual } from "./visual.ts";

export type Phase = "intro" | "play" | "won";
export type Tone = "info" | "bad" | "good";

type Best = Record<string, number>;

type Save = {
  version: 1;
  unlocked: number;
  best: Best;
  muted: boolean;
  level: number;
};

const KEY = "chengping-v1";

type GameState = {
  ready: boolean;
  phase: Phase;
  level: number;
  name: string;
  capacity: number;
  bottles: Stack[];
  initial: Stack[];
  selected: number | null;
  moves: number;
  history: Stack[][];
  busy: boolean;
  message: string | null;
  tone: Tone;
  hint: { from: number; to: number } | null;
  thinking: boolean;
  picker: boolean;
  help: boolean;
  confirmRestart: boolean;
  unlocked: number;
  best: Best;
  muted: boolean;
  focus: number;
  hydrate: () => void;
  start: () => void;
  tap: (index: number) => void;
  clearSelection: () => void;
  commitPour: () => void;
  undo: () => void;
  askRestart: () => void;
  cancelRestart: () => void;
  restart: () => void;
  next: () => void;
  goto: (level: number) => void;
  askHint: () => void;
  toggleMute: () => void;
  togglePicker: (open?: boolean) => void;
  toggleHelp: (open?: boolean) => void;
  nudgeFocus: (dir: number) => void;
  activateFocus: () => void;
};

function setup(level: number) {
  const data = buildLevel(level);
  return {
    level,
    name: data.name,
    capacity: data.capacity,
    bottles: data.bottles,
    initial: data.bottles.map((b) => b.slice()),
    selected: null as number | null,
    moves: 0,
    history: [] as Stack[][],
    busy: false,
    message: level === 0 ? "点一只盛着水的瓶子" : null,
    tone: "info" as Tone,
    hint: null as { from: number; to: number } | null,
    thinking: false,
    confirmRestart: false,
    focus: 0,
  };
}

function persist() {
  if (typeof window === "undefined") return;
  const s = useGame.getState();
  const data: Save = {
    version: 1,
    unlocked: s.unlocked,
    best: s.best,
    muted: s.muted,
    level: s.level,
  };
  localStorage.setItem(KEY, JSON.stringify(data));
}

const boot = setup(0);

export const useGame = create<GameState>((set, get) => ({
  ready: false,
  phase: "intro",
  ...boot,
  picker: false,
  help: false,
  unlocked: 0,
  best: {},
  muted: false,

  hydrate: () => {
    if (get().ready) return;
    let saved: Save | null = null;
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) saved = JSON.parse(raw) as Save;
    } catch {
      saved = null;
    }
    if (!saved || saved.version !== 1) {
      set({ ready: true });
      return;
    }
    const unlocked = clamp(saved.unlocked ?? 0, 0, TOTAL_LEVELS - 1);
    const level = clamp(Math.min(saved.level ?? 0, unlocked), 0, TOTAL_LEVELS - 1);
    audio.muted = !!saved.muted;
    set({
      ...setup(level),
      ready: true,
      phase: "intro",
      unlocked,
      best: saved.best ?? {},
      muted: !!saved.muted,
      picker: false,
      help: false,
    });
  },

  start: () => {
    audio.unlock();
    const level = get().level;
    set({
      phase: "play",
      help: false,
      message: level === 0 ? "点一只盛着水的瓶子" : null,
      tone: "info",
    });
  },

  tap: (index) => {
    const s = get();
    audio.unlock();
    if (s.phase !== "play" || s.busy) return;
    const bottle = s.bottles[index];
    if (!bottle) return;
    if (s.selected === null) {
      if (!bottle.length) {
        visual.shake = { index, life: 1 };
        audio.deny();
        set({ message: "这只是空的，先点有水的瓶子", tone: "bad", focus: index });
        return;
      }
      audio.select();
      set({
        selected: index,
        focus: index,
        hint: null,
        tone: "info",
        message:
          s.level === 0 && s.moves === 0
            ? "再点空瓶，或瓶口颜色相同的瓶子"
            : null,
      });
      return;
    }
    if (s.selected === index) {
      set({ selected: null, message: null });
      return;
    }
    const amount = pourAmount(s.bottles[s.selected]!, bottle, s.capacity);
    if (!amount) {
      const src = s.bottles[s.selected]!;
      const same = bottle.length > 0 && bottle[bottle.length - 1] === src[src.length - 1];
      if (same) {
        visual.shake = { index, life: 1 };
        audio.deny();
        set({ message: "这只瓶子已经满了", tone: "bad", focus: index });
        return;
      }
      if (bottle.length) {
        audio.select();
        set({ selected: index, focus: index, message: null, hint: null, tone: "info" });
        return;
      }
      visual.shake = { index, life: 1 };
      audio.deny();
      set({ message: "倒不进去", tone: "bad" });
      return;
    }
    const color = s.bottles[s.selected]![s.bottles[s.selected]!.length - 1]!;
    beginPour({
      from: s.selected,
      to: index,
      color,
      amount,
      reduced: reducedMotion(),
    });
    audio.pour();
    set({
      busy: true,
      selected: null,
      hint: null,
      message: null,
      focus: index,
      confirmRestart: false,
    });
  },

  clearSelection: () => {
    if (get().phase !== "play" || get().busy) return;
    set({ selected: null });
  },

  commitPour: () => {
    const pour = visual.pour;
    if (!pour.pending) return;
    pour.pending = false;
    const s = get();
    const next = applyPour(s.bottles, pour.from, pour.to, s.capacity);
    if (!next) {
      set({ busy: false });
      return;
    }
    const history = [...s.history, s.bottles.map((b) => b.slice())].slice(-40);
    const moves = s.moves + 1;
    if (isWon(next, s.capacity)) {
      const prev = s.best[String(s.level)];
      const best = { ...s.best };
      if (!prev || moves < prev) best[String(s.level)] = moves;
      const unlocked = Math.max(s.unlocked, Math.min(TOTAL_LEVELS - 1, s.level + 1));
      set({
        bottles: next,
        history,
        moves,
        busy: false,
        phase: "won",
        best,
        unlocked,
        selected: null,
        message: !prev || moves < prev ? "新的最佳" : "瓶子都澄了",
        tone: "good",
      });
      audio.win();
      persist();
      return;
    }
    set({ bottles: next, history, moves, busy: false });
  },

  undo: () => {
    const s = get();
    if (s.phase !== "play" || s.busy || !s.history.length) return;
    const prev = s.history[s.history.length - 1]!;
    set({
      bottles: prev.map((b) => b.slice()),
      history: s.history.slice(0, -1),
      moves: Math.max(0, s.moves - 1),
      selected: null,
      hint: null,
      message: null,
    });
  },

  askRestart: () => {
    const s = get();
    if (s.busy || s.phase === "intro") return;
    if (s.moves === 0) {
      get().restart();
      return;
    }
    set({ confirmRestart: true, picker: false, help: false });
  },

  cancelRestart: () => set({ confirmRestart: false }),

  restart: () => {
    const s = get();
    if (s.busy) return;
    const fresh = setup(s.level);
    set({ ...fresh, phase: "play", confirmRestart: false });
  },

  next: () => {
    const s = get();
    const level = s.level >= TOTAL_LEVELS - 1 ? 0 : s.level + 1;
    if (level > s.unlocked && level !== 0) return;
    set({ ...setup(level), phase: "play", picker: false });
    persist();
  },

  goto: (level) => {
    const s = get();
    if (level < 0 || level >= TOTAL_LEVELS || level > s.unlocked || s.busy) return;
    set({ ...setup(level), phase: "play", picker: false });
    persist();
  },

  askHint: () => {
    const s = get();
    if (s.phase !== "play" || s.busy || s.thinking) return;
    set({ thinking: true, message: "在看水面……", tone: "info" });
    window.setTimeout(() => {
      const now = get();
      const result = solve(now.bottles, now.capacity, 12000);
      if (!result.move) {
        set({
          thinking: false,
          hint: null,
          message: "这步藏得比较深，先别打乱已经纯色的瓶子",
          tone: "info",
        });
        return;
      }
      set({
        thinking: false,
        hint: result.move,
        selected: result.move.from,
        message: "金色圈是倒出，青色圈是倒入",
        tone: "info",
      });
    }, 40);
  },

  toggleMute: () => {
    const muted = !get().muted;
    audio.muted = muted;
    if (!muted) audio.unlock();
    set({ muted });
    persist();
  },

  togglePicker: (open) => set({ picker: open ?? !get().picker, help: false, confirmRestart: false }),
  toggleHelp: (open) => set({ help: open ?? !get().help, picker: false }),

  nudgeFocus: (dir) => {
    const s = get();
    if (s.phase !== "play" || s.busy) return;
    const n = s.bottles.length;
    const focus = (s.focus + dir + n) % n;
    set({ focus });
  },

  activateFocus: () => {
    const s = get();
    if (s.phase === "intro") {
      get().start();
      return;
    }
    if (s.phase === "won") {
      get().next();
      return;
    }
    get().tap(s.focus);
  },
}));

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

declare global {
  interface Window {
    __pour?: {
      start: () => void;
      tap: (index: number) => void;
      snapshot: () => {
        phase: Phase;
        moves: number;
        busy: boolean;
        level: number;
        name: string;
        bottles: Stack[];
        message: string | null;
        booted: boolean;
        frames: number;
      };
    };
  }
}

if (typeof window !== "undefined") {
  window.__pour = {
    start: () => useGame.getState().start(),
    tap: (index) => useGame.getState().tap(index),
    snapshot: () => {
      const s = useGame.getState();
      return {
        phase: s.phase,
        moves: s.moves,
        busy: s.busy,
        level: s.level,
        name: s.name,
        bottles: s.bottles.map((b) => b.slice()),
        message: s.message,
        booted: visual.booted,
        frames: visual.frames,
      };
    },
  };
}
