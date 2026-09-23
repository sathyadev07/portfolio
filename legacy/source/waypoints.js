/* Waypoint model for the galaxy odyssey.
   Destinations are authored as a star position plus the direction the camera
   arrives from; camera positions and look targets are derived, so content and
   route edits never require touching the camera animation code in galaxy.js. */
(function () {
  'use strict';

  /* Route coordinates now inhabit the supplied GLB's visible disc instead of
     the much larger former procedural star field. The GLB itself preserves
     its source scale independently in galaxy.js. */
  const SPAN = 0.05;

  // star:        world position of the destination particle (pre-span)
  // approach:    direction from the star back toward the camera (not normalized)
  // distance:    how far the camera settles from the star (pre-span)
  // compose:     lateral framing, as a fraction of distance. Positive pushes the
  //              star to the right of frame so the reading card can sit left.
  // dwell:       relative scroll length of the chapter that arrives here
  const ROUTE = [
    { id: 'hero', kind: 'hero', contentId: 'hero', star: [0, 0, 0], approach: [0, 0.12, 1], distance: 168, compose: 0, dwell: 1, accentIntensity: 0, localEnvironment: 'core', openingPose: { position: [0, -10, 4.5], target: [0, 0, 0], fov: 75 } },
    { id: 'about', kind: 'about', contentId: 'about', star: [16, 7, 82], approach: [0.22, 0.16, 1], distance: 27, compose: 0.30, dwell: 1, accentIntensity: 0.5, localEnvironment: 'calm' },
    { id: 'sikorsky', kind: 'experience', contentId: 'sikorsky', star: [-27, 11, 46], approach: [-0.18, 0.14, 1], distance: 23, compose: 0.34, dwell: 1.15, accentIntensity: 1, localEnvironment: 'guide' },
    { id: 'fsae', kind: 'experience', contentId: 'fsae', star: [31, -7, 25], approach: [0.9, 0.1, 0.55], distance: 21, compose: 0.34, dwell: 1.15, accentIntensity: 1, localEnvironment: 'orbital' },
    { id: 'proj-01', kind: 'project', contentId: 'proj-01', star: [-38, -5, 4], approach: [-0.62, 0.16, 0.78], distance: 19, compose: 0.32, dwell: 1, accentIntensity: 0.9, localEnvironment: 'frame' },
    { id: 'proj-02', kind: 'project', contentId: 'proj-02', star: [-11, 19, -16], approach: [0.12, 0.52, 0.85], distance: 19, compose: 0.32, dwell: 1, accentIntensity: 0.9, localEnvironment: 'scan' },
    { id: 'proj-03', kind: 'project', contentId: 'proj-03', star: [23, 12, -31], approach: [0.72, 0.2, 0.66], distance: 19, compose: 0.32, dwell: 1, accentIntensity: 0.9, localEnvironment: 'terrain' },
    { id: 'proj-04', kind: 'project', contentId: 'proj-04', star: [41, -6, -49], approach: [0.82, -0.08, 0.57], distance: 19, compose: 0.32, dwell: 1, accentIntensity: 0.9, localEnvironment: 'wave' },
    { id: 'proj-05', kind: 'project', contentId: 'proj-05', star: [7, -23, -64], approach: [0.18, -0.58, 0.79], distance: 19, compose: 0.32, dwell: 1, accentIntensity: 0.9, localEnvironment: 'dust' },
    { id: 'proj-06', kind: 'project', contentId: 'proj-06', star: [-31, -11, -79], approach: [-0.7, 0.08, 0.71], distance: 19, compose: 0.32, dwell: 1, accentIntensity: 0.9, localEnvironment: 'plume' },
    /* The last project runs straight into the beacon: the camera swings back so
       the galaxy sits behind the contact star at full scale. */
    { id: 'contact', kind: 'contact', contentId: 'contact', star: [-30, 26, -128], approach: [-0.42, 0.36, -0.83], distance: 68, compose: 0.20, dwell: 1.2, accentIntensity: 1, localEnvironment: 'beacon' }
  ];

  // Conventional labels for navigation and hash links.
  const NAV = [
    { id: 'hero', label: 'Overview', hash: 'overview' },
    { id: 'about', label: 'About', hash: 'about' },
    { id: 'sikorsky', label: 'Experience', hash: 'experience' },
    { id: 'proj-01', label: 'Projects', hash: 'projects' },
    { id: 'contact', label: 'Contact', hash: 'contact' }
  ];

  // Extra hashes that resolve to a waypoint, including the original site's ids.
  const HASH_ALIASES = {
    overview: 'hero', hero: 'hero', profile: 'about', about: 'about',
    experience: 'sikorsky', sikorsky: 'sikorsky', fsae: 'fsae',
    projects: 'proj-01', terminal: 'contact', contact: 'contact'
  };

  window.PORTFOLIO_SPAN = SPAN;
  window.PORTFOLIO_ROUTE = ROUTE;
  window.PORTFOLIO_NAV = NAV;
  window.PORTFOLIO_HASH_ALIASES = HASH_ALIASES;

  /* Derives cameraPosition / cameraTarget for every destination.
     THREE is passed in so this module stays independent of renderer startup. */
  window.buildWaypoints = function (THREE, options) {
    const settings = options || {};
    const scale = SPAN * (settings.compact ? 0.82 : 1);  // shorter flights on small screens
    const composeScale = settings.compact ? 0.06 : 1;    // near-centered stars behind a bottom sheet
    const up = new THREE.Vector3(0, 1, 0);
    const forward = new THREE.Vector3();
    const right = new THREE.Vector3();
    const offset = new THREE.Vector3();

    return ROUTE.map(function (entry) {
      const star = new THREE.Vector3(entry.star[0], entry.star[1], entry.star[2]).multiplyScalar(SPAN);
      const distance = entry.distance * scale;
      offset.set(entry.approach[0], entry.approach[1], entry.approach[2]).normalize().multiplyScalar(distance);
      const cameraPosition = entry.openingPose
        ? new THREE.Vector3(entry.openingPose.position[0], entry.openingPose.position[1], entry.openingPose.position[2])
        : star.clone().add(offset);

      forward.copy(star).sub(cameraPosition).normalize();
      right.copy(forward).cross(up);
      if (right.lengthSq() < 1e-6) right.set(1, 0, 0);
      right.normalize();

      // Pulling the look target left of the star frames the star on the right.
      const lateral = entry.compose * distance * composeScale;
      const cameraTarget = entry.openingPose
        ? new THREE.Vector3(entry.openingPose.target[0], entry.openingPose.target[1], entry.openingPose.target[2])
        : star.clone()
        .addScaledVector(right, -lateral)
        .addScaledVector(up, lateral * (settings.compact ? 1.6 : 0.18));

      return {
        id: entry.id,
        kind: entry.kind,
        contentId: entry.contentId,
        position: star.toArray(),
        cameraPosition: cameraPosition.toArray(),
        cameraTarget: cameraTarget.toArray(),
        approachDistance: distance,
        dwellLength: entry.dwell,
        accentIntensity: entry.accentIntensity,
        localEnvironment: entry.localEnvironment,
        openingFov: entry.openingPose ? entry.openingPose.fov : null
      };
    });
  };
})();
