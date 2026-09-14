import { clamp } from "./motion";

type Viewport = { width: number; height: number };

export function storyViewport(
  previous: Viewport | undefined,
  current: Viewport,
  coarsePointer: boolean,
): Viewport {
  // Mobile browser chrome changes height during a swipe. Keep the story's
  // geometry fixed until the width changes (including device rotation).
  return coarsePointer && previous?.width === current.width
    ? previous
    : current;
}

export function storyProgress(top: number, height: number, stickyHeight: number) {
  // Match the actual sticky travel, including its CSS minimum height.
  return clamp(-top / Math.max(1, height - stickyHeight));
}
