import {CatmullRomCurve3, Matrix4, Vector3} from 'three';
import {ANCHORS} from './galaxySpace';

/* One closed route; guide points shape an inward-facing exterior name stop
 * without adding destinations or moving any of the in-disc anchors. */
const COUNT = ANCHORS.length;
const hero = new Vector3(...ANCHORS[0].position);
const routePoints = [hero.clone(), hero.clone().multiplyScalar(.9), hero.clone().multiplyScalar(.8),
 ...ANCHORS.slice(1).map(anchor => new Vector3(...anchor.position)),
 new Vector3(5,-13,13), hero.clone().multiplyScalar(1.3),
 hero.clone().multiplyScalar(1.2), hero.clone().multiplyScalar(1.1)];
const ROUTE_COUNT = routePoints.length;
const controlIndices = ANCHORS.map((_,index) => index === 0 ? 0 : index + 2);
export const PATH = new CatmullRomCurve3(routePoints,true,'catmullrom',.5);

function wrapT(t: number) {
  return ((t % 1) + 1) % 1;
}

/** Curve parameter at which the route passes through destination `index`. */
export const anchorT = (index: number) => controlIndices[index] / ROUTE_COUNT;

/* Solve the nearest incoming intersection with the stand-off sphere. A tangent
 * returned by three.js is normalized, so its length cannot convert world units
 * to curve parameters. Search only the incoming segment, then bisect the first
 * bracket found while walking backwards from the anchor. */
export const arrivalT = ANCHORS.map((anchor, index) => {
  const end = anchorT(index);
  const destination = new Vector3(...anchor.position);
  const point = new Vector3();
  const distanceAt = (t: number) => PATH.getPoint(wrapT(t), point).distanceTo(destination);
  let near = end;
  for (let step = 1; step <= 256; step++) {
    let far = end - step / (ROUTE_COUNT * 256);
    if (distanceAt(far) >= anchor.arrivalDistance) {
      for (let iteration = 0; iteration < 40; iteration++) {
        const middle = (far + near) / 2;
        if (distanceAt(middle) >= anchor.arrivalDistance) far = middle;
        else near = middle;
      }
      return (far + near) / 2;
    }
    near = far;
  }
  throw new Error(`No incoming arrival position for ${anchor.id}`);
});

export const lookAheadT = ANCHORS.map((_, index) => anchorT(index) - arrivalT[index]);

/** Unwrapped end of a complete leg, including the last-to-first seam. */
function legEnd(index: number) {
  const next = (index + 1) % COUNT;
  return arrivalT[next] + (next === 0 ? 1 : 0);
}

/* Numerical arc lengths are descriptive, not visibility cutoffs. */
export const legLength = ANCHORS.map((_, index) => {
  const from = arrivalT[index];
  const span = legEnd(index) - from;
  const point = new Vector3();
  const previous = PATH.getPoint(wrapT(from));
  let length = 0;
  for (let step = 1; step <= 256; step++) {
    PATH.getPoint(wrapT(from + span * step / 256), point);
    length += point.distanceTo(previous);
    previous.copy(point);
  }
  return length;
});

const position = new Vector3();
const target = new Vector3();

/* `progress` is the continuous journey scalar in destination units: 3.0 means
 * settled at destination 3, 3.5 means half way along the leg from 3 to 4. It only
 * increases while travelling forward, so the camera only moves forward along the
 * curve — it passes through each destination and carries on, rather than backing
 * away to reveal the next one.
 *
 * The returned vectors are reused between calls; copy them if you need to keep
 * them past the current frame. */
export function cameraAt(progress: number) {
  const index = Math.floor(progress);
  const frac = progress - index;
  const from = ((index % COUNT) + COUNT) % COUNT;
  const to = (from + 1) % COUNT;

  // arrivalT rises with index within one lap; crossing the seam adds a whole lap.
  const startT = arrivalT[from];
  const endT = legEnd(from);
  const t = startT + (endT - startT) * frac;
  const look = lookAheadT[from] + (lookAheadT[to] - lookAheadT[from]) * frac;

  PATH.getPoint(wrapT(t), position);
  PATH.getPoint(wrapT(t + look), target);
  return {position, target};
}

const UP = new Vector3(0, 0, 1);

/* A destination's orientation is fixed from its actual arrival sightline: its
 * face points back up the path, so the camera always arrives at its front. It
 * never billboards, never re-orients per frame, and after the camera has flown
 * through it the element is simply turned away rather than mirrored. */
export function anchorBasis(index: number) {
  const z = PATH.getPoint(wrapT(arrivalT[index])).sub(new Vector3(...ANCHORS[index].position)).normalize();
  const up = Math.abs(UP.dot(z)) > 0.95 ? new Vector3(0, 1, 0) : UP.clone();
  const x = new Vector3().crossVectors(up, z).normalize();
  const y = new Vector3().crossVectors(z, x).normalize();
  return new Matrix4().makeBasis(x, y, z);
}
