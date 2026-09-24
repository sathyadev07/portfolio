import {useEffect,useMemo,useRef,type ComponentRef} from 'react';
import {useThree} from '@react-three/fiber';
import {OrbitControls,useGLTF} from '@react-three/drei';
import {Box3,Vector3,Color,type Group,type Mesh,type Material,type MeshStandardMaterial} from 'three';
import {asset} from '../../data/portfolio';
export type Orientation = { rotation: [number, number, number]; azimuth: number; elevation: number; frame: number };

/* Framing solved against the part's real silhouette at its authored angle: the
   eight transformed box corners are projected onto the camera axes and the
   nearest distance that still holds them inside the frustum wins. A bounding
   sphere would push flat plates half a frame away. */
function fitDistance(box: Box3, fov: number, aspect: number, orientation: Orientation) {
  const tv = Math.tan((fov * Math.PI) / 360);
  const th = tv * aspect;
  const pitch = Math.max(-1.35, Math.min(1.35, orientation.elevation));
  const cp = Math.cos(pitch);
  const direction = new Vector3(Math.sin(orientation.azimuth) * cp, Math.sin(pitch), Math.cos(orientation.azimuth) * cp);
  const right = new Vector3(0, 1, 0).cross(direction);
  if (right.lengthSq() < 1e-6) right.set(1, 0, 0);
  right.normalize();
  const up = direction.clone().cross(right).normalize();
  const point = new Vector3();
  let needed = 0;
  for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) {
    point.set(x, y, z);
    const depth = point.dot(direction);
    needed = Math.max(needed, depth + Math.abs(point.dot(right)) / th, depth + Math.abs(point.dot(up)) / tv);
  }
  return { distance: Math.max(needed, 0.05) * orientation.frame, direction };
}

export default function Model({ url, orientation, controls, resetVersion }: { url: string; orientation: Orientation; controls: { current: ComponentRef<typeof OrbitControls> | null }; resetVersion: number }) {
  const { scene } = useGLTF(url, asset('assets/decoders/draco/'));
  const pivot = useRef<Group>(null);
  const camera = useThree(state => state.camera);
  const aspect = useThree(state => state.size.width / state.size.height);
  // One clone per viewer instance; the cached source scene is never mutated.
  const model = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse(object => {
      const mesh = object as Mesh;
      if (!mesh.isMesh) return;
      const brighten = (source: Material) => {
        const material = source.clone() as MeshStandardMaterial;
        if (material.color) material.color.lerp(new Color('#f2f5fa'), .45);
        if ('roughness' in material) material.roughness = Math.max(.35, material.roughness);
        return material;
      };
      mesh.material = Array.isArray(mesh.material) ? mesh.material.map(brighten) : brighten(mesh.material);
    });
    clone.rotation.set(...orientation.rotation);
    clone.updateMatrixWorld(true);
    const box = new Box3().setFromObject(clone);
    const size = box.getSize(new Vector3());
    const scale = 2 / Math.max(size.x, size.y, size.z, 1e-6);
    clone.scale.multiplyScalar(scale);
    clone.updateMatrixWorld(true);
    const scaled = new Box3().setFromObject(clone);
    const center = scaled.getCenter(new Vector3());
    clone.position.sub(center);
    scaled.translate(center.clone().negate());
    return { clone, box: scaled };
  }, [scene, orientation]);
  const disposal = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    clearTimeout(disposal.current);
    return () => { disposal.current = setTimeout(() => model.clone.traverse(object => {
      const mesh = object as Mesh;
      if (mesh.isMesh) (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach(material => material.dispose());
    }), 0); };
  }, [model]);
  // Re-frame on mount and on resize; the fit angle stays the authored one so
  // orbiting never re-zooms the part under the visitor's hand.
  useEffect(() => {
    const { distance, direction } = fitDistance(model.box, 38, aspect, orientation);
    camera.position.copy(direction.multiplyScalar(distance));
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
    controls.current?.update();
  }, [model, aspect, camera, orientation, controls, resetVersion]);
  return <primitive ref={pivot} object={model.clone}/>;
}
