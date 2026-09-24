import {useEffect, useMemo, useRef} from 'react';
import {useFrame, useThree} from '@react-three/fiber';
import {useGLTF} from '@react-three/drei';
import {KTX2Loader} from 'three-stdlib';
import {Box3, Vector3, type Group, type WebGLRenderer} from 'three';
import {asset} from '../data/portfolio';

const MODEL_URL = asset('assets/models/black-hole.glb');
const DRACO_PATH = asset('assets/decoders/draco/');
const BASIS_PATH = asset('assets/decoders/basis/');
const loaders = new WeakMap<WebGLRenderer, KTX2Loader>();

function textureLoader(renderer: WebGLRenderer) {
  let loader = loaders.get(renderer);
  if (!loader) {
    loader = new KTX2Loader().setTranscoderPath(BASIS_PATH).setWorkerLimit(2).detectSupport(renderer);
    loaders.set(renderer, loader);
  }
  return loader;
}

/** The supplied textured meshes replace the point-only galaxy adapter. */
export default function BlackHole({rotating = false, reducedMotion = false}: {rotating?: boolean; reducedMotion?: boolean}) {
  const renderer = useThree(state => state.gl);
  const ktx2 = textureLoader(renderer);
  const {scene} = useGLTF(MODEL_URL, DRACO_PATH, true, loader => loader.setKTX2Loader(ktx2));
  const rotation = useRef<Group>(null);
  const model = useMemo(() => {
    const clone = scene.clone(true);
    const bounds = new Box3().setFromObject(clone);
    const size = bounds.getSize(new Vector3());
    const center = bounds.getCenter(new Vector3());
    // Match the old galaxy's world-space footprint without altering the model's aspect ratio.
    const scale = 10 / Math.max(size.x, size.y, size.z, 0.001);
    return {clone, center, scale};
  }, [scene]);

  useEffect(() => () => {
    ktx2.dispose();
    loaders.delete(renderer);
  }, [ktx2, renderer]);

  useFrame((_, delta) => {
    if (reducedMotion || !rotating || !rotation.current) return;
    rotation.current.rotation.z += Math.min(delta, 0.05) * 0.006;
  });

  return <>
    <ambientLight intensity={1.1}/>
    <directionalLight position={[1, -6, 9]} intensity={1.8}/>
    <group ref={rotation}>
      <group scale={model.scale}>
        <primitive object={model.clone} position={model.center.clone().negate()}/>
      </group>
    </group>
  </>;
}
