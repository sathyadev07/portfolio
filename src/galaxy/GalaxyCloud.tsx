import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, useTexture } from '@react-three/drei';
import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, Group, Points, type WebGLProgramParametersWithUniforms } from 'three';
import { asset } from '../data/portfolio';

export const GALAXY_URL = asset('assets/models/galaxy.glb');

export default function GalaxyCloud({ rotating = false, reducedMotion = false }: { rotating?: boolean; reducedMotion?: boolean }) {
  const { scene } = useGLTF(GALAXY_URL);
  const disc = useTexture(asset('assets/images/galaxy-disc.png'));
  const rotation = useRef<Group>(null);
  /* Differential rotation, done in the vertex shader.
     The galaxy has to keep moving in both modes, including while the camera is
     parked at a destination. A rigid spin of the root cannot deliver that here:
     the destinations are welded into the same frame, so a rigid spin is either
     invisible to a camera that follows them, or it drags them out of their
     branch. Shearing the star field instead — inner stars sweeping faster than
     outer ones, the way a real disc turns — keeps motion visible from a
     stationary camera while every destination stays exactly where it was placed.
     uTime accumulates clamped delta seconds, so the rate is frame-rate
     independent, unrelated to scroll speed, and cannot compound across remounts:
     the uniform belongs to this instance. */
  const swirl = useMemo(() => ({ uTime: { value: 0 } }), []);
  const patchSwirl = useCallback((shader: WebGLProgramParametersWithUniforms) => {
    shader.uniforms.uTime = swirl.uTime;
    shader.vertexShader = `uniform float uTime;
${shader.vertexShader}`.replace(
      '#include <begin_vertex>',
      `vec3 transformed = vec3( position );
       float swirlRadius = length( transformed.xy );
       float swirlAngle = uTime * 0.012 / ( 1.0 + swirlRadius * 0.012 );
       float swirlSin = sin( swirlAngle );
       float swirlCos = cos( swirlAngle );
       transformed.xy = vec2(
         transformed.x * swirlCos - transformed.y * swirlSin,
         transformed.x * swirlSin + transformed.y * swirlCos
       );`,
    );
  }, [swirl]);

  const disposal = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const geometries = useMemo(() => {
    const result: BufferGeometry[] = [];
    scene.traverse(object => {
      const points = object as Points;
      if (!points.isPoints || !points.geometry.getAttribute('position')) return;
      const geometry = points.geometry.clone();
      geometry.center();
      const position = geometry.getAttribute('position');
      const colors = new Float32Array(position.count * 3);
      const color = new Color();
      for (let index = 0; index < position.count; index++) {
        const distance = Math.hypot(position.getX(index),position.getY(index),position.getZ(index))/100;
        // Stable variation preserves the source radial palette across remounts.
        const seed = Math.sin(index * 12.9898 + 78.233) * 43758.5453;
        color.setRGB(Math.cos(distance),(seed-Math.floor(seed))*.8,Math.sin(distance));
        color.toArray(colors,index*3);
      }
      geometry.setAttribute('color',new BufferAttribute(colors,3));
      geometry.computeBoundingSphere();
      result.push(geometry);
    });
    if (!result.length) throw new Error('The supplied galaxy has no point geometry.');
    return result;
  },[scene]);
  // Geometry is shared by the three layers and released here. Declarative
  // materials remain R3F-owned; cached GLTF geometry and textures stay intact.
  useEffect(() => {
    clearTimeout(disposal.current);
    return () => { disposal.current = setTimeout(() => geometries.forEach(geometry => geometry.dispose()),0); };
  },[geometries]);
  useFrame((_,delta) => {
    if (reducedMotion) return;
    const step = Math.min(delta,.05);
    swirl.uTime.value += step;
    if (rotation.current && rotating) rotation.current.rotation.z -= step/15;
  });
  return <group scale={rotating ? [1.65,1,1] : [1,1,1]}>
    <group ref={rotation} scale={.05}>
      {geometries.map((geometry,index) => <group key={index}>
        <points geometry={geometry} frustumCulled={false}>
          <pointsMaterial onBeforeCompile={patchSwirl} map={disc} size={.01} transparent depthWrite={false} vertexColors toneMapped={false} />
        </points>
        <points geometry={geometry} frustumCulled={false} renderOrder={-2}>
          <pointsMaterial onBeforeCompile={patchSwirl} map={disc} size={.052} opacity={.19} transparent depthWrite={false} vertexColors blending={AdditiveBlending} toneMapped={false} />
        </points>
        <points geometry={geometry} frustumCulled={false} renderOrder={-3}>
          <pointsMaterial onBeforeCompile={patchSwirl} map={disc} size={.25} opacity={.036} transparent depthWrite={false} vertexColors blending={AdditiveBlending} toneMapped={false} />
        </points>
      </group>)}
      <sprite scale={[152,152,1]} renderOrder={-4}>
        <spriteMaterial map={disc} color="#d7a66a" transparent opacity={.125} depthWrite={false} blending={AdditiveBlending} toneMapped={false} />
      </sprite>
      <sprite scale={[264,264,1]} renderOrder={-5}>
        <spriteMaterial map={disc} color="#d7a66a" transparent opacity={.028} depthWrite={false} blending={AdditiveBlending} toneMapped={false} />
      </sprite>
    </group>
  </group>;
}

// Drei caches the galaxy once for both modes; preloading keeps the toggle instant.
useGLTF.preload(GALAXY_URL);
