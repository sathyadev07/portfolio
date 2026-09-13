/* Model inputs localized from the author's original portfolio.
   Source: https://sathyadev07.github.io/sathya-devarajan-portfolio/
   Filenames, binary dependencies and presentation angles follow that source.
   No procedural replacement geometry is used.

   Presentation angles are transcribed from the <model-viewer> attributes the
   original page sets on each viewer shell, re-verified against the live site
   on 2026-09-13:

     DT27_Rear_Upright.gltf         camera-orbit "35deg 75deg 105%"
     Drivetrain27_Asy.gltf          camera-orbit "-20deg 78deg auto"   orientation "90deg 0deg 0deg"
     ebike-top-level-assembly.gltf  camera-orbit "180deg 90deg auto"   orientation "90deg -90deg 0deg"
     BabaWoodSurface.gltf           camera-orbit "90deg 90deg auto"    orientation "0deg -90deg 0deg"

   Two conversions matter, and both were wrong in the outgoing map:

   1. camera-orbit is "theta phi radius". theta is the azimuth this viewer
      already uses; phi is measured down from +Y, so elevation = 90deg - phi.
      radius "auto" is model-viewer's ideal framing distance — FRAME_AUTO here —
      and "105%" is 5% beyond it.

   2. orientation is "roll pitch yaw", and model-viewer applies it as
      `quaternion.setFromEuler(new Euler(pitch, yaw, roll, 'YXZ'))`
      (ModelScene.applyTransform). The roll term therefore lands on Z and the
      pitch term on X — not on X and Y in written order. `rotation` below is
      already in that resolved [x, y, z] form and viewer.js applies it with the
      matching 'YXZ' order, so the part presents the same face the original
      site shows. */
(function () {
  'use strict';
  const rad = Math.PI / 180;

  /* model-viewer's `auto` radius, expressed in this viewer's bounding-sphere
     framing multiplier. Every angle above that says `auto` uses it unchanged. */
  const FRAME_AUTO = 1.12;

  window.PORTFOLIO_MODELS = {
    sikorsky: null,
    fsae: {
      label: 'Rear upright',
      model: 'assets/models/DT27_Rear_Upright.gltf',
      /* no orientation attribute on the original viewer — the asset is shown
         in its exported attitude. */
      orientation: { rotation: [0, 0, 0], azimuth: 35 * rad, elevation: 15 * rad, frame: FRAME_AUTO * 1.05 }
    },
    'fsae-assembly': {
      label: 'Full drivetrain assembly',
      model: 'assets/models/Drivetrain27_Asy.gltf',
      /* roll 90deg -> Z */
      orientation: { rotation: [0, 0, 90 * rad], azimuth: -20 * rad, elevation: 12 * rad, frame: FRAME_AUTO }
    },
    'proj-01': {
      label: 'frame assembly',
      model: 'assets/models/ebike-top-level-assembly.gltf',
      /* roll 90deg -> Z, pitch -90deg -> X */
      orientation: { rotation: [-90 * rad, 0, 90 * rad], azimuth: 180 * rad, elevation: 0, frame: FRAME_AUTO }
    },
    'proj-03': {
      label: 'Face relief surface model',
      model: 'assets/models/BabaWoodSurface.gltf',
      /* pitch -90deg -> X */
      orientation: { rotation: [-90 * rad, 0, 0], azimuth: 90 * rad, elevation: 0, frame: FRAME_AUTO }
    },
    'proj-02': null, 'proj-04': null, 'proj-05': null, 'proj-06': null
  };
})();
