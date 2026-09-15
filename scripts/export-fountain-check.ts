import { mkdirSync, writeFileSync } from "node:fs";
import * as THREE from "three";
import { createSparkAttributes } from "../src/lib/fountain";
import { sparkVertexShader, sparkFragmentShader } from "../src/lib/fountain-shaders";
import { sceneAtProgress } from "../src/lib/motion";

const state = sceneAtProgress(1);
const source = new THREE.Vector3(0, 1.59, 0)
  .applyEuler(new THREE.Euler(.36, state.rotation, state.tilt)).multiplyScalar(state.scale);
source.y -= .05 + state.drop;
const modelView = new THREE.Matrix4().makeTranslation(source.x, source.y - .25, source.z - 6.8);
const plane = new THREE.PlaneGeometry(1, 1);
const cases = [false, true].map((compact) => {
  const { seeds, branches } = createSparkAttributes(compact);
  const width = compact ? 300 : 720;
  const height = compact ? 470 : 780;
  const camera = new THREE.PerspectiveCamera(36, width / height, .1, 1000);
  return { compact, width, height, seeds: [...seeds], branches: [...branches], projection: camera.projectionMatrix.toArray() };
});
mkdirSync("artifacts/fountain-check", { recursive: true });
writeFileSync("artifacts/fountain-check/input.json", JSON.stringify({
  vertex: sparkVertexShader, fragment: sparkFragmentShader,
  positions: [...plane.attributes.position.array], uv: [...plane.attributes.uv.array],
  indices: [...plane.index!.array], modelView: modelView.toArray(), ground: -1.86 - source.y, cases,
}));
plane.dispose();
