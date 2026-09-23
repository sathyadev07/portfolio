import {useLayoutEffect, useRef, type RefObject} from 'react';
import {useFrame, useThree} from '@react-three/fiber';
import {Matrix4, Vector3, type Object3D} from 'three';
import {STAR_PIXELS,JOURNEY_NEAR} from '../galaxySpace';

/* DOM panels use the same homogeneous projection as the WebGL galaxy.
 * Resolve world -> camera -> clip -> viewport explicitly, rather than asking
 * a second CSS perspective scene to reconstruct camera depth in CSS pixels.
 * Normalize by center depth so matrix values remain stable near arrival. */
function viewportCSSMatrix(clip: Matrix4, width: number, height: number, depth: number) {
  const c = clip.elements;
  const values = new Array<number>(16).fill(0);
  for (const column of [0, 4, 12]) {
    values[column] = width * 0.5 * (c[column] + c[column + 3]) / depth;
    values[column + 1] = height * 0.5 * (c[column + 3] - c[column + 1]) / depth;
    values[column + 3] = c[column + 3] / depth;
  }
  // Flatten only the output Z. Preserve homogeneous W for true perspective
  // foreshortening and give the matrix an invertible Z axis for hit testing.
  values[10] = 1;
  return `matrix3d(${values.join(',')})`;
}

type Props = {
  anchors: Object3D[];
  nodes: RefObject<(HTMLElement | null)[]>;
  space: RefObject<HTMLDivElement | null>;
  arrivalDistances: number[];
};

export default function DestinationProjector({anchors, nodes, space, arrivalDistances}: Props) {
  const camera = useThree(state => state.camera);
  const size = useThree(state => state.size);
  const cameraObject = useRef(new Matrix4());
  const pixelObject = useRef(new Matrix4());
  const clipObject = useRef(new Matrix4());
  const corner = useRef(new Vector3());
  const normal = useRef(new Vector3());
  const dimensions = useRef<{width: number; height: number}[]>([]);

  const measure = () => {
    dimensions.current = anchors.map((_, index) => {
      const content = nodes.current[index]?.firstElementChild as HTMLElement | null;
      return {width: content?.offsetWidth || 0, height: content?.offsetHeight || 0};
    });
  };

  const project = () => {
    const container = space.current;
    if (!container || size.width <= 0 || size.height <= 0) return;
    const halfHeight = size.height / 2;
    // Focal length in pixels, straight out of the live projection matrix.
    const focal = camera.projectionMatrix.elements[5] * halfHeight;


    /* The renderer refreshes these during gl.render, which has not happened yet
       this frame. Recomputing here keeps the DOM projection exactly in step with
       the camera pose the rig just wrote, instead of one frame behind it. */
    camera.updateMatrixWorld();
    camera.matrixWorldInverse.copy(camera.matrixWorld).invert();

    for (let index = 0; index < anchors.length; index++) {
      const node = nodes.current[index];
      if (!node) continue;
      const anchor = anchors[index];
      anchor.updateWorldMatrix(true, false);
      const matrix = cameraObject.current.multiplyMatrices(camera.matrixWorldInverse, anchor.matrixWorld);
      const scale = arrivalDistances[index] / focal;
      const {width, height} = dimensions.current[index] || {width: 0, height: 0};
      // Measure the projected full rectangle using camera-space depth, including
      // tilt. Radial distance and a capped leg window can reveal oversized text.
      let minY = Infinity, maxY = -Infinity, minX = Infinity, maxX = -Infinity;
      let inFront = width > 0 && height > 0;
      for (const x of [-0.5, 0.5]) {
        for (const y of [-0.5, 0.5]) {
          corner.current.set(x * width * scale, y * height * scale, 0).applyMatrix4(matrix);
          const depth = -corner.current.z;
          if (depth <= JOURNEY_NEAR) inFront = false;
          const screenY = focal * corner.current.y / Math.max(depth, JOURNEY_NEAR);
          const screenX = camera.projectionMatrix.elements[0] * size.width * .5 * corner.current.x / Math.max(depth,JOURNEY_NEAR);
          minX = Math.min(minX, screenX);
          maxX = Math.max(maxX, screenX);
          minY = Math.min(minY, screenY);
          maxY = Math.max(maxY, screenY);
        }
      }
      normal.current.set(0, 0, 1).transformDirection(matrix);
      corner.current.setFromMatrixPosition(matrix).negate();
      const frontFacing = normal.current.dot(corner.current) > 0;
      const projectedSize = Math.max(maxY - minY,maxX - minX);
      // Begin at 80% of the single-star budget and reach full opacity at the
      // budget itself. No distance cutoff can cause a later, larger reveal.
      const opacity = Math.max(0, Math.min(1,
        (projectedSize - STAR_PIXELS * 0.8) / (STAR_PIXELS * 0.2)));
      if (!inFront || !frontFacing || opacity === 0) {
        node.style.visibility = 'hidden';
        node.style.pointerEvents = 'none';
        continue;
      }

      // Top-left CSS coordinates become centered local coordinates with +Y up.
      pixelObject.current.makeScale(scale, -scale, scale);
      pixelObject.current.setPosition(-width * scale / 2, height * scale / 2, 0);
      clipObject.current.multiplyMatrices(camera.projectionMatrix, matrix).multiply(pixelObject.current);
      const depth = -matrix.elements[14];
      node.style.transform = viewportCSSMatrix(clipObject.current, size.width, size.height, depth);
      node.style.zIndex = String(Math.round(100000 / (1 + depth)));
      node.style.opacity = String(opacity);
      node.style.visibility = 'visible';
      node.style.pointerEvents = node.getAttribute('aria-hidden') === 'true' ? 'none' : 'auto';
    }
  };

  /* Layout reads happen on resize/font changes, never in the frame loop.
     The camera rig runs at -2 and projection at -1, before WebGL renders. */
  useLayoutEffect(() => {
    let active = true;
    const refresh = () => { if (active) measure(); };
    const observer = new ResizeObserver(refresh);
    nodes.current.forEach(node => {
      if (node?.firstElementChild) observer.observe(node.firstElementChild);
    });
    refresh();
    document.fonts?.ready.then(refresh).catch(() => undefined);
    document.fonts?.addEventListener('loadingdone', refresh);
    return () => {
      active = false;
      observer.disconnect();
      document.fonts?.removeEventListener('loadingdone', refresh);
    };
  }, [anchors, nodes, size.width, size.height]);

  useFrame(project, -1);
  return null;
}
