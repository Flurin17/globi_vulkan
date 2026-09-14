type Context = {
  getExtension: (name: string) => { loseContext: () => void } | null;
};

export function probeWebGL(
  createCanvas: () => { getContext: (kind: "webgl2") => Context | null },
) {
  try {
    const context = createCanvas().getContext("webgl2");
    context?.getExtension("WEBGL_lose_context")?.loseContext();
    return !!context;
  } catch {
    return false;
  }
}

export function isStaticPresentation(
  reducedMotion: boolean,
  webgl: boolean | null,
  failed: boolean,
) {
  return reducedMotion || failed || webgl === false;
}
