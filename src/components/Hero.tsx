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
import { sceneAtProgress } from "@/lib/motion";
import { storyProgress, storyViewport } from "@/lib/story-scroll";
import { probeWebGL, isStaticPresentation } from "@/lib/scene-support";
import { scheduleSceneStart } from "@/lib/scene-rendering";

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
type Connection = EventTarget & { saveData?: boolean };
const connection = () => (navigator as Navigator & { connection?: Connection }).connection;
const dataSaverSnapshot = () => connection()?.saveData === true;
const subscribeDataSaver = (listener: () => void) => {
  const network = connection();
  network?.addEventListener("change", listener);
  return () => network?.removeEventListener("change", listener);
};
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
  const sticky = useRef<HTMLDivElement>(null);
  const progressBar = useRef<HTMLDivElement>(null);
  const progress = useRef(0);
  const progressListeners = useRef(new Set<() => void>());
  const subscribeProgress = useCallback((listener: () => void) => {
    progressListeners.current.add(listener);
    return () => { progressListeners.current.delete(listener); };
  }, []);
  const [phase, setPhase] = useState(0);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [paused, setPaused] = useState(false);
  const [posterReady, setPosterReady] = useState(false);
  const [stageVisible, setStageVisible] = useState(false);
  const [sceneEnabled, setSceneEnabled] = useState(false);
  const dataSaver = useSyncExternalStore(subscribeDataSaver, dataSaverSnapshot, serverSnapshot);
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
  const staticMode = isStaticPresentation(reduced || dataSaver, webgl, failed);
  const onReady = useCallback(() => setReady(true), []);
  const onError = useCallback(() => {
    setFailed(true);
    setReady(false);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setStageVisible(entry.isIntersecting));
    if (sticky.current) observer.observe(sticky.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!posterReady || !stageVisible || !webgl || staticMode || sceneEnabled) return;
    return scheduleSceneStart(window, () => setSceneEnabled(true));
  }, [posterReady, stageVisible, webgl, staticMode, sceneEnabled]);

  useEffect(() => {
    let frame = 0;
    let viewport: ReturnType<typeof storyViewport> | undefined;
    const updateViewport = () => {
      const next = storyViewport(
        viewport,
        { width: window.innerWidth, height: window.innerHeight },
        window.matchMedia("(pointer: coarse)").matches,
      );
      if (next !== viewport) {
        viewport = next;
        container.current?.style.setProperty(
          "--story-viewport-height",
          `${next.height}px`,
        );
      }
    };
    const measure = () => {
      frame = 0;
      if (!container.current || !sticky.current) return;
      const rect = container.current.getBoundingClientRect();
      const value = staticMode
        ? 0
        : storyProgress(rect.top, rect.height, sticky.current.offsetHeight);
      if (progress.current !== value) {
        progress.current = value;
        for (const listener of progressListeners.current) listener();
      }
      const scene = sceneAtProgress(value);
      container.current.style.setProperty("--story-settle", `${scene.settle}`);
      const next = scene.phase;
      setPhase((previous) => (previous === next ? previous : next));
      if (progressBar.current)
        progressBar.current.style.transform = `scaleX(${value})`;
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    const resize = () => {
      updateViewport();
      schedule();
    };
    updateViewport();
    const observer = new ResizeObserver(schedule);
    if (container.current) observer.observe(container.current);
    if (sticky.current) observer.observe(sticky.current);
    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", resize);
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
      <div className="hero-sticky" ref={sticky}>
        <div className="hero-inner shell">
          <div className="hero-copy">
            <div className="eyebrow">
              <span className="swiss-mark" aria-hidden="true"></span>{" "}
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
              <span className="seal-cross" aria-hidden="true"></span>
              <span>Aus der Schweiz.</span>
            </div>
            <div className="poster-container">
              <Image
                src="/assets/product-poster.jpg"
                alt="Globi-Vulkan mit blauem Papiermantel, Globi und Schweizer Fahne"
                fill
                preload
                onLoad={() => setPosterReady(true)}
                onError={() => setPosterReady(true)}
                sizes="(max-width: 700px) 100vw, 50vw"
                className="product-poster"
              />
            </div>
            {sceneEnabled && webgl && !staticMode ? (
              <SceneBoundary onError={onError}>
                <Scene
                  progress={progress}
                  subscribeProgress={subscribeProgress}
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
