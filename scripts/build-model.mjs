import { readFile, mkdir, writeFile, readdir, unlink } from "node:fs/promises";
import { createHash } from "node:crypto";
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
  .jpeg({ quality: 85, chromaSubsampling: "4:4:4", mozjpeg: true })
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

// Small, deterministic material maps keep the asset self-contained. The grain
// belongs to the paper surface, so it responds to light rather than painted shade.
const width = 256;
const height = 512;
const heights = new Float32Array(width * height);
let seed = 8173;
const random = () => {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed / 4294967296;
};
for (let y = 0; y < height; y++)
  for (let x = 0; x < width; x++) {
    const u = x / width;
    heights[y * width + x] =
      random() * 0.22 +
      Math.sin(u * Math.PI * 2 * 41 + Math.sin(y * 0.024)) * 0.035 +
      Math.sin(u * Math.PI * 2 * 7 + y * 0.009) * 0.1;
  }
const normals = new Uint8Array(width * height * 3);
const surface = new Uint8Array(normals.length);
const sample = (x, y) => heights[((y + height) % height) * width + ((x + width) % width)];
for (let y = 0; y < height; y++)
  for (let x = 0; x < width; x++) {
    const i = (y * width + x) * 3;
    const normal = new THREE.Vector3(
      (sample(x - 1, y) - sample(x + 1, y)) * 0.65,
      (sample(x, y - 1) - sample(x, y + 1)) * 0.65,
      1,
    ).normalize();
    normals[i] = Math.round((normal.x * 0.5 + 0.5) * 255);
    normals[i + 1] = Math.round((normal.y * 0.5 + 0.5) * 255);
    normals[i + 2] = Math.round((normal.z * 0.5 + 0.5) * 255);
    surface[i] = 255;
    surface[i + 1] = Math.round(151 + sample(x, y) * 32);
    surface[i + 2] = 0;
  }
const embeddedMap = async (name, data) => document.createTexture(name)
  .setImage(await sharp(data, { raw: { width, height, channels: 3 } }).png().toBuffer())
  .setMimeType("image/png");
const normalMap = await embeddedMap("Paper fibres and fine wrinkles", normals);
const roughnessMap = await embeddedMap("Uneven paper finish", surface);
const paper = document
  .createMaterial("Printed satin paper")
  .setBaseColorTexture(texture)
  .setNormalTexture(normalMap)
  .setNormalScale(0.7)
  .setMetallicRoughnessTexture(roughnessMap)
  .setRoughnessFactor(1)
  .setMetallicFactor(0);
const cap = document
  .createMaterial("Matte charcoal top cap")
  .setBaseColorFactor([0.018, 0.014, 0.012, 1])
  .setNormalTexture(normalMap)
  .setNormalScale(2.5)
  .setRoughnessFactor(1);
const rim = document
  .createMaterial("Blue paper edge")
  .setBaseColorFactor([0.075, 0.28, 0.57, 1])
  .setRoughnessFactor(0.85);
const green = document
  .createMaterial("Green braided fuse")
  .setBaseColorFactor([0.018, 0.19, 0.065, 1])
  .setRoughnessFactor(0.76);
const thread = document
  .createMaterial("Fuse thread")
  .setBaseColorFactor([0.23, 0.34, 0.105, 1])
  .setRoughnessFactor(0.88);
const cardboard = document.createMaterial("Uncoated cardboard edge")
  .setBaseColorFactor([0.23, 0.16, 0.083, 1])
  .setNormalTexture(normalMap)
  .setRoughnessFactor(0.94);
const baseEdge = document.createMaterial("Folded green paper edge")
  .setBaseColorFactor([0.23, 0.34, 0.024, 1])
  .setRoughnessFactor(0.72);

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
        .setArray(geometry.getAttribute("position").count <= 65536
          ? new Uint16Array(geometry.index.array)
          : new Uint32Array(geometry.index.array))
        .setBuffer(buffer),
    );
  const node = document
    .createNode(name)
    .setMesh(document.createMesh(name).addPrimitive(primitive));
  root.addChild(node);
  geometry.dispose();
  return node;
}

function paperShell(start = Math.PI, length = Math.PI * 2, segments = 128, overlap = 0) {
  const geometry = new THREE.CylinderGeometry(0.168, 0.69, 3.18, segments, 24, true, start, length);
  const positions = geometry.getAttribute("position");
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i);
    const y = positions.getY(i);
    const z = positions.getZ(i);
    const angle = Math.atan2(x, z);
    const radius = Math.hypot(x, z);
    // Subtle creases, strongest near the folded base; periodic at the UV seam.
    const crease = (Math.sin(angle * 19 + y * 1.2) * 0.0008 +
      Math.sin(angle * 37 - y * 2.1) * 0.00035) * (1.3 - y * 0.2);
    const r = radius + crease + overlap;
    positions.setXYZ(i, x * r / radius, y, z * r / radius);
  }
  geometry.computeVertexNormals();
  return geometry;
}
mesh("Continuous 360 wrapper", paperShell(), paper);
const seam = paperShell(Math.PI, 0.038, 2, 0.0014);
const seamUV = seam.getAttribute("uv");
for (let i = 0; i < seamUV.count; i++)
  seamUV.setX(i, seamUV.getX(i) * 0.038 / (Math.PI * 2));
mesh("Overlapping paper seam", seam, paper);
// The reference has a solid, shallow black dome above the blue wrapper.
// Start slightly inside the rim to close the shell; the fuse emerges through it.
const capProfile = [new THREE.Vector2(0.166, -0.008)];
for (let i = 0; i <= 8; i++) {
  const angle = (i / 8) * Math.PI / 2;
  capProfile.push(new THREE.Vector2(
    i === 8 ? 0 : 0.166 * Math.cos(angle),
    0.06 * Math.sin(angle),
  ));
}
mesh("Raised black top cap", new THREE.LatheGeometry(capProfile, 28), cap)
  .setTranslation([0, 1.59, 0]);
mesh("Inner cardboard collar", new THREE.CylinderGeometry(0.16, 0.157, 0.034, 96, 1, true),
  cardboard.setDoubleSided(true),
).setTranslation([0, 1.57, 0]);
mesh(
  "Bottom paper edge",
  new THREE.CylinderGeometry(0.687, 0.685, 0.018, 128),
  baseEdge,
).setTranslation([0, -1.59, 0]);
mesh("Recessed cardboard base", new THREE.CylinderGeometry(0.675, 0.675, 0.012, 96),
  cardboard,
).setTranslation([0, -1.588, 0]);
mesh(
  "Rolled top rim",
  new THREE.TorusGeometry(0.164, 0.004, 8, 96).rotateX(Math.PI / 2),
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
for (const direction of [1, -1]) {
  const points = [];
  for (let i = 0; i <= 240; i++) {
    const a = (i / 240) * Math.PI * 2 * 35 * direction;
    points.push(curve.getPointAt(i / 240)
      .addScaledVector(frames.normals[i], Math.cos(a) * 0.012)
      .addScaledVector(frames.binormals[i], Math.sin(a) * 0.012));
  }
  mesh(direction === 1 ? "Braided thread detail" : "Braided cross weave",
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),
      THREAD_SEGMENTS, 0.0022, THREAD_RADIAL_SEGMENTS, false),
    thread);
}
root.setExtras({
  source: "https://www.globi-vulkan.ch/index.html",
  note: "Illustrated reconstruction from a single front photograph; unseen wrapper scenery is artistic, not a scan of the production label.",
  units:
    "Metres in file are presentation units, not verified physical dimensions.",
});
const binary = await new NodeIO().writeBinary(document);
const hash = createHash("sha256").update(binary).digest("hex").slice(0, 16);
const filename = `globi-vulkan.${hash}.glb`;
await writeFile(`public/assets/${filename}`, binary);
await writeFile("src/data/product-asset.json", JSON.stringify({ url: `/assets/${filename}` }, null, 2) + "\n");
for (const previous of await readdir("public/assets")) {
  if (previous !== filename && /^globi-vulkan(?:\.[a-f0-9]{16})?\.glb$/.test(previous))
    await unlink(`public/assets/${previous}`);
}
console.log(`Built ${filename}: ${binary.byteLength} bytes with embedded 360 wrapper.`);
