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
import { sceneAtProgress } from "@/lib/motion";
import {
  FUSE_POINTS,
  THREAD_SEGMENTS,
  THREAD_RADIAL_SEGMENTS,
  remainingFuseIndices,
} from "@/lib/fuse";

type Props = {
  progress: RefObject<number>;
  paused: boolean;
  onReady: () => void;
  onError: () => void;
};

function Product({ progress, paused, onReady }: Omit<Props, "onError">) {
  const gltf = useLoader(GLTFLoader, "/assets/globi-vulkan.glb");
  const model = useMemo(() => {
    const clone = gltf.scene.clone(true);
    clone.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.castShadow = true;
        object.receiveShadow = true;
        const material = object.material as THREE.MeshStandardMaterial;
        if (material.map) {
          material.map.anisotropy = 8;
          material.toneMapped = false;
        }
        if (
          object.name === "Curved_green_fuse" ||
          object.name === "Braided_thread_detail"
        )
          object.geometry = object.geometry.clone();
      }
    });
    return clone;
  }, [gltf.scene]);
  const group = useRef<THREE.Group>(null);
  const ember = useRef<THREE.Mesh>(null);
  const emberLight = useRef<THREE.PointLight>(null);
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
    }),
    [model],
  );
  useEffect(
    () => () => {
      fuseMeshes.fuse?.geometry.dispose();
      fuseMeshes.thread?.geometry.dispose();
    },
    [fuseMeshes],
  );
  useEffect(onReady, [onReady]);
  useFrame(() => {
    if (!group.current || paused) return;
    const state = sceneAtProgress(progress.current);
    group.current.rotation.set(0.23, state.rotation, state.tilt);
    group.current.scale.setScalar(state.scale);
    group.current.position.y = -0.05 - state.drop;
    if (fuseMeshes.fuse)
      fuseMeshes.fuse.geometry.setDrawRange(
        0,
        remainingFuseIndices(state.fuseBurn),
      );
    if (fuseMeshes.thread)
      fuseMeshes.thread.geometry.setDrawRange(
        0,
        remainingFuseIndices(
          state.fuseBurn,
          THREAD_SEGMENTS,
          THREAD_RADIAL_SEGMENTS,
        ),
      );
    if (ember.current && emberLight.current) {
      const burning = state.fuseBurn > 0 && state.fuseBurn < 1;
      const position = fuseCurve.getPoint(1 - state.fuseBurn);
      ember.current.visible = burning;
      ember.current.position.copy(position);
      emberLight.current.position.copy(position);
      emberLight.current.intensity = burning ? 1.8 : 0;
      ember.current.scale.setScalar(
        0.75 + Math.sin(state.fuseBurn * 400) * 0.25,
      );
    }
  });
  return (
    <group ref={group} rotation={[0.23, 0, -0.16]}>
      <primitive object={model} />
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

const vertexShader = `
  attribute float aSeed;
  attribute float aTrail;
  uniform float uTime;
  uniform float uStrength;
  uniform float uRatio;
  varying float vAlpha;
  varying float vSilver;
  varying float vTrail;
  void main() {
    float t = fract(aSeed * 71.31 + uTime * (.44 + fract(aSeed * 31.7) * .38));
    t = max(0.0, t - aTrail * .010);
    float angle = aSeed * 137.508;
    float spread = (.38 + fract(aSeed * 17.13) * 1.25) * uStrength;
    float height = (1.2 + fract(aSeed * 43.19) * 1.3) * uStrength;
    vec3 p = vec3(cos(angle) * spread * t, height * (4.0 * t * (1.0-t)) - .4 * t * t, sin(angle) * spread * t * .6);
    vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    gl_PointSize = min(16.0, (5.0 + fract(aSeed*7.0) * 3.5) * uRatio * (5.0 / -mvPosition.z));
    vAlpha = pow(1.0-t,.6) * smoothstep(0.0,.04,uStrength) * (1.0 - aTrail * .14);
    vSilver = step(.76, fract(aSeed*91.7));
    vTrail = aTrail;
  }
`;
const fragmentShader = `
  varying float vAlpha;
  varying float vSilver;
  void main() {
    float d = length(gl_PointCoord - .5);
    float alpha = smoothstep(.5,.08,d) * vAlpha;
    vec3 gold = mix(vec3(1.0,.59,.06), vec3(1.0,.96,.73), smoothstep(.4,.0,d));
    gl_FragColor = vec4(mix(gold,vec3(.96,.98,1.0),vSilver),alpha);
  }
`;

function Fountain({ progress, paused }: Pick<Props, "progress" | "paused">) {
  const points = useRef<THREE.Points>(null);
  const light = useRef<THREE.PointLight>(null);
  const nozzle = useRef<THREE.Group>(null);
  const { size, gl } = useThree();
  const geometry = useMemo(() => {
    const sparks = size.width < 480 ? 650 : 1500;
    const trailLength = size.width < 480 ? 4 : 6;
    const count = sparks * trailLength;
    const result = new THREE.BufferGeometry();
    result.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(count * 3), 3),
    );
    result.setAttribute(
      "aSeed",
      new THREE.BufferAttribute(
        Float32Array.from(
          { length: count },
          (_, i) => (Math.floor(i / trailLength) + 1) / sparks,
        ),
        1,
      ),
    );
    result.setAttribute(
      "aTrail",
      new THREE.BufferAttribute(
        Float32Array.from({ length: count }, (_, i) => i % trailLength),
        1,
      ),
    );
    return result;
  }, [size.width]);
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uStrength: { value: 0 },
          uRatio: { value: gl.getPixelRatio() },
        },
        vertexShader,
        fragmentShader,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [gl],
  );
  useEffect(
    () => () => {
      geometry.dispose();
    },
    [geometry],
  );
  useEffect(
    () => () => {
      material.dispose();
    },
    [material],
  );
  useFrame((_, delta) => {
    if (paused) return;
    const state = sceneAtProgress(progress.current);
    if (points.current) {
      const shader = points.current.material as THREE.ShaderMaterial;
      shader.uniforms.uTime.value += Math.min(delta, 0.05);
      shader.uniforms.uStrength.value = state.fountain;
      points.current.position.y =
        1.59 * state.scale * Math.cos(0.23) - 0.05 - state.drop;
      points.current.position.z = 1.59 * state.scale * Math.sin(0.23);
      if (nozzle.current) {
        nozzle.current.position.copy(points.current.position);
        nozzle.current.scale.setScalar(
          state.ignition *
            (0.8 + Math.sin(shader.uniforms.uTime.value * 37) * 0.1),
        );
      }
    }
    if (light.current) {
      light.current.intensity = state.ignition * 2;
      light.current.position.y = 1.59 * state.scale - 0.05 - state.drop;
    }
  });
  return (
    <>
      <points
        ref={points}
        geometry={geometry}
        material={material}
        frustumCulled={false}
      />
      <pointLight ref={light} color="#ffcc58" intensity={0} distance={4} />
      <group ref={nozzle} scale={0}>
        <mesh>
          <sphereGeometry args={[0.045, 16, 12]} />
          <meshBasicMaterial color="#fff6c5" toneMapped={false} />
        </mesh>
        <mesh>
          <sphereGeometry args={[0.11, 16, 12]} />
          <meshBasicMaterial
            color="#ffbb35"
            transparent
            opacity={0.25}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      </group>
    </>
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

export default function ProductScene(props: Props) {
  const container = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { rootMargin: "80px" },
    );
    if (container.current) observer.observe(container.current);
    return () => observer.disconnect();
  }, []);
  return (
    <div className="webgl-scene" ref={container} aria-hidden="true">
      <Canvas
        camera={{ position: [0, 0.25, 6.8], fov: 36 }}
        dpr={[1, 1.65]}
        frameloop={visible && !props.paused ? "always" : "demand"}
        gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
        onCreated={({ gl }) => {
          gl.setClearColor(0x000000, 0);
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1;
        }}
      >
        <ambientLight intensity={0.75} />
        <hemisphereLight args={["#fffaf0", "#b6c3aa", 1.1]} />
        <directionalLight position={[-3, 5, 4]} intensity={2} color="#fff7e5" />
        <directionalLight
          position={[3, 1, -2]}
          intensity={1.1}
          color="#dae8ff"
        />
        <Suspense fallback={null}>
          <Product {...props} />
          <Fountain {...props} />
        </Suspense>
        <Lifecycle onError={props.onError} />
      </Canvas>
    </div>
  );
}
