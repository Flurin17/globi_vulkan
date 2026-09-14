// Shared modelling data: parameter 0 is inside the cone, parameter 1 is the outer tip.
export const FUSE_POINTS: [number, number, number][] = [
  [0, 1.58, 0],
  [0.08, 1.77, 0.015],
  [0.24, 1.8, 0.02],
  [0.46, 1.66, 0.035],
  [0.67, 1.43, 0.06],
];
export const FUSE_SEGMENTS = 96;
export const FUSE_RADIAL_SEGMENTS = 8;
export const THREAD_SEGMENTS = 600;
export const THREAD_RADIAL_SEGMENTS = 4;

export function remainingFuseIndices(
  burn: number,
  segments = FUSE_SEGMENTS,
  radialSegments = FUSE_RADIAL_SEGMENTS,
) {
  const consumed = Math.max(0, Math.min(1, burn));
  return Math.floor((1 - consumed) * segments) * radialSegments * 6;
}
