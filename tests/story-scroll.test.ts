import { test } from "node:test";
import assert from "node:assert/strict";
import { storyProgress, storyViewport } from "../src/lib/story-scroll";
import { sceneAtProgress } from "../src/lib/motion";

test("mobile toolbar expansion cannot advance or reverse the volcano at a fixed scroll position", () => {
  let viewport = storyViewport(undefined, { width: 390, height: 664 }, true);
  const progress = () => storyProgress(-610, viewport.height * 2.6, 740);
  const initial = sceneAtProgress(progress());
  for (const height of [720, 780, 844, 780, 720, 664]) {
    viewport = storyViewport(viewport, { width: 390, height }, true);
    assert.deepEqual(sceneAtProgress(progress()), initial);
  }
});

test("device rotation and desktop resizing update the story viewport", () => {
  const portrait = { width: 390, height: 664 };
  const landscape = { width: 844, height: 390 };
  assert.deepEqual(storyViewport(portrait, landscape, true), landscape);
  assert.deepEqual(storyViewport(landscape, portrait, true), portrait);
  assert.deepEqual(
    storyViewport(portrait, { width: 390, height: 800 }, false),
    { width: 390, height: 800 },
  );
});

test("mobile framing stays continuous when crossing the final headline in either direction", () => {
  const before = sceneAtProgress(0.61999);
  const after = sceneAtProgress(0.62001);
  assert.notEqual(before.phase, after.phase);
  assert.ok(Math.abs(after.settle - before.settle) < 0.001);
  assert.equal(sceneAtProgress(0).settle, 0);
  assert.equal(sceneAtProgress(1).settle, 1);
});

test("scroll reaches the final scene exactly at sticky release and reverses on short screens", () => {
  const height = 664 * 2.6;
  const stickyHeight = 740;
  const travel = height - stickyHeight;
  const positions = [0, 0.27, 0.56, 0.62, 0.73, 0.92, 1];
  const forward = positions.map((p) =>
    sceneAtProgress(storyProgress(-p * travel, height, stickyHeight)),
  );
  const backward = positions.toReversed().map((p) =>
    sceneAtProgress(storyProgress(-p * travel, height, stickyHeight)),
  ).toReversed();
  assert.deepEqual(forward, backward);
  assert.equal(forward.at(-1)?.progress, 1);
  assert.equal(forward.at(-1)?.fountain, 1);
  assert.equal(storyProgress(60, height, stickyHeight), 0);
  assert.equal(storyProgress(-travel - 60, height, stickyHeight), 1);
  assert.equal(storyProgress(0, stickyHeight, stickyHeight), 0);
});
