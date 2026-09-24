/*
 * Port of main.js from https://github.com/dgreenheck/webgpu-black-hole
 * (MIT License, Copyright (c) 2025 dgreenheck, see ./LICENSE).
 *
 * Renderer, camera, post-processing, OrbitControls setup and the animate loop
 * follow main.js line for line. Removed: localStorage config load/save,
 * Tweakpane UI, FPS counter and CameraAnimation. Added: the camera polar angle
 * is pinned to a function of page scroll through OrbitControls' own
 * min/maxPolarAngle clamp, and user rotate/zoom/pan is switched off.
 * Performance-only changes (no visual difference): the loop pauses while the
 * tab is hidden, the per-frame simulation update reuses vectors instead of
 * allocating, and the page max-scroll is cached and re-measured only when the
 * document can have changed size.
 */
import * as THREE from 'three/webgpu';
import { pass } from 'three/tsl';
import { bloom } from 'three/addons/tsl/display/BloomNode.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { BlackHoleSimulation } from './blackhole.js';

// main.js defaultConfig, verbatim except the six site overrides marked below.
export const defaultConfig = {
  "blackHoleMass": 0.9, // site override (was 0.4)
  "diskInnerRadius": 5.0, // site override (was 4.1)
  "diskOuterRadius": 20.0, // site override (was 14.5)
  "diskTemperature": 49.78,
  "temperatureFalloff": 5.22,
  "diskBrightness": 5,
  "diskRotationSpeed": -4.5, // site override (was -8.7)
  "turbulenceScale": 1.81,
  "turbulenceStretch": 0.75,
  "turbulenceSharpness": 7.4,
  "turbulenceCycleTime": 5,
  "turbulenceLacunarity": 3,
  "turbulencePersistence": 0.8,
  "diskEdgeSoftnessInner": 0.18,
  "diskEdgeSoftnessOuter": 0.5,
  "gravitationalLensing": 3.0, // site override (was 2.4)
  "dopplerStrength": 1.0,
  "stepSize": 1,
  "starsEnabled": true,
  "starBackgroundColor": "#000000",
  "starDensity": 0.1,
  "starSize": 1.2,
  "starBrightness": 0.1,
  "nebulaEnabled": false, // site override (was true)
  "nebula1Scale": 2,
  "nebula1Density": 0.5,
  "nebula1Brightness": 0.01,
  "nebula1Color": "#071f44",
  "nebula2Scale": 5.5,
  "nebula2Density": 0.05,
  "nebula2Brightness": 0.21,
  "nebula2Color": "#010615",
  "bloomStrength": 0.68,
  "bloomRadius": 0.2,
  "bloomThreshold": 0.4,
  "turbulenceBrightness": -0.05,
  "diskDensity": 1,
  "qualityPreset": "medium",
  "diskInnerThickness": 0.7,
  "diskOuterThickness": 0.5,
  "ringEnabled": true,
  "ringScale": 0.83,
  "ringContrast": 0.95,
  "ringBrightness": 0.4,
  "ringSharpness": 10,
  "ringTwist": 10.3,
  "noiseAnimFrequency": 4.2,
  "noiseAnimAmplitude": 2,
  "diskRadialFalloff": 2,
  "diskOpacityFalloff": 0.5,
  "adaptiveMinStep": 0.15,
  "stepJitter": 0,
  "diskInnerColor": "#a84b23",
  "diskOuterColor": "#7f1b00",
  "nebulaBrightness": 0.07,
  "nebulaColor1": "#113844",
  "nebulaColor2": "#1b214a",
  "nebulaScale1": 3,
  "nebulaScale2": 3.5,
  "nebulaBlend": 0.55,
  "nebulaSpeed": 0.065,
  "nebulaDensity": 0.35,
  "diskDifferentialRotation": 1,
  "noiseEvolutionSpeed": 5,
  "raySteps": 68,
  "nebulaScale": 3,
  "nebulaDetailScale": 2.4,
  "nebulaOffsetX": 0,
  "nebulaOffsetY": 0,
  "nebulaOffsetZ": 0,
  "diskTurbulence": 0.9,
  "turbulencePrimaryScale": 0.65,
  "turbulenceSecondaryScale": 1.3,
  "turbulenceSecondaryStrength": 0.15,
  "turbulenceOffset": 0.1,
  "ringNoiseEnabled": true,
  "ringNoiseScale": 4.5,
  "ringNoiseAmplitude": 1.45,
  "ringNoiseSharpness": 4,
  "ringNoiseOffset": -0.2,
  "ringNoiseOctaves": 2,
  "ringNoiseLacunarity": 1.9,
  "ringNoisePersistence": 0.45,
  "maxRayDistance": 500,
  "diskThickness": 1.3,
  "heightDensityFalloff": 5,
  "rayJitter": 1,
  "temporalAA": false,
  "temporalFrames": 16
};

/** Polar angle (from +Y) at the top and bottom of the page, in degrees. */
export const POLAR_TOP_DEG = 97;
export const POLAR_BOTTOM_DEG = 1;

/** Scroll positions within this many px of the end count as the end (scrollY
 *  can be fractional while scrollHeight is rounded). */
const END_SNAP_PX = 1;

/** Scroll progress 0..1 for a given max scroll; 0 when the page cannot scroll. */
export function scrollProgress(maxScroll: number, scrollY = window.scrollY): number {
  if (!(maxScroll > 0)) return 0;
  if (scrollY >= maxScroll - END_SNAP_PX) return 1;
  return Math.min(1, Math.max(0, scrollY / maxScroll));
}

/**
 * Cached document max scroll (scrollHeight - innerHeight). Reading
 * scrollHeight is a layout read, so it is only re-measured when something can
 * have changed it: a ResizeObserver on <html>/<body>/their children (content
 * height changes from fonts, images, dialogs, late layout shifts), a window
 * resize (innerHeight), or the scroll position running past the cached end.
 */
function createMaxScrollTracker() {
  let max = 0;
  let dirty = true;
  const measure = () => {
    max = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    dirty = false;
  };
  const invalidate = () => { dirty = true; };
  const observed = new Set<Element>();
  const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(invalidate) : null;
  const observe = (el: Element | null) => {
    if (!ro || !el || observed.has(el)) return;
    observed.add(el);
    ro.observe(el);
  };
  const observeTree = () => {
    observe(document.documentElement);
    observe(document.body);
    // Top-level app roots: their height drives scrollHeight even when <body>
    // itself is height-constrained.
    if (document.body) for (const child of Array.from(document.body.children)) observe(child);
  };
  observeTree();
  const mo = typeof MutationObserver === 'function' && document.body
    ? new MutationObserver(() => { observeTree(); invalidate(); })
    : null;
  mo?.observe(document.body, {childList: true});
  window.addEventListener('resize', invalidate);
  window.addEventListener('load', invalidate);
  document.fonts?.ready.then(invalidate, () => {});
  return {
    get(scrollY: number): number {
      if (dirty || scrollY > max + END_SNAP_PX) measure();
      return max;
    },
    invalidate,
    dispose() {
      ro?.disconnect();
      mo?.disconnect();
      observed.clear();
      window.removeEventListener('resize', invalidate);
      window.removeEventListener('load', invalidate);
    }
  };
}

export function polarForScroll(p: number): number {
  return THREE.MathUtils.degToRad(POLAR_TOP_DEG + (POLAR_BOTTOM_DEG - POLAR_TOP_DEG) * p);
}

export interface BlackHoleBackground {
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  renderer: THREE.WebGPURenderer;
  /** The simulation's TSL uniforms (time, diskRotationSpeed, nebulaEnabled, ...). */
  uniforms: BlackHoleSimulation['uniforms'];
  /** Current scroll progress 0..1 and cached max scroll, as used by the camera. */
  scrollState: () => { progress: number; maxScroll: number };
  /** Resolves once rendering has started; rejects if renderer.init() fails. */
  ready: Promise<void>;
  dispose: () => void;
}

export function createBlackHoleBackground(
  container: HTMLElement,
  options: { reducedMotion?: () => boolean } = {}
): BlackHoleBackground {
  const config = { ...defaultConfig };

  // ==========================================================================
  // SCENE SETUP (main.js)
  // ==========================================================================
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  const camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(0, -5, 20);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGPURenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  const canvas = renderer.domElement;
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.pointerEvents = 'none';
  container.appendChild(canvas);

  // ==========================================================================
  // ORBIT CONTROLS (main.js) - scroll-driven, no direct manipulation
  // ==========================================================================
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.rotateSpeed = -0.5;
  controls.minDistance = 5;
  controls.maxDistance = 50;
  controls.target.set(0, 0, 0);
  controls.enableRotate = false;
  controls.enableZoom = false;
  controls.enablePan = false;

  const maxScroll = createMaxScrollTracker();
  let lastProgress = -1;
  const applyScroll = () => {
    const y = window.scrollY;
    const p = scrollProgress(maxScroll.get(y), y);
    if (p === lastProgress) return;
    lastProgress = p;
    const phi = polarForScroll(p);
    controls.minPolarAngle = phi;
    controls.maxPolarAngle = phi;
  };
  // Pin the camera to the current scroll position before the first frame.
  applyScroll();
  controls.update();

  // ==========================================================================
  // POST-PROCESSING (main.js)
  // ==========================================================================
  let postProcessing: THREE.RenderPipeline | null = null;
  let bloomPassNode: ReturnType<typeof bloom> | null = null;

  function setupBloom() {
    if (!postProcessing) return;

    const scenePass = pass(scene, camera);
    const scenePassColor = scenePass.getTextureNode();

    bloomPassNode = bloom(scenePassColor);
    bloomPassNode.threshold.value = config.bloomThreshold;
    bloomPassNode.strength.value = config.bloomStrength;
    bloomPassNode.radius.value = config.bloomRadius;

    postProcessing.outputNode = scenePassColor.add(bloomPassNode);
  }

  // ==========================================================================
  // BLACK HOLE SIMULATION (main.js)
  // ==========================================================================
  const blackHoleSimulation = new BlackHoleSimulation(scene, config);
  blackHoleSimulation.createBlackHole();

  // ==========================================================================
  // ANIMATION LOOP (main.js)
  // ==========================================================================
  let disposed = false;
  let running = false;
  let frame = 0;
  let lastFrameTime = performance.now();

  // BlackHoleSimulation.update()/updateCamera() allocate two Vector3s per frame
  // (vendored code, kept verbatim). This does the identical work with reused
  // scratch vectors: time += dt; cameraPosition = camera.position;
  // cameraTarget = camera.position + forward * 10.
  const uniforms = blackHoleSimulation.uniforms;
  const forward = new THREE.Vector3();
  function updateSimulation(deltaTime: number) {
    uniforms.time.value += deltaTime;
    uniforms.cameraPosition.value.copy(camera.position);
    forward.set(0, 0, -1).applyQuaternion(camera.quaternion).multiplyScalar(10);
    uniforms.cameraTarget.value.copy(camera.position).add(forward);
  }

  function animate() {
    if (disposed || !running) return;
    frame = requestAnimationFrame(animate);

    const currentTime = performance.now();
    const deltaTime = Math.min((currentTime - lastFrameTime) / 1000, 0.033);
    lastFrameTime = currentTime;

    applyScroll();
    controls.update();

    // Reduced motion: the disk holds still; the camera still follows scroll.
    updateSimulation(options.reducedMotion?.() ? 0 : deltaTime);

    if (postProcessing) {
      postProcessing.render();
    } else {
      renderer.render(scene, camera);
    }
  }

  /** Starts the single RAF loop; a no-op if it is already running. */
  function start() {
    if (disposed || running || !postProcessing || document.hidden) return;
    running = true;
    lastFrameTime = performance.now(); // no time jump after a pause
    frame = requestAnimationFrame(animate);
  }
  function stop() {
    running = false;
    cancelAnimationFrame(frame);
  }

  // Hidden tabs render nothing; resume cleanly when visible again.
  const onVisibility = () => { if (document.hidden) stop(); else start(); };
  document.addEventListener('visibilitychange', onVisibility);

  // ==========================================================================
  // WINDOW RESIZE (main.js)
  // ==========================================================================
  const onResize = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    blackHoleSimulation.onResize(window.innerWidth, window.innerHeight);
  };
  window.addEventListener('resize', onResize);

  // ==========================================================================
  // INITIALIZATION (main.js)
  // ==========================================================================
  const ready = renderer.init().then(() => {
    if (disposed) return;
    postProcessing = new THREE.RenderPipeline(renderer);
    setupBloom();
    start();
  });

  function dispose() {
    if (disposed) return;
    stop();
    disposed = true;
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('resize', onResize);
    maxScroll.dispose();
    controls.dispose();
    bloomPassNode?.dispose();
    postProcessing?.dispose();
    const mesh = blackHoleSimulation.blackHoleMesh;
    if (mesh) {
      scene.remove(mesh);
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    }
    renderer.dispose();
    canvas.remove();
  }

  const scrollState = () => {
    const y = window.scrollY;
    const max = maxScroll.get(y);
    return { progress: scrollProgress(max, y), maxScroll: max };
  };

  return { camera, controls, renderer, uniforms, scrollState, ready, dispose };
}
