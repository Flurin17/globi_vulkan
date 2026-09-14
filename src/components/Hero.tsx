"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { ArrowDown, MoveUpRight, Pause, Play } from "lucide-react";
import {
  Component,
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { clamp, sceneAtProgress } from "@/lib/motion";
import { probeWebGL, isStaticPresentation } from "@/lib/scene-support";

const Scene = dynamic(() => import("./ProductScene"), { ssr: false });
const subscribeReduced = (listener: () => void) => {
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", listener);
  return () => query.removeEventListener("change", listener);
};
const reducedSnapshot = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const serverSnapshot = () => false;
const subscribeCapability = () => () => {};
let webGLCapability: boolean | undefined;
function capableSnapshot() {
  if (webGLCapability !== undefined) return webGLCapability;
  webGLCapability = probeWebGL(() => document.createElement("canvas"));
  return webGLCapability;
}

class SceneBoundary extends Component<
  { children: ReactNode; onError: () => void },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onError();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export default function Hero({ children }: { children: ReactNode }) {
  const container = useRef<HTMLElement>(null);
  const progressBar = useRef<HTMLDivElement>(null);
  const progress = useRef(0);
  const [phase, setPhase] = useState(0);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [paused, setPaused] = useState(false);
  const reduced = useSyncExternalStore(
    subscribeReduced,
    reducedSnapshot,
    serverSnapshot,
  );
  const webgl = useSyncExternalStore<boolean | null>(
    subscribeCapability,
    capableSnapshot,
    () => null,
  );
  const staticMode = isStaticPresentation(reduced, webgl, failed);
  const onReady = useCallback(() => setReady(true), []);
  const onError = useCallback(() => {
    setFailed(true);
    setReady(false);
  }, []);

  useEffect(() => {
    let frame = 0;
    const measure = () => {
      frame = 0;
      if (!container.current) return;
      const rect = container.current.getBoundingClientRect();
      const value = staticMode
        ? 0
        : clamp(-rect.top / Math.max(1, rect.height - window.innerHeight));
      progress.current = value;
      const next = sceneAtProgress(value).phase;
      setPhase((previous) => (previous === next ? previous : next));
      if (progressBar.current)
        progressBar.current.style.transform = `scaleX(${value})`;
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [staticMode]);

  return (
    <section
      id="globi-vulkan"
      ref={container}
      className={`hero-story ${staticMode ? "static-story" : ""}`}
      aria-label="Der Globi-Vulkan"
      data-phase={staticMode ? 0 : phase}
    >
      <div className="hero-sticky">
        <div className="hero-inner shell">
          <div className="hero-copy">
            <div className="eyebrow">
              <span className="swiss-mark" aria-hidden="true">
                +
              </span>{" "}
              Ein echtes Stück Schweiz
            </div>
            <div className="hero-headlines">{children}</div>
            <a className="button button-red" href="#verkaufsstellen">
              Verkaufsstelle finden <ArrowUpRightIcon />
            </a>
            <a className="text-link hero-video-link" href="#erleben">
              <Play size={14} fill="currentColor" /> Den Vulkan in Aktion sehen
            </a>
          </div>
          <div
            className={`product-stage ${ready && !staticMode ? "scene-ready" : ""}`}
          >
            <div className="product-halo" aria-hidden="true" />
            <div className="swiss-seal">
              <span>Mit Globi.</span>
              <span className="seal-cross" aria-hidden="true">
                +
              </span>
              <span>Aus der Schweiz.</span>
            </div>
            <div className="poster-container">
              <Image
                src="/assets/product-poster.jpg"
                alt="Globi-Vulkan mit blauem Papiermantel, Globi und Schweizer Fahne"
                fill
                priority
                sizes="(max-width: 700px) 100vw, 50vw"
                className="product-poster"
              />
            </div>
            {webgl && !staticMode ? (
              <SceneBoundary onError={onError}>
                <Scene
                  progress={progress}
                  paused={paused}
                  onReady={onReady}
                  onError={onError}
                />
              </SceneBoundary>
            ) : null}
            <div className="product-caption">
              <span>Der Globi-Vulkan</span>
              <span>Goldene Fontäne mit Silberfunken</span>
            </div>
            {ready && !staticMode ? (
              <button
                type="button"
                className="motion-toggle"
                onClick={() => setPaused((v) => !v)}
                aria-label={
                  paused ? "Animation fortsetzen" : "Animation pausieren"
                }
                aria-pressed={paused}
              >
                {paused ? <Play size={16} /> : <Pause size={16} />}
              </button>
            ) : null}
          </div>
          <div className="hero-bottom">
            <a
              className="scroll-hint"
              href={staticMode ? "#erleben" : "#rundherum"}
            >
              <span className="scroll-icon">
                <ArrowDown size={18} />
              </span>
              <span>
                {staticMode
                  ? "Globi-Vulkan entdecken"
                  : "Scrollen. Drehen. Staunen."}
              </span>
            </a>
            <span className="hero-bottom-note">
              Kleiner Vulkan. Grosse Vorfreude.
            </span>
          </div>
        </div>
        <div className="story-progress" aria-hidden="true">
          <div ref={progressBar} />
        </div>
      </div>
      <span id="rundherum" className="story-anchor" aria-hidden="true" />
    </section>
  );
}

function ArrowUpRightIcon() {
  return <MoveUpRight size={19} strokeWidth={2.4} />;
}
