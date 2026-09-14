import { sceneAtProgress } from "./motion";

export function needsContinuousFrames(progress: number, active: boolean) {
  if (!active) return false;
  const scene = sceneAtProgress(progress);
  // Floating-point subtraction can leave the completed fuse just below 1.
  return (scene.fuseBurn > 0 && scene.fuseBurn < 1 - Number.EPSILON * 8) || scene.ignition > 0;
}

// Wait for the poster to paint, then give input/layout work priority. Safari
// without requestIdleCallback uses a cancellable timeout after the two frames.
export function scheduleSceneStart(host: Pick<Window,
  "requestAnimationFrame" | "cancelAnimationFrame" | "setTimeout" | "clearTimeout"
> & Partial<Pick<Window, "requestIdleCallback" | "cancelIdleCallback">>, start: () => void) {
  let frame = 0;
  let idle: number | undefined;
  let timer: number | undefined;
  frame = host.requestAnimationFrame(() => {
    frame = host.requestAnimationFrame(() => {
      if (host.requestIdleCallback) idle = host.requestIdleCallback(start, { timeout: 1500 });
      else timer = host.setTimeout(start, 200);
    });
  });
  return () => {
    host.cancelAnimationFrame(frame);
    if (idle !== undefined) host.cancelIdleCallback?.(idle);
    if (timer !== undefined) host.clearTimeout(timer);
  };
}
