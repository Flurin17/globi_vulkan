import { test } from "node:test";
import assert from "node:assert/strict";
import { needsContinuousFrames, scheduleSceneStart } from "../src/lib/scene-rendering";

test("stationary phases stop drawing, flames animate, and pause/offscreen always stop", () => {
  for (const progress of [0, 0.2, 0.55, 0.56, 0.73, NaN])
    assert.equal(needsContinuousFrames(progress, true), false);
  for (const progress of [0.57, 0.64, 0.72, 0.74, 0.8, 1])
    assert.equal(needsContinuousFrames(progress, true), true);
  for (const progress of [0, 0.64, 0.8, 1])
    assert.equal(needsContinuousFrames(progress, false), false);
  // Reversing out of the burning sequence must let the render loop sleep again.
  assert.deepEqual([1, 0.8, 0.64, 0.5, 0].map(p => needsContinuousFrames(p, true)), [true, true, true, false, false]);
});

function scheduler(withIdle: boolean) {
  let id = 0;
  const frames = new Map<number, FrameRequestCallback>();
  const background = new Map<number, () => void>();
  const schedule = (callback: () => void) => { background.set(++id, callback); return id; };
  const host = {
    requestAnimationFrame: (callback: FrameRequestCallback) => { frames.set(++id, callback); return id; },
    cancelAnimationFrame: (key: number) => { frames.delete(key); },
    setTimeout: schedule,
    clearTimeout: (key: number) => { background.delete(key); },
    ...(withIdle ? {
      requestIdleCallback: schedule,
      cancelIdleCallback: (key: number) => { background.delete(key); },
    } : {}),
  } as Parameters<typeof scheduleSceneStart>[0];
  return {
    host,
    frame() { const tasks = [...frames.values()]; frames.clear(); tasks.forEach(task => task(0)); },
    background() { const tasks = [...background.values()]; background.clear(); tasks.forEach(task => task()); },
  };
}

for (const withIdle of [true, false]) {
  test(`3D starts after paint and background scheduling (${withIdle ? "idle" : "timeout fallback"})`, () => {
    const queue = scheduler(withIdle);
    let starts = 0;
    scheduleSceneStart(queue.host, () => starts++);
    queue.background();
    assert.equal(starts, 0);
    queue.frame();
    queue.background();
    assert.equal(starts, 0);
    queue.frame();
    assert.equal(starts, 0);
    queue.background();
    assert.equal(starts, 1);
  });

  test(`leaving the viewport cancels pending startup at every stage (${withIdle ? "idle" : "timeout fallback"})`, () => {
    for (const elapsedFrames of [0, 1, 2]) {
      const queue = scheduler(withIdle);
      let starts = 0;
      const cancel = scheduleSceneStart(queue.host, () => starts++);
      for (let i = 0; i < elapsedFrames; i++) queue.frame();
      cancel();
      queue.frame();
      queue.frame();
      queue.background();
      assert.equal(starts, 0);
    }
  });
}
