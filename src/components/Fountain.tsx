"use client";

import { useEffect, useMemo, useRef, type RefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { sceneAtProgress } from "@/lib/motion";
import { createSparkAttributes, fountainEnvelope } from "@/lib/fountain";
import {
  sparkVertexShader, sparkFragmentShader,
  smokeVertexShader, smokeFragmentShader,
  jetVertexShader, jetFragmentShader,
} from "@/lib/fountain-shaders";

type Props = { progress: RefObject<number>; paused: boolean; productPitch: number };

function billboardGeometry(seeds: Float32Array, branches?: Float32Array) {
  const plane = new THREE.PlaneGeometry(1, 1);
  const geometry = new THREE.InstancedBufferGeometry();
  geometry.index = plane.index;
  geometry.attributes.position = plane.attributes.position;
  geometry.attributes.uv = plane.attributes.uv;
  geometry.setAttribute("aSeed", new THREE.InstancedBufferAttribute(seeds, 4));
  if (branches) geometry.setAttribute("aBranch", new THREE.InstancedBufferAttribute(branches, 1));
  geometry.instanceCount = seeds.length / 4;
  plane.dispose();
  return geometry;
}

export default function Fountain({ progress, paused, productPitch }: Props) {
  const source = useRef<THREE.Group>(null);
  const jet = useRef<THREE.Mesh>(null);
  const sparks = useRef<THREE.Mesh<THREE.InstancedBufferGeometry, THREE.ShaderMaterial>>(null);
  const light = useRef<THREE.PointLight>(null);
  const elapsed = useRef(0);
  const { size, gl } = useThree();
  const compact = size.width < 480;
  const rotation = useMemo(() => new THREE.Euler(), []);
  const green = useMemo(() => new THREE.Color("#aaff45"), []);
  const gold = useMemo(() => new THREE.Color("#ff9e36"), []);
  const sparkGeometry = useMemo(() => {
    const { seeds, branches } = createSparkAttributes(compact);
    return billboardGeometry(seeds, branches);
  }, [compact]);
  const smokeGeometry = useMemo(() => {
    const count = compact ? 30 : 48;
    const seeds = Float32Array.from({ length: count * 4 }, (_, i) => {
      const value = Math.sin((i + 1) * 127.1) * 43758.5453;
      return value - Math.floor(value);
    });
    return billboardGeometry(seeds);
  }, [compact]);
  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uReveal: { value: 0 },
    uGroundY: { value: -1 },
    uResolution: { value: new THREE.Vector2() },
    uRatio: { value: 1 },
    uPower: { value: 0 },
    uGreen: { value: 1 },
  }), []);
  const materials = useMemo(() => ({
    sparks: new THREE.ShaderMaterial({
      uniforms, vertexShader: sparkVertexShader, fragmentShader: sparkFragmentShader,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    }),
    smoke: new THREE.ShaderMaterial({
      uniforms, vertexShader: smokeVertexShader, fragmentShader: smokeFragmentShader,
      transparent: true, depthWrite: false,
    }),
    jet: new THREE.ShaderMaterial({
      uniforms, vertexShader: jetVertexShader, fragmentShader: jetFragmentShader,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    }),
  }), [uniforms]);
  useEffect(() => () => sparkGeometry.dispose(), [sparkGeometry]);
  useEffect(() => () => smokeGeometry.dispose(), [smokeGeometry]);
  useEffect(() => () => {
    for (const material of Object.values(materials)) material.dispose();
  }, [materials]);

  useFrame((_, delta) => {
    if (paused || !source.current || !sparks.current) return;
    const frameUniforms = sparks.current.material.uniforms;
    const state = sceneAtProgress(progress.current);
    if (state.ignition <= 0) elapsed.current = 0;
    else elapsed.current += Math.min(delta, .05);
    const envelope = fountainEnvelope(elapsed.current);
    const power = envelope.power * state.ignition;
    frameUniforms.uTime.value = elapsed.current;
    frameUniforms.uReveal.value = state.fountain;
    frameUniforms.uPower.value = power;
    frameUniforms.uGreen.value = envelope.green;
    frameUniforms.uRatio.value = gl.getPixelRatio();
    gl.getDrawingBufferSize(frameUniforms.uResolution.value);

    // Only move the source with the cone; the plume rises against gravity.
    rotation.set(productPitch, state.rotation, state.tilt);
    source.current.position.set(0, 1.59, 0).applyEuler(rotation).multiplyScalar(state.scale);
    source.current.position.y -= .05 + state.drop;
    source.current.visible = state.ignition > 0;
    frameUniforms.uGroundY.value = -1.86 - source.current.position.y;
    if (jet.current) {
      const height = (.22 + Math.sqrt(envelope.power) * .64) * state.ignition;
      jet.current.scale.set(.7 + envelope.power * .3, height, 1);
      jet.current.position.set(0, height * .5, .035);
    }
    if (light.current) {
      light.current.color.copy(gold).lerp(green, envelope.green);
      light.current.intensity = power * (2.7 + Math.sin(elapsed.current * 31) * .3);
    }
  });

  return (
    <group ref={source} visible={false}>
      <mesh geometry={smokeGeometry} material={materials.smoke}
        frustumCulled={false} renderOrder={1} />
      <mesh ref={sparks} geometry={sparkGeometry} material={materials.sparks}
        frustumCulled={false} renderOrder={2} />
      <mesh ref={jet} material={materials.jet} renderOrder={3}>
        <planeGeometry args={[.7, 1]} />
      </mesh>
      <pointLight ref={light} intensity={0} distance={3.6} decay={2} />
    </group>
  );
}
