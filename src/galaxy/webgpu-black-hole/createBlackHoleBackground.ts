/*
 * Port of main.js from https://github.com/dgreenheck/webgpu-black-hole
 * (MIT License, Copyright (c) 2025 dgreenheck, see ./LICENSE).
 *
 * Renderer, camera, post-processing, OrbitControls setup and the animate loop
 * follow main.js line for line. Removed: localStorage config load/save,
 * Tweakpane UI, FPS counter and CameraAnimation. Added: the camera polar angle
 * is pinned to a function of page scroll through OrbitControls' own
 * min/maxPolarAngle clamp, and user rotate/zoom/pan is switched off.
 * Performance-only changes: the loop pauses while the tab is hidden or while a
 * detail dialog covers the viewport (html[data-detail-covering="true"]), the
 * per-frame simulation update reuses vectors instead of allocating, the page
 * max-scroll is cached and re-measured only when the document can have changed
 * size, the high-performance adapter is requested, and the drawing buffer runs
 * at an adaptive fraction (0.6-0.9) of CSS pixels, upscaled by the browser to
 * the full-viewport canvas (see createAdaptiveScale).
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

// ============================================================================
// ADAPTIVE RENDER SCALE
// ============================================================================
/** Drawing-buffer pixels per CSS pixel. Deliberately NOT multiplied by
 *  devicePixelRatio: the ray-marcher is fill-rate bound and the canvas is
 *  upscaled by CSS to the viewport. */
export const RENDER_SCALE_MAX = 0.9;
export const RENDER_SCALE_MIN = 0.6;
const RENDER_SCALE_STEP = 0.05;
/** EMA time constant for frame and GPU times (ms). */
const EMA_TAU_MS = 1000;
/** Minimum time between scale changes (ms). The EMA also restarts after each
 *  change, so every decision rests on >= 1 s of frames at the current scale. */
const SCALE_COOLDOWN_MS = 1000;
/** Headroom must hold this long before stepping up (ms). */
const STEP_UP_SUSTAIN_MS = 3000;
/** Samples discarded after start/resume/resize/scale change (pipeline refill,
 *  render-target reallocation): at least this many frames AND this long. The
 *  first start also covers page load and shader compilation. */
const WARMUP_FRAMES = 10;
const WARMUP_MS = 300;
export const STARTUP_WARMUP_MS = 2000;
/** Frame-time thresholds as a fraction of the display refresh interval.
 *  At 60 Hz (16.67 ms): down above 18.5 ms, up below 15 ms. */
const DOWN_RATIO = 1.11;
const UP_RATIO = 0.9;
/** With vsync, rAF deltas never drop below the refresh interval, so headroom
 *  is read from GPU pass time (timestamp queries, when the adapter supports
 *  them). A step up adds ~12% pixels (0.85 -> 0.9), so GPU time must be well
 *  under the interval. */
const GPU_UP_RATIO = 0.75;
/** Sustained GPU time above the refresh interval means the GPU cannot keep up
 *  even if rAF has not visibly dropped yet. */
const GPU_DOWN_RATIO = 1.0;
const GPU_SAMPLE_EVERY = 4;
/** After a scale misses the budget, stepping back up to it waits this long,
 *  doubling on each repeat miss up to the max (ms). */
const RETRY_BACKOFF_MS = 15000;
const RETRY_BACKOFF_MAX_MS = 120000;
const GPU_MIN_SAMPLES = 8;

type ScaleChange = {t: number; scale: number; frameMs: number; gpuMs: number; reason: string};

const roundScale = (s: number) => Math.round(s * 100) / 100;

function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}

/**
 * Frame-time controller. Owns no loop: the render loop reports each rAF
 * interval via frame() and sampled GPU frame times via gpu(); reset() runs
 * on start/resume/resize so paused time and hitches are never counted. The
 * display refresh interval comes from idle rAF intervals (nothing rendered in
 * between), so 90/120/144 Hz displays get their own budget.
 */
function createAdaptiveScale(apply: (scale: number) => void) {
  let scale = RENDER_SCALE_MAX;
  let refreshMs = 1000 / 60;
  let frameEma = 0;
  let gpuEma = 0;
  let gpuSamples = 0;
  let sampledMs = 0;
  let warmup = WARMUP_FRAMES;
  let warmupUntil = 0;
  let lastChange = -Infinity;
  let headroomSince = -1;
  let locked = false;
  const history: ScaleChange[] = [];
  /** Scales that missed the budget, and when a step back up to them is allowed. */
  const failed = new Map<number, {until: number; backoff: number}>();

  const reset = (warmupMs = WARMUP_MS) => {
    frameEma = 0;
    gpuEma = 0;
    gpuSamples = 0;
    sampledMs = 0;
    warmup = WARMUP_FRAMES;
    warmupUntil = performance.now() + warmupMs;
    headroomSince = -1;
  };
  const warming = (now: number) => warmup > 0 || now < warmupUntil;

  const set = (next: number, reason: string, now: number) => {
    next = roundScale(Math.min(RENDER_SCALE_MAX, Math.max(RENDER_SCALE_MIN, next)));
    if (next === scale) return;
    history.push({t: Math.round(now), scale: next, frameMs: +frameEma.toFixed(2), gpuMs: +gpuEma.toFixed(2), reason});
    if (history.length > 50) history.shift();
    scale = next;
    lastChange = now;
    apply(scale);
    reset();
  };

  const ema = (prev: number, sample: number, dt: number, first: boolean) =>
    first ? sample : prev + (sample - prev) * (1 - Math.exp(-dt / EMA_TAU_MS));

  return {
    get scale() { return scale; },
    get refreshMs() { return refreshMs; },
    get frameMs() { return frameEma; },
    get gpuMs() { return gpuEma; },
    history,
    reset,
    /** Idle rAF intervals (no rendering in between) -> display refresh. */
    setRefresh(samples: number[]) {
      const valid = samples.filter((d) => d > 3 && d < 50);
      if (valid.length >= 8) refreshMs = median(valid);
    },
    gpu(ms: number) {
      if (warming(performance.now()) || !(ms > 0) || ms > 250) return;
      gpuEma = ema(gpuEma, ms, refreshMs * GPU_SAMPLE_EVERY, gpuSamples === 0);
      gpuSamples++;
    },
    frame(delta: number, now: number) {
      if (warming(now)) { if (warmup > 0) warmup--; return; }
      // A long gap is a stall (debugger, GC, tab-switch race), not a frame.
      if (!(delta > 0) || delta > 250) return;
      frameEma = ema(frameEma, delta, delta, sampledMs === 0);
      sampledMs += delta;
      if (locked || sampledMs < EMA_TAU_MS || now - lastChange < SCALE_COOLDOWN_MS) return;

      const gpuValid = gpuSamples >= GPU_MIN_SAMPLES;
      const slowFrames = frameEma > refreshMs * DOWN_RATIO;
      const slowGpu = gpuValid && gpuEma > refreshMs * GPU_DOWN_RATIO;
      if (slowFrames || slowGpu) {
        headroomSince = -1;
        if (scale > RENDER_SCALE_MIN) {
          // Remember that this scale could not hold the budget; returning to
          // it waits out an exponentially growing backoff (anti-oscillation).
          const prev = failed.get(scale);
          const backoff = prev ? Math.min(prev.backoff * 2, RETRY_BACKOFF_MAX_MS) : RETRY_BACKOFF_MS;
          failed.set(scale, {until: now + backoff, backoff});
          set(scale - RENDER_SCALE_STEP, slowFrames ? 'frame' : 'gpu', now);
        }
        return;
      }
      const target = roundScale(scale + RENDER_SCALE_STEP);
      const headroom = scale < RENDER_SCALE_MAX && now >= (failed.get(target)?.until ?? 0) && (
        frameEma < refreshMs * UP_RATIO ||
        (frameEma < refreshMs * 1.05 && gpuValid && gpuEma < refreshMs * GPU_UP_RATIO)
      );
      if (!headroom) { headroomSince = -1; return; }
      if (headroomSince < 0) headroomSince = now;
      else if (now - headroomSince >= STEP_UP_SUSTAIN_MS) set(target, 'headroom', now);
    },
    /** Dev/validation: pin a scale (clamped to min..max); null releases it. */
    lock(value: number | null) {
      locked = false;
      if (value !== null) {
        set(value, 'lock', performance.now());
        locked = true;
      }
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
  /** Adaptive render-scale state (drawing-buffer px per CSS px, 0.6..0.9). */
  adaptive: {
    readonly scale: number;
    readonly refreshMs: number;
    readonly frameMs: number;
    readonly gpuMs: number;
    readonly history: ReadonlyArray<ScaleChange>;
    /** Whether GPU timestamp queries are feeding the controller. */
    readonly gpuTimestamps: boolean;
    /** Pin the scale (validation only); null returns control to the controller. */
    lock: (scale: number | null) => void;
  };
  /** True while the RAF loop is running (false when hidden or covered). */
  isRendering: () => boolean;
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

  // powerPreference is forwarded to navigator.gpu.requestAdapter() by
  // WebGPUBackend. The WebGL2 fallback backend builds its own context
  // attributes and does not read it.
  const renderer = new THREE.WebGPURenderer({
    antialias: true,
    powerPreference: 'high-performance',
    trackTimestamp: true // GPU frame time for the adaptive render scale
  });
  // Drawing buffer = viewport CSS size x render scale. The canvas CSS size stays
  // innerWidth x innerHeight px (the full viewport, as in main.js) whatever the
  // scale, so the browser upscales and a scale change alters resolution only.
  const applySize = (scale: number) => {
    renderer.setPixelRatio(scale);
    renderer.setSize(window.innerWidth, window.innerHeight);
  };
  applySize(RENDER_SCALE_MAX);
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

  // uniforms.resolution only feeds the shader's aspect ratio (screenUV spans
  // the render target). Give it the exact drawing-buffer size so the aspect
  // matches the target after floor() rounding. PassNode and BloomNode resize
  // their own targets from renderer.getDrawingBufferSize() every frame.
  const bufferSize = new THREE.Vector2();
  const syncResolution = () => {
    renderer.getDrawingBufferSize(bufferSize);
    blackHoleSimulation.onResize(bufferSize.x, bufferSize.y);
  };
  syncResolution();

  const adaptive = createAdaptiveScale((scale) => {
    applySize(scale);
    syncResolution();
  });

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

  // GPU time of the last rendered frame (timestamp queries, resolved every few
  // frames) gives the controller headroom information that vsync-capped rAF
  // deltas cannot. Backends without timestamp support (no 'timestamp-query'
  // feature, or no EXT_disjoint_timer_query on WebGL2) disable trackTimestamp;
  // the controller then works from rAF deltas alone.
  let frameCount = 0;
  let gpuPending = false;
  let startupPending = true;
  const timestampsEnabled = () =>
    (renderer.backend as unknown as {trackTimestamp?: boolean}).trackTimestamp === true;

  function renderFrame(deltaTime: number) {
    applyScroll();
    controls.update();

    // Reduced motion: the disk holds still; the camera still follows scroll.
    updateSimulation(options.reducedMotion?.() ? 0 : deltaTime);

    if (postProcessing) {
      postProcessing.render();
    } else {
      renderer.render(scene, camera);
    }

    if (!gpuPending && ++frameCount % GPU_SAMPLE_EVERY === 0 && timestampsEnabled()) {
      gpuPending = true;
      const scaleAtSubmit = adaptive.scale;
      renderer.resolveTimestampsAsync(THREE.TimestampQuery.RENDER).then((ms) => {
        gpuPending = false;
        if (running && adaptive.scale === scaleAtSubmit && typeof ms === 'number') adaptive.gpu(ms);
      }, () => { gpuPending = false; });
    }
  }

  function animate() {
    if (disposed || !running) return;
    frame = requestAnimationFrame(animate);

    const currentTime = performance.now();
    const elapsed = currentTime - lastFrameTime;
    const deltaTime = Math.min(elapsed / 1000, 0.033);
    lastFrameTime = currentTime;

    adaptive.frame(elapsed, currentTime);
    renderFrame(deltaTime);
  }

  // Pause reasons: hidden tab, or a detail dialog covering the viewport.
  const isCovered = () => document.documentElement.dataset.detailCovering === 'true';
  const shouldRun = () => !document.hidden && !isCovered();

  /** Starts the single RAF loop; a no-op if it is already running. Renders one
   *  frame synchronously so the background is current before whatever was
   *  covering it is revealed. */
  function start() {
    if (disposed || running || !postProcessing || !shouldRun()) return;
    stopRefreshProbe();
    running = true;
    // Paused time and the resume hitch never reach the controller; the first
    // start also skips page load and pipeline compilation.
    adaptive.reset(startupPending ? STARTUP_WARMUP_MS : undefined);
    startupPending = false;
    lastFrameTime = performance.now(); // no time jump after a pause
    renderFrame(0);
    frame = requestAnimationFrame(animate);
  }
  function stop() {
    running = false;
    cancelAnimationFrame(frame);
  }

  // Display refresh probe: rAF intervals with nothing rendered in between.
  // Runs while the renderer initialises and again while a detail dialog covers
  // the background (picks up a move to a monitor with another refresh rate).
  let probeFrame = 0;
  let probeSamples: number[] | null = null;
  function stopRefreshProbe() {
    if (!probeSamples) return;
    cancelAnimationFrame(probeFrame);
    adaptive.setRefresh(probeSamples); // keeps what was gathered if cut short
    probeSamples = null;
  }
  function startRefreshProbe(maxSamples: number) {
    if (probeSamples || disposed || document.hidden) return;
    const samples: number[] = [];
    probeSamples = samples;
    let last = -1;
    const tick = (t: number) => {
      if (probeSamples !== samples) return;
      if (last >= 0) samples.push(t - last);
      last = t;
      if (samples.length >= maxSamples) stopRefreshProbe();
      else probeFrame = requestAnimationFrame(tick);
    };
    probeFrame = requestAnimationFrame(tick);
  }

  const updateRunState = () => {
    if (shouldRun()) {
      start();
    } else {
      stop();
      if (!document.hidden && postProcessing) startRefreshProbe(60);
      else stopRefreshProbe();
    }
  };

  // Hidden tabs render nothing; resume cleanly when visible again.
  document.addEventListener('visibilitychange', updateRunState);

  // A detail dialog covering the whole viewport sets data-detail-covering="true"
  // on <html> after its open morph and removes it at the start of its close
  // morph. Same pause/resume path as visibilitychange.
  const coverObserver = typeof MutationObserver === 'function'
    ? new MutationObserver(updateRunState)
    : null;
  coverObserver?.observe(document.documentElement, {attributes: true, attributeFilter: ['data-detail-covering']});

  // ==========================================================================
  // WINDOW RESIZE (main.js)
  // ==========================================================================
  const onResize = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    applySize(adaptive.scale);
    syncResolution();
    adaptive.reset(); // a render-target reallocation hitch is not a load signal
  };
  window.addEventListener('resize', onResize);

  // ==========================================================================
  // INITIALIZATION (main.js)
  // ==========================================================================
  startRefreshProbe(30);
  const ready = renderer.init().then(() => {
    if (disposed) return;
    postProcessing = new THREE.RenderPipeline(renderer);
    setupBloom();
    // Hidden or covered at mount: stay paused until the observers resume.
    updateRunState();
  });

  function dispose() {
    if (disposed) return;
    stop();
    stopRefreshProbe();
    disposed = true;
    coverObserver?.disconnect();
    document.removeEventListener('visibilitychange', updateRunState);
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

  return {
    camera, controls, renderer, uniforms, scrollState, ready, dispose,
    adaptive: {
      get scale() { return adaptive.scale; },
      get refreshMs() { return adaptive.refreshMs; },
      get frameMs() { return adaptive.frameMs; },
      get gpuMs() { return adaptive.gpuMs; },
      history: adaptive.history,
      get gpuTimestamps() { return timestampsEnabled(); },
      lock: (scale: number | null) => adaptive.lock(scale)
    },
    isRendering: () => running
  };
}
