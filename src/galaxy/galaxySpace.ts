import {DESTINATIONS} from './waypoints';

/* The one galaxy coordinate system.
 *
 * `GalaxyCloud` clones the GLB point geometry, centres it, and renders it under a
 * single `scale={GALAXY_SCALE}` group with no rotation. So world space *is* the
 * point cloud's own space scaled by GALAXY_SCALE: the disc lies in world XY and
 * world +Z is the disc normal. Every number below is in those world units and
 * comes from the measurements recorded in GALAXY-GEOMETRY.md. There is no second
 * coordinate array anywhere else in the app.
 */
export const GALAXY_SCALE = 0.05;

/** World radius holding ~90% of the stars (local p90 112.2 x GALAXY_SCALE). */
export const DISC_RADIUS = 5.61;
/** World RMS half-thickness of the disc (local 15.0 x GALAXY_SCALE). */
export const DISC_HALF_THICKNESS = 0.75;

/* The name is outside the measured cloud (world |z| <= 6.03).
 * All remaining anchors retain their original positions inside the disc.
 * Route guides approach the name along its inward radial sightline. */
const POSITIONS: [number, number, number][] = [
  [ 0.0000, -9.0000, 10.0000], // exterior name; galaxy center behind it
  [-2.7851, -1.9502,  0.3500], // 1  theta 215deg, r 3.4
  [ 3.2909, -1.9000, -0.3000], // 2  theta 330deg, r 3.8
  [ 0.3573,  4.0844,  0.4500], // 3  theta  85deg, r 4.1
  [-4.0407, -1.4707, -0.4000], // 4  theta 200deg, r 4.3
  [ 3.1820, -3.1820,  0.2500], // 5  theta 315deg, r 4.5
  [ 1.5733,  4.3226, -0.5000], // 6  theta  70deg, r 4.6
  [-4.6821, -0.4096,  0.3000], // 7  theta 185deg, r 4.7
];

/* How far in front of a destination the camera settles, in world units. This is
 * the only knob that sets a destination's tangible world size: the projector
 * scales each one so that at exactly this distance it renders at its own CSS
 * pixel size. That is what makes the Cool Stuff ON name the same visual size as
 * the Cool Stuff OFF name at every viewport, without a second type scale. */
export const ARRIVAL_DISTANCE = 0.025;
export const JOURNEY_NEAR = 0.0005;

/* Initial visibility uses the larger projected rectangle dimension. */
export const STAR_PIXELS = 3;

export type Anchor = {
  id: string;
  /** World position: exterior name or in-disc destination. */
  position: [number, number, number];
  /** World distance in front of the anchor where the camera settles. */
  arrivalDistance: number;
};

export const ANCHORS: Anchor[] = DESTINATIONS.map((destination, index) => ({
  id: destination.id,
  position: POSITIONS[index % POSITIONS.length],
  arrivalDistance: ARRIVAL_DISTANCE,
}));

if (import.meta.env.DEV && DESTINATIONS.length !== POSITIONS.length) {
  console.warn(`galaxySpace: ${DESTINATIONS.length} destinations but ${POSITIONS.length} anchor positions. Positions are being reused, so two destinations now share a point in the galaxy.`);
}
