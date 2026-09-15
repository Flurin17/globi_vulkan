/** Visual timing sampled from the Globi-Vulkan reference, condensed for the hero.
 * Particle flight remains in real seconds; only the overall burn is shortened.
 */
export const FOUNTAIN_CYCLE_SECONDS = 28;
export const FOUNTAIN_TIMING = {
  ignitionEnd: 0.7,
  greenStartFade: 3,
  greenEnd: 6,
  growthStart: 4,
  growthEnd: 15,
  burnoutStart: 21,
  burnoutEnd: 23,
} as const;

const smoothstep = (start: number, end: number, value: number) => {
  const t = Math.min(1, Math.max(0, (value - start) / (end - start)));
  return t * t * (3 - 2 * t);
};

export function fountainEnvelope(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return { power: 0, green: 0 };
  const t = seconds % FOUNTAIN_CYCLE_SECONDS;
  const timing = FOUNTAIN_TIMING;
  return {
    power: smoothstep(0, timing.ignitionEnd, t) *
      (0.28 + 0.72 * smoothstep(timing.growthStart, timing.growthEnd, t)) *
      (1 - smoothstep(timing.burnoutStart, timing.burnoutEnd, t)),
    green: 1 - smoothstep(timing.greenStartFade, timing.greenEnd, t),
  };
}

// Share the burn boundaries with the GPU so light, jet, sparks and smoke agree.
export const fountainTimingGLSL = `
  float burnPower(float seconds) {
    if (seconds < 0.0) return 0.0;
    float t = mod(seconds, ${FOUNTAIN_CYCLE_SECONDS.toFixed(1)});
    return smoothstep(0.0, ${FOUNTAIN_TIMING.ignitionEnd.toFixed(1)}, t)
      * mix(.28, 1.0, smoothstep(${FOUNTAIN_TIMING.growthStart.toFixed(1)}, ${FOUNTAIN_TIMING.growthEnd.toFixed(1)}, t))
      * (1.0 - smoothstep(${FOUNTAIN_TIMING.burnoutStart.toFixed(1)}, ${FOUNTAIN_TIMING.burnoutEnd.toFixed(1)}, t));
  }
`;

/** Fixed seeds avoid allocations/random-number generation in the render loop. */
export function createSparkAttributes(compact: boolean) {
  const parents = compact ? 1200 : 2400;
  const seeds: number[] = [];
  const branches: number[] = [];
  let state = 0x67ab21;
  const random = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
  for (let i = 0; i < parents; i++) {
    const seed = [random(), random(), random(), random()];
    seeds.push(...seed);
    branches.push(0);
    // A few grains break into a short-lived cluster, as in the silver crackle.
    if (i % 7 === 0) {
      for (let branch = 1; branch <= 3; branch++) {
        seeds.push(...seed);
        branches.push(branch);
      }
    }
  }
  return { seeds: new Float32Array(seeds), branches: new Float32Array(branches) };
}
