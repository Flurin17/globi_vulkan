"use client";

import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import {
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { sceneAtProgress } from "@/lib/motion";
import { needsContinuousFrames } from "@/lib/scene-rendering";
import productAsset from "@/data/product-asset.json";
import Fountain from "./Fountain";
import {
  FUSE_POINTS,
  THREAD_SEGMENTS,
  THREAD_RADIAL_SEGMENTS,
  remainingFuseIndices,
} from "@/lib/fuse";

type Props = {
  progress: RefObject<number>;
  subscribeProgress: (listener: () => void) => () => void;
  paused: boolean;
  onReady: () => void;
  onError: () => void;
};

const PRODUCT_PITCH = 0.36;

function Product({ progress, paused, onReady }: Omit<Props, "onError">) {
  const gltf = useLoader(GLTFLoader, productAsset.url);
  const model = useMemo(() => {
    const clone = gltf.scene.clone(true);
    clone.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.castShadow = true;
        object.receiveShadow = true;
        const material = (object.material as THREE.MeshStandardMaterial).clone();
        object.material = material;
        if (material.map) {
          material.map.anisotropy = 8;
        }
        if (
          object.name === "Curved_green_fuse" ||
          object.name === "Braided_thread_detail" ||
          object.name === "Braided_cross_weave"
        )
          object.geometry = object.geometry.clone();
      }
    });
    return clone;
  }, [gltf.scene]);
  const group = useRef<THREE.Group>(null);
  const ember = useRef<THREE.Mesh>(null);
  const emberLight = useRef<THREE.PointLight>(null);
  const emberTime = useRef(0);
  const fuseCurve = useMemo(
    () =>
      new THREE.CatmullRomCurve3(
        FUSE_POINTS.map((p) => new THREE.Vector3(...p)),
      ),
    [],
  );
  const fuseMeshes = useMemo(
    () => ({
      fuse: model.getObjectByName("Curved_green_fuse") as
        THREE.Mesh | undefined,
      thread: model.getObjectByName("Braided_thread_detail") as
        THREE.Mesh | undefined,
      crossWeave: model.getObjectByName("Braided_cross_weave") as
        THREE.Mesh | undefined,
    }),
    [model],
  );
  useEffect(
    () => () => {
      fuseMeshes.fuse?.geometry.dispose();
      fuseMeshes.thread?.geometry.dispose();
      fuseMeshes.crossWeave?.geometry.dispose();
      model.traverse((object) => {
        if (object instanceof THREE.Mesh)
          (object.material as THREE.Material).dispose();
      });
    },
    [fuseMeshes, model],
  );
  useEffect(onReady, [onReady]);
  useFrame((_, delta) => {
    if (!group.current || paused) return;
    emberTime.current += Math.min(delta, 0.05);
    const state = sceneAtProgress(progress.current);
    group.current.rotation.set(PRODUCT_PITCH, state.rotation, state.tilt);
    group.current.scale.setScalar(state.scale);
    group.current.position.y = -0.05 - state.drop;
    if (fuseMeshes.fuse)
      fuseMeshes.fuse.geometry.setDrawRange(
        0,
        remainingFuseIndices(state.fuseBurn),
      );
    for (const thread of [fuseMeshes.thread, fuseMeshes.crossWeave])
      thread?.geometry.setDrawRange(
        0,
        remainingFuseIndices(
          state.fuseBurn,
          THREAD_SEGMENTS,
          THREAD_RADIAL_SEGMENTS,
        ),
      );
    if (ember.current && emberLight.current) {
      const burning = state.fuseBurn > 0 && state.fuseBurn < 1;
      const position = fuseCurve.getPointAt(1 - state.fuseBurn);
      ember.current.visible = burning;
      ember.current.position.copy(position);
      emberLight.current.position.copy(position);
      const flicker = 0.8 + Math.sin(emberTime.current * 47) * 0.2;
      emberLight.current.intensity = burning ? 1.8 * flicker : 0;
      ember.current.scale.setScalar(
        flicker,
      );
    }
  });
  return (
    <group ref={group} rotation={[PRODUCT_PITCH, 0, -0.16]}>
      <primitive object={model} dispose={null} />
      <mesh ref={ember} visible={false}>
        <sphereGeometry args={[0.028, 12, 8]} />
        <meshBasicMaterial color="#fff1a3" toneMapped={false} />
      </mesh>
      <pointLight
        ref={emberLight}
        color="#ff961c"
        intensity={0}
        distance={0.8}
      />
    </group>
  );
}

function Studio() {
  const { gl } = useThree();
  const environment = useMemo(() => {
    const generator = new THREE.PMREMGenerator(gl);
    const room = new RoomEnvironment();
    const target = generator.fromScene(room, 0.04);
    room.dispose();
    generator.dispose();
    return target;
  }, [gl]);
  useEffect(() => () => environment.dispose(), [environment]);
  return (
    <>
      <primitive object={environment.texture} attach="environment" />
      <ambientLight intensity={0.18} />
      <hemisphereLight args={["#eef5ff", "#7c805a", 0.45]} />
      <directionalLight position={[-3.5, 4, 5]} intensity={3.1} color="#fff8ee"
        castShadow shadow-mapSize={[1024, 1024]} shadow-bias={-0.0001}
        shadow-normalBias={0.008} shadow-camera-left={-2} shadow-camera-right={2}
        shadow-camera-top={3} shadow-camera-bottom={-3} />
      <directionalLight position={[3, 2, -3]} intensity={1.6} color="#d9e9ff" />
    </>
  );
}

function Grounding({ progress, paused }: Pick<Props, "progress" | "paused">) {
  const shadow = useRef<THREE.Mesh>(null);
  useFrame(() => {
    if (paused || !shadow.current) return;
    const state = sceneAtProgress(progress.current);
    shadow.current.scale.set(1.05 * state.scale, 0.46 * state.scale, 1);
    shadow.current.position.x = Math.sin(state.tilt) * 1.4;
  });
  return (
    <mesh ref={shadow} position={[-0.2, -1.86, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[2.5, 2.5]} />
      <shaderMaterial transparent depthWrite={false} uniforms={{}}
        vertexShader={`varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`}
        fragmentShader={`varying vec2 vUv; void main() { float r = length((vUv-.5)*2.0); gl_FragColor = vec4(.17,.13,.055, exp(-r*r*5.0) * (1.0-smoothstep(.7,1.0,r)) * .20); }`} />
    </mesh>
  );
}

function Lifecycle({ onError }: Pick<Props, "onError">) {
  const { gl } = useThree();
  useEffect(() => {
    const canvas = gl.domElement;
    const lost = (event: Event) => {
      event.preventDefault();
      onError();
    };
    canvas.addEventListener("webglcontextlost", lost);
    return () => canvas.removeEventListener("webglcontextlost", lost);
  }, [gl, onError]);
  return null;
}

function RenderDriver({ progress, subscribeProgress, active }: Pick<Props, "progress" | "subscribeProgress"> & { active: boolean }) {
  const invalidate = useThree((state) => state.invalidate);
  useEffect(() => {
    if (!active) return;
    invalidate();
    return subscribeProgress(() => invalidate());
  }, [active, invalidate, subscribeProgress]);
  useFrame(() => {
    if (needsContinuousFrames(progress.current, active)) invalidate();
  });
  return null;
}

export default function ProductScene(props: Props) {
  const container = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  const [pageVisible, setPageVisible] = useState(true);
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { rootMargin: "80px" },
    );
    if (container.current) observer.observe(container.current);
    const visibilityChanged = () => setPageVisible(document.visibilityState === "visible");
    visibilityChanged();
    document.addEventListener("visibilitychange", visibilityChanged);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", visibilityChanged);
    };
  }, []);
  const active = visible && pageVisible && !props.paused;
  return (
    <div className="webgl-scene" ref={container} aria-hidden="true">
      <Canvas
        resize={{ scroll: false, offsetSize: true }}
        style={{ pointerEvents: "none" }}
        scene={{ environmentIntensity: 0.55 }}
        camera={{ position: [0, 0.25, 6.8], fov: 36 }}
        dpr={[1, 1.65]}
        shadows={{ type: THREE.PCFShadowMap }}
        frameloop="demand"
        gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
        onCreated={({ gl }) => {
          gl.setClearColor(0x000000, 0);
          gl.toneMapping = THREE.NeutralToneMapping;
          gl.toneMappingExposure = 1;
        }}
      >
        <Studio />
        <Suspense fallback={null}>
          <Product {...props} paused={!active} />
          <Fountain progress={props.progress} paused={!active} productPitch={PRODUCT_PITCH} />
          <Grounding {...props} paused={!active} />
        </Suspense>
        <Lifecycle onError={props.onError} />
        <RenderDriver progress={props.progress} subscribeProgress={props.subscribeProgress} active={active} />
      </Canvas>
    </div>
  );
}
