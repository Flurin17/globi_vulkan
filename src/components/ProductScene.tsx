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

const PRODUCT_PITCH = 0.36;

function Product({ progress, paused, onReady }: Omit<Props, "onError">) {
  const gltf = useLoader(GLTFLoader, "/assets/globi-vulkan.glb");
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

const vertexShader = `
  attribute float aSeed;
  attribute float aTrail;
  uniform float uTime;
  uniform float uStrength;
  uniform float uRatio;
  varying float vAlpha;
  varying float vSilver;
  varying float vAge;
  void main() {
    float life = 1.05 + fract(aSeed * 43.19) * .85;
    float headAge = mod(aSeed * 71.31 + uTime, life);
    float age = headAge - aTrail * .012;
    float t = max(age, 0.0);
    float angle = aSeed * 2399.963;
    float speed = (4.2 + fract(aSeed * 17.13) * 3.5) * sqrt(uStrength);
    float spread = (.25 + pow(fract(aSeed * 31.7), 1.6) * 1.8) * uStrength;
    float drag = (1.0 - exp(-t * .85)) / .85;
    vec3 p = vec3(cos(angle) * spread * drag,
      speed * drag - 2.9 * t * t,
      sin(angle) * spread * drag);
    vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    gl_PointSize = clamp((3.1 + fract(aSeed * 7.0) * 1.8) * uRatio *
      (5.0 / -mvPosition.z) * (1.0 - aTrail * .035), .8, 9.0);
    vAge = t / life;
    vAlpha = step(0.0, age) * smoothstep(0.0, .04, uStrength) *
      (1.0 - smoothstep(.6, 1.0, vAge)) * exp(-aTrail * .095) *
      smoothstep(-.5, -.1, p.y);
    vSilver = step(.72, fract(aSeed * 91.7));
  }
`;
const fragmentShader = `
  varying float vAlpha;
  varying float vSilver;
  varying float vAge;
  void main() {
    float d = length(gl_PointCoord - .5);
    float alpha = (1.0 - smoothstep(.05, .5, d)) * vAlpha;
    vec3 gold = mix(vec3(1.0, .72, .16), vec3(.95, .29, .025), vAge);
    vec3 core = mix(gold, vec3(1.0, .98, .88), 1.0 - smoothstep(.0, .28, d));
    gl_FragColor = vec4(mix(core, vec3(.9, .95, 1.0), vSilver), alpha);
  }
`;
const smokeVertexShader = `
  attribute float aSeed;
  uniform float uTime;
  uniform float uStrength;
  uniform float uRatio;
  varying float vAge;
  varying float vAlpha;
  varying float vSeed;
  void main() {
    float t = fract(aSeed * 17.73 + uTime * .17);
    vec3 p = vec3((sin(aSeed * 137.5 + t * 4.0) * .22 + .34) * t,
      t * 3.1, sin(aSeed * 81.7) * t * .46 - .12);
    p *= sqrt(uStrength);
    vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    gl_PointSize = min(180.0, (25.0 + t * 125.0) * uRatio / -mvPosition.z);
    vAge = t;
    vSeed = aSeed;
    vAlpha = sin(t * 3.14159) * .095 * uStrength;
  }
`;
const smokeFragmentShader = `
  varying float vAge;
  varying float vAlpha;
  varying float vSeed;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1,0)), f.x),
      mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), f.x), f.y);
  }
  void main() {
    vec2 uv = gl_PointCoord - .5;
    float cloud = noise(uv * 7.0 + vSeed * 30.0 + vAge);
    cloud += noise(uv * 15.0 - vAge * 2.0) * .35;
    float alpha = (1.0 - smoothstep(.12, .5, length(uv))) * cloud * vAlpha;
    gl_FragColor = vec4(mix(vec3(.63, .53, .39), vec3(.48, .53, .60), vAge), alpha);
  }
`;

function Fountain({ progress, paused }: Pick<Props, "progress" | "paused">) {
  const points = useRef<THREE.Points>(null);
  const smoke = useRef<THREE.Points>(null);
  const light = useRef<THREE.PointLight>(null);
  const nozzle = useRef<THREE.Group>(null);
  const { size, gl } = useThree();
  const emissionRotation = useMemo(() => new THREE.Euler(), []);
  const geometry = useMemo(() => {
    const sparks = size.width < 480 ? 900 : 1800;
    const trailLength = size.width < 480 ? 9 : 12;
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
  const smokeGeometry = useMemo(() => {
    const result = new THREE.BufferGeometry();
    result.setAttribute("position", new THREE.BufferAttribute(new Float32Array(36 * 3), 3));
    result.setAttribute("aSeed", new THREE.BufferAttribute(
      Float32Array.from({ length: 36 }, (_, i) => (i + 1) / 36), 1));
    return result;
  }, []);
  const smokeMaterial = useMemo(() => new THREE.ShaderMaterial({
    uniforms: material.uniforms,
    vertexShader: smokeVertexShader,
    fragmentShader: smokeFragmentShader,
    transparent: true,
    depthWrite: false,
  }), [material]);
  useEffect(() => () => {
    smokeGeometry.dispose();
    smokeMaterial.dispose();
  }, [smokeGeometry, smokeMaterial]);
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
      shader.uniforms.uRatio.value = gl.getPixelRatio();
      emissionRotation.set(PRODUCT_PITCH, state.rotation, state.tilt);
      points.current.position.set(0, 1.59, 0)
        .applyEuler(emissionRotation).multiplyScalar(state.scale);
      points.current.position.y -= 0.05 + state.drop;
      points.current.visible = state.fountain > 0;
      if (smoke.current) {
        smoke.current.position.copy(points.current.position);
        smoke.current.visible = state.fountain > 0;
      }
      if (nozzle.current) {
        nozzle.current.position.copy(points.current.position);
        nozzle.current.scale.setScalar(
          state.ignition *
            (0.8 + Math.sin(shader.uniforms.uTime.value * 37) * 0.1),
        );
      }
    }
    if (light.current) {
      light.current.intensity = state.ignition * (4.2 + Math.sin(material.uniforms.uTime.value * 23) * .55);
      if (points.current) light.current.position.copy(points.current.position);
    }
  });
  return (
    <>
      <points ref={smoke} geometry={smokeGeometry} material={smokeMaterial}
        frustumCulled={false} visible={false} renderOrder={1} />
      <points
        ref={points}
        geometry={geometry}
        material={material}
        frustumCulled={false}
        renderOrder={2}
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
        resize={{ scroll: false, offsetSize: true }}
        style={{ pointerEvents: "none" }}
        scene={{ environmentIntensity: 0.55 }}
        camera={{ position: [0, 0.25, 6.8], fov: 36 }}
        dpr={[1, 1.65]}
        shadows="soft"
        frameloop={visible && !props.paused ? "always" : "demand"}
        gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
        onCreated={({ gl }) => {
          gl.setClearColor(0x000000, 0);
          gl.toneMapping = THREE.NeutralToneMapping;
          gl.toneMappingExposure = 1;
        }}
      >
        <Studio />
        <Suspense fallback={null}>
          <Product {...props} />
          <Fountain {...props} />
          <Grounding {...props} />
        </Suspense>
        <Lifecycle onError={props.onError} />
      </Canvas>
    </div>
  );
}
