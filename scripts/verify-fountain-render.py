"""Render the shipped spark shader with the front-face culling used by Three.js.

Requires a native OpenGL 3.3 context; run with pnpm test:fountain-gpu.
"""
import json
import struct
from pathlib import Path

import moderngl

pack = lambda values: struct.pack(f"{len(values)}f", *values)
data = json.loads(Path("artifacts/fountain-check/input.json").read_text())
ctx = moderngl.create_standalone_context(require=330)
# Three.js supplies these declarations and converts GLSL1 to GLSL3 in WebGL2.
vertex = data["vertex"].replace("attribute ", "in ").replace("varying ", "out ")
fragment = data["fragment"].replace("varying ", "in ").replace("gl_FragColor", "fragColor")
program = ctx.program(
    vertex_shader="#version 330\nuniform mat4 modelViewMatrix;\nuniform mat4 projectionMatrix;\nin vec3 position;\nin vec2 uv;\n" + vertex,
    fragment_shader="#version 330\nout vec4 fragColor;\n" + fragment,
)
positions = ctx.buffer(pack(data["positions"]))
uv = ctx.buffer(pack(data["uv"]))
indices = ctx.buffer(struct.pack(f'{len(data["indices"])}I', *data["indices"]))
program["modelViewMatrix"].write(pack(data["modelView"]))
program["uReveal"].value = 1
program["uGroundY"].value = data["ground"]
program["uRatio"].value = 1
ctx.front_face = "ccw"
ctx.cull_face = "back"
ctx.enable(moderngl.BLEND)
ctx.blend_func = moderngl.SRC_ALPHA, moderngl.ONE

for case in data["cases"]:
    size = case["width"], case["height"]
    seeds = ctx.buffer(pack(case["seeds"]))
    branches = ctx.buffer(pack(case["branches"]))
    vao = ctx.vertex_array(program, [
        (positions, "3f", "position"), (uv, "2f", "uv"),
        (seeds, "4f/i", "aSeed"), (branches, "1f/i", "aBranch"),
    ], indices)
    target = ctx.simple_framebuffer(size)
    target.use()
    program["projectionMatrix"].write(pack(case["projection"]))
    program["uResolution"].value = size
    heights = {}
    for seconds in (1, 2.5, 16, 20):
        program["uTime"].value = seconds
        images = []
        for cull in (False, True):
            (ctx.enable if cull else ctx.disable)(moderngl.CULL_FACE)
            target.clear(0, 0, 0, 0)
            vao.render(instances=len(case["branches"]))
            images.append(target.read(components=3))
        bright = sum(images[1][i] > 32 for i in range(0, len(images[1]), 3))
        assert bright > 100, f"{size} at {seconds}s: sparks disappear with face culling ({bright} lit pixels)"
        assert images[0] == images[1], f"{size} at {seconds}s: some spark triangles face backwards"
        lit_rows = [i // (size[0] * 3) for i in range(0, len(images[1]), 3) if images[1][i] > 32]
        heights[seconds] = max(lit_rows) - min(lit_rows)
        print(f"PASS {size[0]}x{size[1]} at {seconds}s: {bright} lit pixels, all triangles front-facing")
    assert heights[2.5] >= heights[16] * .9, f"{size}: fountain has not reached full height by 2.5s"
    print(f"PASS {size[0]}x{size[1]}: plume at 2.5s reaches {heights[2.5] / heights[16]:.0%} of mature height")
    vao.release()
    target.release()
    seeds.release()
    branches.release()
ctx.release()
