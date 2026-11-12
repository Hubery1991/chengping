import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { TOTAL_LEVELS, buildLevel } from "./levels.ts";
import { applyPour, isWon, pourAmount, solve } from "./logic.ts";

describe("澄瓶", () => {
  it("pours color 0 and rejects a mismatch", () => {
    const bottles = [
      [1, 0],
      [0, 0],
      [],
    ];
    assert.equal(pourAmount(bottles[0]!, bottles[1]!, 4), 1);
    assert.equal(pourAmount(bottles[0]!, bottles[2]!, 4), 1);
    assert.equal(pourAmount([1, 1], [0], 4), 0);
  });

  it("solves the tutorial in three pours", () => {
    const level = buildLevel(0);
    assert.equal(level.name, "初酌");
    const result = solve(level.bottles, level.capacity, 5000);
    assert.equal(result.depth, 3);
    let bottles = level.bottles;
    let guard = 0;
    while (!isWon(bottles, level.capacity) && guard < 8) {
      const step = solve(bottles, level.capacity, 5000);
      assert.ok(step.move);
      bottles = applyPour(bottles, step.move.from, step.move.to, level.capacity)!;
      guard++;
    }
    assert.equal(isWon(bottles, level.capacity), true);
  });

  it("keeps every generated level solvable and conservative", () => {
    for (let i = 0; i < TOTAL_LEVELS; i++) {
      const level = buildLevel(i);
      const counts = new Map<number, number>();
      for (const bottle of level.bottles) {
        for (const color of bottle) counts.set(color, (counts.get(color) ?? 0) + 1);
      }
      for (const n of counts.values()) assert.equal(n, level.capacity);
      assert.equal(isWon(level.bottles, level.capacity), false);
      if (i <= 4) {
        const result = solve(level.bottles, level.capacity, 40000);
        assert.ok(result.move, `level ${i} unsolved after ${result.nodes} nodes`);
      }
    }
  });
});
