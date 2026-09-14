import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { NodeIO } from "@gltf-transform/core";
import { sceneAtProgress } from "../src/lib/motion";
import { filterRetailers, directionsUrl } from "../src/lib/retailers";
import { retailers } from "../src/data/retailers";
import { remainingFuseIndices } from "../src/lib/fuse";
import { probeWebGL, isStaticPresentation } from "../src/lib/scene-support";

test("GPU probe releases its temporary context and falls back for unavailable or blocked WebGL", () => {
  let released = false;
  assert.equal(
    probeWebGL(() => ({
      getContext: () => ({
        getExtension: () => ({
          loseContext: () => {
            released = true;
          },
        }),
      }),
    })),
    true,
  );
  assert.ok(released);
  assert.equal(
    probeWebGL(() => ({ getContext: () => null })),
    false,
  );
  assert.equal(
    probeWebGL(() => {
      throw new Error("Graphics blocked");
    }),
    false,
  );
  assert.equal(
    isStaticPresentation(true, true, false),
    true,
    "Reduced motion bypasses a capable GPU",
  );
  assert.equal(
    isStaticPresentation(false, false, false),
    true,
    "Unavailable GPU uses the poster",
  );
  assert.equal(
    isStaticPresentation(false, true, true),
    true,
    "Context loss or load failure restores the poster",
  );
  assert.equal(isStaticPresentation(false, true, false), false);
});

test("360° journey completes before ignition, reverses, and clamps invalid scroll input", () => {
  assert.equal(sceneAtProgress(0).rotation, 0);
  assert.equal(sceneAtProgress(0.56).rotation, Math.PI * 2);
  assert.equal(sceneAtProgress(0.56).ignition, 0);
  assert.equal(sceneAtProgress(1).fountain, 1);
  const forward = [0.15, 0.3, 0.55, 0.8].map(sceneAtProgress);
  const backward = [0.8, 0.55, 0.3, 0.15].map(sceneAtProgress).reverse();
  assert.deepEqual(forward, backward);
  assert.deepEqual(sceneAtProgress(-20), sceneAtProgress(0));
  assert.deepEqual(sceneAtProgress(50), sceneAtProgress(1));
  assert.deepEqual(sceneAtProgress(NaN), sceneAtProgress(0));
});

test("retailer search handles Swiss spelling, multiple terms, blank input and no results", () => {
  assert.equal(filterRetailers(retailers, " ").length, 37);
  assert.deepEqual(
    filterRetailers(retailers, "8500 Felix").map((r) => r.id),
    ["frauenfeld"],
  );
  assert.equal(filterRetailers(retailers, "  MÜLLHEIM  ").length, 1);
  assert.equal(filterRetailers(retailers, "Muellheim").length, 1);
  assert.equal(filterRetailers(retailers, "Pfäffikon")[0].postcode, "8808");
  assert.equal(filterRetailers(retailers, "9500").length, 2);
  assert.equal(filterRetailers(retailers, "unlisted-place-12345").length, 0);
});

test("fuse burns fully before the fountain starts and rebuilds correctly on reverse scroll", () => {
  assert.equal(sceneAtProgress(0.55).fuseBurn, 0);
  assert.equal(sceneAtProgress(0.64).fountain, 0);
  assert.ok(
    sceneAtProgress(0.64).fuseBurn > 0 && sceneAtProgress(0.64).fuseBurn < 1,
  );
  assert.equal(sceneAtProgress(0.74).fuseBurn, 1);
  assert.equal(sceneAtProgress(0.8).fuseBurn, 1);
  assert.ok(sceneAtProgress(0.8).fountain > 0);
  assert.equal(remainingFuseIndices(sceneAtProgress(0.8).fuseBurn), 0);
  assert.equal(
    remainingFuseIndices(sceneAtProgress(0.55).fuseBurn),
    96 * 8 * 6,
  );
  assert.ok(remainingFuseIndices(0.7) < remainingFuseIndices(0.3));
  assert.equal(
    remainingFuseIndices(0.5) % (8 * 6),
    0,
    "Draw range ends on complete tube segments",
  );
});

test("source directory keeps duplicate towns, seasonal notes and all four website links", () => {
  assert.equal(new Set(retailers.map((r) => r.id)).size, 37);
  assert.equal(retailers.filter((r) => r.website).length, 4);
  assert.equal(
    retailers.find((r) => r.id === "frauenfeld")?.note,
    "Vor 1. August und Silvester",
  );
  assert.equal(retailers.filter((r) => r.town === "Wil").length, 2);
  const url = new URL(
    directionsUrl(retailers.find((r) => r.id === "frauenfeld")!),
  );
  assert.equal(
    url.searchParams.get("destination"),
    "Thurgipark, 8500 Frauenfeld, Schweiz",
  );
});

test("standalone GLB contains textured full-circle geometry, fuse and valid mesh data", async () => {
  const binary = await readFile("public/assets/globi-vulkan.glb");
  assert.equal(binary.readUInt32LE(0), 0x46546c67);
  assert.ok(binary.byteLength < 2_500_000, "Model should stay below 2.5 MB");
  const document = await new NodeIO().readBinary(binary);
  assert.equal(document.getRoot().listTextures().length, 3);
  assert.ok(
    document.getRoot().listTextures()[0].getImage()!.byteLength > 10000,
  );
  assert.ok(
    document
      .getRoot()
      .listNodes()
      .some((n) => n.getName() === "Curved green fuse"),
  );
  const wrapper = document
    .getRoot()
    .listMeshes()
    .find((m) => m.getName() === "Continuous 360 wrapper")!;
  const primitive = wrapper.listPrimitives()[0];
  const material = primitive.getMaterial()!;
  assert.ok(material.getBaseColorTexture()?.getImage());
  assert.ok(material.getNormalTexture()?.getImage());
  assert.ok(material.getMetallicRoughnessTexture()?.getImage());
  for (const mesh of document.getRoot().listMeshes()) {
    for (const part of mesh.listPrimitives()) {
      const positions = part.getAttribute("POSITION")!.getArray()!;
      const normals = part.getAttribute("NORMAL")!.getArray()!;
      assert.ok(Array.from(positions).every(Number.isFinite), mesh.getName());
      assert.ok(Array.from(normals).every(Number.isFinite), mesh.getName());
      assert.ok(Array.from(part.getIndices()!.getArray()!).every((i) => i < positions.length / 3));
    }
  }
  for (const name of ["Braided thread detail", "Braided cross weave"]) {
    const braid = document.getRoot().listMeshes().find((m) => m.getName() === name)!;
    assert.equal(braid.listPrimitives()[0].getIndices()!.getCount(), 600 * 4 * 6);
  }
  const uv = primitive.getAttribute("TEXCOORD_0")!.getArray()!;
  assert.ok(Array.from(uv).every(Number.isFinite));
  assert.ok(Array.from(uv).every((v) => v >= 0 && v <= 1));
  const positions = primitive.getAttribute("POSITION")!.getArray()!;
  // All 129 vertices in every ring have a matching first/last position at the rear seam.
  for (let row = 0; row < 25; row++)
    for (let axis = 0; axis < 3; axis++) {
      assert.ok(
        Math.abs(
          positions[row * 129 * 3 + axis] -
            positions[(row * 129 + 128) * 3 + axis],
        ) < 1e-6,
      );
    }
});
