import { readFile, mkdir } from "node:fs/promises";
import { Document, NodeIO } from "@gltf-transform/core";
import * as THREE from "three";
import sharp from "sharp";
import {
  FUSE_POINTS,
  FUSE_SEGMENTS,
  FUSE_RADIAL_SEGMENTS,
  THREAD_SEGMENTS,
  THREAD_RADIAL_SEGMENTS,
} from "../src/lib/fuse.ts";

// Reproducible, standalone glTF 2.0 asset. No browser or Blender dependency.
await mkdir("public/assets", { recursive: true });
await sharp("public/assets/wrapper-source.png")
  .jpeg({ quality: 94, chromaSubsampling: "4:4:4" })
  .toFile("public/assets/globi-wrapper.jpg");
const document = new Document();
const buffer = document.createBuffer();
const scene = document.createScene("Globi-Vulkan");
const root = document.createNode("Globi-Vulkan");
scene.addChild(root);
document.getRoot().setDefaultScene(scene);
document.getRoot().getAsset().generator = "Globi-Vulkan asset builder";
const texture = document
  .createTexture("Full 360 degree illustrated wrapper")
  .setImage(await readFile("public/assets/globi-wrapper.jpg"))
  .setMimeType("image/jpeg");
const paper = document
  .createMaterial("Printed matte paper")
  .setBaseColorTexture(texture)
  .setRoughnessFactor(0.82)
  .setMetallicFactor(0);
const inner = document
  .createMaterial("Dark top opening")
  .setBaseColorFactor([0.055, 0.044, 0.03, 1])
  .setRoughnessFactor(1);
const rim = document
  .createMaterial("Blue paper edge")
  .setBaseColorFactor([0.075, 0.28, 0.57, 1])
  .setRoughnessFactor(0.85);
const green = document
  .createMaterial("Green braided fuse")
  .setBaseColorFactor([0.045, 0.18, 0.075, 1])
  .setRoughnessFactor(0.92);
const thread = document
  .createMaterial("Fuse thread")
  .setBaseColorFactor([0.24, 0.31, 0.13, 1])
  .setRoughnessFactor(0.95);

function mesh(name, geometry, material) {
  const primitive = document.createPrimitive().setMaterial(material);
  for (const [attr, semantic, type] of [
    ["position", "POSITION", "VEC3"],
    ["normal", "NORMAL", "VEC3"],
    ["uv", "TEXCOORD_0", "VEC2"],
  ]) {
    const source = geometry.getAttribute(attr);
    if (!source) continue;
    const values = new Float32Array(source.array);
    if (attr === "uv")
      for (let i = 1; i < values.length; i += 2) values[i] = 1 - values[i];
    primitive.setAttribute(
      semantic,
      document
        .createAccessor()
        .setType(type)
        .setArray(values)
        .setBuffer(buffer),
    );
  }
  if (geometry.index)
    primitive.setIndices(
      document
        .createAccessor()
        .setType("SCALAR")
        .setArray(new Uint32Array(geometry.index.array))
        .setBuffer(buffer),
    );
  const node = document
    .createNode(name)
    .setMesh(document.createMesh(name).addPrimitive(primitive));
  root.addChild(node);
  geometry.dispose();
  return node;
}

mesh(
  "Continuous 360 wrapper",
  new THREE.CylinderGeometry(0.168, 0.625, 3.18, 128, 24, true, Math.PI),
  paper,
);
mesh(
  "Top opening",
  new THREE.CylinderGeometry(0.158, 0.158, 0.012, 64),
  inner,
).setTranslation([0, 1.575, 0]);
mesh(
  "Bottom paper edge",
  new THREE.CylinderGeometry(0.625, 0.625, 0.015, 128),
  paper,
).setTranslation([0, -1.59, 0]);
mesh(
  "Rolled top rim",
  new THREE.TorusGeometry(0.164, 0.0045, 8, 96).rotateX(Math.PI / 2),
  rim,
).setTranslation([0, 1.59, 0]);
const curve = new THREE.CatmullRomCurve3(
  FUSE_POINTS.map((p) => new THREE.Vector3(...p)),
);
mesh(
  "Curved green fuse",
  new THREE.TubeGeometry(
    curve,
    FUSE_SEGMENTS,
    0.012,
    FUSE_RADIAL_SEGMENTS,
    false,
  ),
  green,
);
const frames = curve.computeFrenetFrames(240, false);
const points = [];
for (let i = 0; i <= 240; i++) {
  const a = (i / 240) * Math.PI * 2 * 35;
  points.push(
    curve
      .getPointAt(i / 240)
      .addScaledVector(frames.normals[i], Math.cos(a) * 0.012)
      .addScaledVector(frames.binormals[i], Math.sin(a) * 0.012),
  );
}
mesh(
  "Braided thread detail",
  new THREE.TubeGeometry(
    new THREE.CatmullRomCurve3(points),
    THREAD_SEGMENTS,
    0.0023,
    THREAD_RADIAL_SEGMENTS,
    false,
  ),
  thread,
);
root.setExtras({
  source: "https://www.globi-vulkan.ch/index.html",
  note: "Illustrated reconstruction from a single front photograph; unseen wrapper scenery is artistic, not a scan of the production label.",
  units:
    "Metres in file are presentation units, not verified physical dimensions.",
});
await new NodeIO().write("public/assets/globi-vulkan.glb", document);
console.log("Built public/assets/globi-vulkan.glb with embedded 360 wrapper.");
