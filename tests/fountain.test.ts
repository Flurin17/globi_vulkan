import { test } from "node:test";
import assert from "node:assert/strict";
import { createSparkAttributes, fountainEnvelope, FOUNTAIN_CYCLE_SECONDS } from "../src/lib/fountain";

test("reference sequence starts gently in green, builds to gold, then stops emitting before its tail clears", () => {
  assert.equal(fountainEnvelope(0).power, 0);
  assert.ok(fountainEnvelope(1).power > 0 && fountainEnvelope(1).power < .35);
  assert.equal(fountainEnvelope(1).green, 1);
  assert.equal(fountainEnvelope(7).green, 0);
  assert.ok(fountainEnvelope(10).power < fountainEnvelope(16).power);
  assert.equal(fountainEnvelope(20).power, 1);
  assert.ok(fountainEnvelope(22).power < fountainEnvelope(21).power);
  for (let t = 23; t < FOUNTAIN_CYCLE_SECONDS; t += .1) {
    assert.equal(fountainEnvelope(t).power, 0, "Leave five seconds for sparks and smoke to fade before replay");
  }
  assert.deepEqual(fountainEnvelope(FOUNTAIN_CYCLE_SECONDS), fountainEnvelope(0));
  assert.deepEqual(fountainEnvelope(FOUNTAIN_CYCLE_SECONDS + 10), fountainEnvelope(10));
});

test("burn inputs stay finite and bounded, including invalid time and repeat boundaries", () => {
  for (const t of [-100, -1, NaN, Infinity, -Infinity])
    assert.deepEqual(fountainEnvelope(t), { power: 0, green: 0 });
  for (let t = 0; t < FOUNTAIN_CYCLE_SECONDS * 3; t += .025) {
    const { power, green } = fountainEnvelope(t);
    assert.ok(Number.isFinite(power) && power >= 0 && power <= 1);
    assert.ok(Number.isFinite(green) && green >= 0 && green <= 1);
  }
});

test("mobile reduces GPU work while retaining reproducible complete parent and crackle groups", () => {
  const mobile = createSparkAttributes(true);
  const desktop = createSparkAttributes(false);
  assert.ok(mobile.branches.length < desktop.branches.length * .6);
  assert.ok(desktop.branches.length < 3500);
  assert.deepEqual(createSparkAttributes(false), desktop);
  for (const { seeds, branches } of [mobile, desktop]) {
    assert.equal(seeds.length, branches.length * 4);
    assert.ok(seeds.every(v => Number.isFinite(v) && v >= 0 && v <= 1));
    for (let i = 0; i < branches.length; i++) {
      if (branches[i] !== 0) {
        const parent = i - branches[i];
        assert.equal(branches[parent], 0);
        assert.deepEqual(seeds.slice(i * 4, i * 4 + 4), seeds.slice(parent * 4, parent * 4 + 4));
      }
    }
  }
});
