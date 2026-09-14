export const clamp = (value: number, min = 0, max = 1) =>
  Math.min(max, Math.max(min, value));
const smooth = (v: number) => {
  const t = clamp(v);
  return t * t * (3 - 2 * t);
};

export function sceneAtProgress(value: number) {
  const progress = clamp(Number.isFinite(value) ? value : 0);
  const turn = smooth((progress - 0.07) / 0.48);
  // Finish the rotation, consume the fuse from tip to base, then start the fountain.
  const fuseBurn = clamp((progress - 0.56) / 0.17);
  const ignition = smooth((progress - 0.73) / 0.05);
  const fountain = smooth((progress - 0.78) / 0.14);
  const settle = smooth((progress - 0.58) / 0.24);
  return {
    progress,
    rotation: turn * Math.PI * 2,
    tilt: -0.16 * (1 - smooth(progress / 0.5)),
    scale: 1 - settle * 0.58,
    drop: settle * 1.22,
    settle,
    fuseBurn,
    ignition,
    fountain,
    phase: progress < 0.27 ? 0 : progress < 0.62 ? 1 : 2,
  };
}
