/* Galaxy scene and interstellar flight.

   The supplied GLB is the only galaxy representation. Waypoint beacons and
   local interaction motifs remain separate from the asset.

   Translation follows direct station-to-station legs and the established
   integrated velocity profile. Orientation follows cached headings with a
   viewport-margin correction and a bounded angular velocity. Scrolling in
   reverse retraces the same route. Timing and density come from window.MOTION. */
(function () {
  'use strict';

  const T = window.THREE;
  const MOTION = window.MOTION;

  /* Interstellar span: the star field and every waypoint share this multiplier,
     so widening the gaps between destinations preserves star density. */
  const SPAN = window.PORTFOLIO_SPAN || 3;

  /* Scroll inertia. exp(-FRICTION/60) per frame at 60fps ~= 0.92 retention:
     the ship keeps answering the wheel promptly even though the leg is long. */
  const FRICTION = MOTION.UPGRADE.settling;

  /* ---------- velocity profile ----------

     v(u) over the travel band, built from the flight fractions in MOTION so the
     phases stay auditable. Segment joins are smoothstepped, which makes the
     profile C1-continuous — that is what removes instantaneous direction and
     speed changes. Integrating v gives normalised arc position s(u). */

  const SAMPLES = 512;

  function buildProfile(F) {
    const segments = [
      { span: F.orient, from: 0, to: 0.15 },         /* retreat while turning */
      { span: F.accelerate, from: 0.15, to: 1 },     /* building velocity */
      { span: F.cruise, from: 1, to: 1 },            /* cruise */
      { span: F.approach, from: 1, to: 0.22 },       /* destination resolves ahead */
      { span: F.decelerate, from: 0.22, to: 0 }      /* arrival */
    ];
    const total = segments.reduce(function (sum, s) { return sum + s.span; }, 0) || 1;

    function velocity(u) {
      let cursor = 0;
      for (let i = 0; i < segments.length; i++) {
        const span = segments[i].span / total;
        if (u <= cursor + span || i === segments.length - 1) {
          const local = span > 0 ? Math.min(1, Math.max(0, (u - cursor) / span)) : 1;
          const eased = local * local * (3 - 2 * local);
          return segments[i].from + (segments[i].to - segments[i].from) * eased;
        }
        cursor += span;
      }
      return 0;
    }

    const speed = new Float32Array(SAMPLES + 1);
    const arc = new Float32Array(SAMPLES + 1);
    let running = 0;
    for (let i = 0; i <= SAMPLES; i++) {
      speed[i] = velocity(i / SAMPLES);
      if (i > 0) running += (speed[i] + speed[i - 1]) * 0.5;
      arc[i] = running;
    }
    const length = running || 1;
    for (let i = 0; i <= SAMPLES; i++) arc[i] /= length;
    /* Mean speed, used to express cruise velocity as a multiple of average. */
    const mean = length / SAMPLES || 1;

    return {
      /* Normalised distance covered by travel fraction u. */
      arc: function (u) {
        const x = Math.min(1, Math.max(0, u)) * SAMPLES;
        const i = Math.floor(x);
        const j = Math.min(SAMPLES, i + 1);
        return arc[i] + (arc[j] - arc[i]) * (x - i);
      },
      /* Instantaneous speed relative to the leg average. */
      speed: function (u) {
        const x = Math.min(1, Math.max(0, u)) * SAMPLES;
        const i = Math.floor(x);
        const j = Math.min(SAMPLES, i + 1);
        return (speed[i] + (speed[j] - speed[i]) * (x - i)) / mean;
      }
    };
  }

  window.createGalaxyOdyssey = function (container, waypoints) {
    if (!T || !MOTION) return null;

    let renderer;
    try {
      /* Pixel ratio is already tier-aware; MSAA was not, so the weakest GPUs
         paid a full multisample resolve every frame. The low tier is exactly
         the set of devices that cannot afford it, and against a starfield its
         absence is not readable. */
      renderer = new T.WebGLRenderer({ antialias: MOTION.tier().name !== 'low', powerPreference: 'high-performance' });
    } catch (error) {
      return null;
    }

    const FLIGHT = MOTION.FLIGHT;
    const profile = buildProfile(FLIGHT);

    let calm = MOTION.reduced();
    let detail = false;
    let stopped = false;
    let frame = 0;
    let last = 0;
    let progress = 0;
    let targetProgress = 0;
    let dirty = true;
    let slowTime = 0;
    let beaconProgress = -1;
    const readout = { progress: 0, index: 0, speed: 0, starX: 0, starY: 0, visible: false };

    /* Tier drives density and resolution; the flight itself is identical on
       every tier. */
    const quality = MOTION.galaxyShare();
    renderer.setPixelRatio(MOTION.pixelRatio('maxPixelRatio'));
    renderer.setSize(innerWidth, innerHeight);
    /* The originating Canvas explicitly uses NoToneMapping. Its output pass
       presents the final buffer in sRGB, mirrored here by outputEncoding for
       this Three r125 runtime. */
    renderer.toneMapping = T.NoToneMapping;
    renderer.toneMappingExposure = 0.5;
    renderer.outputEncoding = T.sRGBEncoding;
    renderer.setClearColor(0x000000, 1);
    renderer.domElement.setAttribute('aria-hidden', 'true');
    container.appendChild(renderer.domElement);

    const scene = new T.Scene();
    const camera = new T.PerspectiveCamera(75, innerWidth / innerHeight, 0.005, 4200);
    const universe = new T.Group();
    const galaxyGroup = new T.Group();
    scene.add(universe);
    universe.add(galaxyGroup);
    /* Preserve the original asset scale and zero-rotation opening pose. */
    galaxyGroup.scale.setScalar(1 / SPAN);
    galaxyGroup.rotation.set(0, 0, 0);
    universe.scale.setScalar(SPAN);

    const resources = [];

    /* Speed uniform shared by every star layer: the field reads a little hotter
       at cruise, which is what sells "stars are moving past me". */

    const addResource = function (r) { resources.push(r); return r; };

    function texture(type) {
      const c = document.createElement('canvas');
      c.width = c.height = 64;
      const ctx = c.getContext('2d');
      const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      const stops = type === 'dust'
        ? [[0, 'rgba(107,68,35,.85)'], [0.35, 'rgba(64,40,20,.55)'], [0.7, 'rgba(28,20,14,.25)'], [1, 'rgba(0,0,0,0)']]
        : type === 'core'
          ? [[0, 'rgba(255,255,255,1)'], [0.18, 'rgba(254,243,226,.95)'], [0.42, 'rgba(245,226,195,.65)'], [0.72, 'rgba(217,180,130,.2)'], [1, 'rgba(0,0,0,0)']]
          : [[0, 'rgba(255,255,255,1)'], [0.25, 'rgba(253,248,240,.9)'], [0.55, 'rgba(240,230,214,.45)'], [1, 'rgba(0,0,0,0)']];
      stops.forEach(function (stop) { g.addColorStop(stop[0], stop[1]); });
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 64, 64);
      const tex = addResource(new T.CanvasTexture(c));
      tex.generateMipmaps = false;
      tex.minFilter = T.LinearFilter;
      return tex;
    }

    const coreTex = texture('core');
    const galaxyAsset = window.loadGalaxyAsset(galaxyGroup, renderer, function () { invalidate(); });

    /* Sparse exterior field. It begins beyond the GLB disc, so it fills the
       surrounding void without changing the source galaxy's silhouette,
       density, palette, or opening orientation. A seeded distribution keeps
       the opening frame stable across reloads. */
    const innerExteriorCount = quality >= 0.9 ? 2200 : quality >= 0.5 ? 1500 : 900;
    const exteriorCount = quality >= 0.9 ? 2800 : quality >= 0.5 ? 1900 : 1100;
    const exteriorPositions = new Float32Array(exteriorCount * 3);
    let exteriorSeed = 1729;
    function exteriorRandom() {
      exteriorSeed = (exteriorSeed * 1664525 + 1013904223) >>> 0;
      return exteriorSeed / 4294967296;
    }
    for (let i = 0; i < exteriorCount; i++) {
      const z = exteriorRandom() * 2 - 1;
      const angle = exteriorRandom() * Math.PI * 2;
      const radial = Math.sqrt(Math.max(0, 1 - z * z));
      const radius = i < innerExteriorCount ? 18 + Math.pow(exteriorRandom(), 1 / 3) * 202
        : Math.cbrt(Math.pow(220,3)+exteriorRandom()*(Math.pow(Math.min(camera.far*.65,420),3)-Math.pow(220,3)));
      const j = i * 3;
      exteriorPositions[j] = Math.cos(angle) * radial * radius;
      exteriorPositions[j + 1] = Math.sin(angle) * radial * radius;
      exteriorPositions[j + 2] = z * radius;
    }
    const exteriorGeometry = addResource(new T.BufferGeometry());
    exteriorGeometry.setAttribute('position', new T.BufferAttribute(exteriorPositions, 3));
    exteriorGeometry.computeBoundingSphere();
    const exteriorMaterial = addResource(new T.PointsMaterial({
      color: 0x888888,
      map: coreTex,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      blending: T.AdditiveBlending,
      opacity: 0.42,
      size: 0.38,
      sizeAttenuation: true
    }));
    const exteriorStars = new T.Points(exteriorGeometry, exteriorMaterial);
    exteriorStars.frustumCulled = false;
    scene.add(exteriorStars);

    const targetStars = waypoints.map(function (w, i) {
      const s = new T.Sprite(addResource(new T.SpriteMaterial({ map: coreTex, color: 0xf5bf74, transparent: true, blending: T.AdditiveBlending, depthWrite: false, opacity: 0.65 })));
      s.position.set(w.position[0], w.position[1], w.position[2]);
      /* Navigation beacons stay legible after the route contracts into the
         GLB's coordinate space; they no longer inherit route scale. */
      s.scale.setScalar(i === 0 ? 0 : 0.18);
      scene.add(s);
      return s;
    });

    /* Destination groups remain as lightweight visibility anchors. The supplied
       GLB is the only galaxy field; no competing procedural point cloud is
       generated here. */
    const motifs = waypoints.map(function (w, index) {
      const g = new T.Group();
      g.position.set(w.position[0], w.position[1], w.position[2]);
      g.scale.setScalar(SPAN);
      scene.add(g);
      return g;
    });

    /* Direct legs and station framings are cached once. Their world-space
       endpoints stay intact; orientation no longer requires a retreat arc. */

    const stations = waypoints.map(function (w) { return new T.Vector3(w.cameraPosition[0], w.cameraPosition[1], w.cameraPosition[2]); });
    const framings = waypoints.map(function (w) { return new T.Vector3(w.cameraTarget[0], w.cameraTarget[1], w.cameraTarget[2]); });

    /* Each panel has a fixed physical size and anchor just ahead of its arrival
       camera station. At a multi-unit distance it projects to only a few pixels.
       Layout calibration changes only on resize, never as a scale animation. */
    const stationFrames = stations.map(function (station, i) {
      return new T.Matrix4().lookAt(station, framings[i], new T.Vector3(0, 1, 0));
    });
    const destinationAnchors = stations.map(function (station, i) {
      return new T.Vector3(0, 0, -MOTION.SPATIAL.standOff).applyMatrix4(stationFrames[i]).add(station);
    });
    const viewPoint = new T.Vector3();
    function setDestinationLayout(index, x, y) {
      const fov = index === 0 ? (waypoints[0].openingFov || 45) : 45;
      const halfHeight = Math.tan(fov * Math.PI / 360) * MOTION.SPATIAL.standOff;
      destinationAnchors[index].set((x / innerWidth * 2 - 1) * halfHeight * camera.aspect,
        (1 - y / innerHeight * 2) * halfHeight, -MOTION.SPATIAL.standOff)
        .applyMatrix4(stationFrames[index]).add(stations[index]);
    }
    function projectDestination(index, out) {
      viewPoint.copy(destinationAnchors[index]).applyMatrix4(camera.matrixWorldInverse);
      const depth = -viewPoint.z;
      if (depth <= camera.near || depth >= camera.far) {
        out.visible = false; out.x = 0; out.y = 0; out.scale = 0; return;
      }
      const arrivalFov = index === 0 ? (waypoints[0].openingFov || 45) : 45;
      const lens = Math.tan(camera.fov * Math.PI / 360);
      out.scale = MOTION.SPATIAL.standOff / depth * Math.tan(arrivalFov * Math.PI / 360) / lens;
      out.x = innerWidth / 2 + viewPoint.x / depth / lens * innerHeight / 2;
      out.y = innerHeight / 2 - viewPoint.y / depth / lens * innerHeight / 2;
      out.visible = Number.isFinite(out.scale) && Number.isFinite(out.x) && Number.isFinite(out.y);
    }

    const stationOrientations = stationFrames.map(function (matrix) {
      return new T.Quaternion().setFromRotationMatrix(matrix);
    });
    const legs = [];
    for (let i = 0; i < stations.length - 1; i++) {
      const a = stations[i];
      const b = stations[i + 1];
      const chord = b.clone().sub(a);
      const length = Math.max(chord.length(), 1e-3);
      const heading = new T.Quaternion().setFromRotationMatrix(
        new T.Matrix4().lookAt(a, b, new T.Vector3(0, 1, 0)));
      legs.push({ a: a, b: b, direction: chord.divideScalar(length), heading: heading });
    }

    const pos = new T.Vector3();
    const tangent = new T.Vector3(0, 0, -1);
    const desiredOrientation = new T.Quaternion();
    const inverseOrientation = new T.Quaternion();
    const visibilityCorrection = new T.Quaternion();
    const localBearing = new T.Vector3();
    const safeBearing = new T.Vector3();
    const STEERING = Object.freeze({ radiansPerSecond: Math.PI / 4, response: 5.5 / MOTION.UPGRADE.turnDuration,
      departureEnd: 0.28, arrivalStart: 0.50, desktopMargin: 0.80, portraitMargin: 0.70 });
    let orientationReady = false;
    const upVector = new T.Vector3(0, 1, 0);
    const rightVector = new T.Vector3();
    const parallax = new T.Vector2(0, 0);
    const parallaxTarget = new T.Vector2(0, 0);
    const projected = new T.Vector3();

    function smooth(value) {
      const t = Math.max(0, Math.min(1, value));
      return t * t * (3 - 2 * t);
    }

    let flightSpeed = 0;   /* 0 at a station, ~1 at cruise */

    /* Resolves camera position, framing and speed for a narrative progress
       value. This is the whole flight model; nothing else moves the camera. */
    function fly(p, delta) {
      const index = Math.min(Math.floor(p), stations.length - 1);
      const fraction = p - index;
      const PHASE = MOTION.chapter(index).phase;
      const leg = legs[Math.min(index, legs.length - 1)];
      const u = Math.max(0, Math.min(1, (fraction - PHASE.holdEnd) / (PHASE.flightEnd - PHASE.holdEnd)));
      const openingFov = waypoints[0] && waypoints[0].openingFov;
      const nextFov = openingFov && index === 0 ? openingFov + (45 - openingFov) * u : 45;
      if (camera.fov !== nextFov) { camera.fov = nextFov; camera.updateProjectionMatrix(); }

      if (fraction <= PHASE.holdEnd || !leg || index >= legs.length) {
        /* Arrived. The frustum is pinned and the destination framed: this is
           the readable dwell, and the only time the ship is still. */
        pos.copy(stations[index]);
        desiredOrientation.copy(stationOrientations[index]);
        flightSpeed = 0;
        tangent.set(0, 0, -1).applyQuaternion(desiredOrientation);
      } else {
        const s = profile.arc(u);
        pos.copy(leg.a).lerp(leg.b, s);
        tangent.copy(leg.direction);
        flightSpeed = profile.speed(u);
        /* A reversible orientation schedule: one departure adjustment, a
           fixed transit heading, and an early handoff to the arrival frame.
           Reversing scroll retraces this schedule without flipping heading. */
        desiredOrientation.copy(stationOrientations[index]).slerp(leg.heading, smooth(u / STEERING.departureEnd));
        desiredOrientation.slerp(stationOrientations[index + 1], smooth((u - STEERING.arrivalStart) / (1 - STEERING.arrivalStart)));
      }
      rightVector.copy(tangent).cross(upVector);
      if (rightVector.lengthSq() > 1e-6) rightVector.normalize();
      else rightVector.set(1, 0, 0);

      /* Pointer parallax: a small damped offset perpendicular to travel, so the
         viewer can lean without the camera becoming a free-flying drone. */
      if (!calm && !detail) {
        parallax.x += (parallaxTarget.x - parallax.x) * (1 - Math.exp(-delta * FLIGHT.parallaxEase));
        parallax.y += (parallaxTarget.y - parallax.y) * (1 - Math.exp(-delta * FLIGHT.parallaxEase));
        const amount = FLIGHT.parallax * SPAN * Math.min(0.2, flightSpeed * 0.1);
        pos.addScaledVector(rightVector, parallax.x * amount);
        pos.addScaledVector(upVector, -parallax.y * amount * 0.55);
      }

      camera.position.copy(pos);
      /* Only an out-of-margin destination warrants a bearing correction.
         Clamp in camera space, using the actual horizontal AND vertical FOV.
         No correction aims at the centre or moves a destination. The final
         approach releases this constraint into the authored reading frame. */
      if (flightSpeed > 0.001 && index < legs.length) {
        inverseOrientation.copy(desiredOrientation).conjugate();
        localBearing.copy(destinationAnchors[index + 1]).sub(pos).applyQuaternion(inverseOrientation).normalize();
        const margin = camera.aspect < 1 ? STEERING.portraitMargin : STEERING.desktopMargin;
        const vertical = Math.tan(camera.fov * Math.PI / 360) * margin;
        const horizontal = vertical * camera.aspect;
        const depth = Math.max(0.0001, -localBearing.z);
        if (localBearing.z >= 0 || Math.abs(localBearing.x) > depth * horizontal || Math.abs(localBearing.y) > depth * vertical) {
          safeBearing.set(Math.max(-horizontal, Math.min(horizontal, localBearing.x / depth)),
            Math.max(-vertical, Math.min(vertical, localBearing.y / depth)), -1).normalize();
          visibilityCorrection.setFromUnitVectors(safeBearing, localBearing);
          inverseOrientation.copy(desiredOrientation).multiply(visibilityCorrection);
          const correctionWeight = smooth(u / STEERING.departureEnd) * (1 - smooth((u - 0.80) / 0.20));
          desiredOrientation.slerp(inverseOrientation, correctionWeight);
        }
      }
      if (!orientationReady || calm) { camera.quaternion.copy(desiredOrientation); orientationReady = true; }
      else {
        const angle = 2 * Math.acos(Math.min(1, Math.abs(camera.quaternion.dot(desiredOrientation))));
        if (angle > 1e-7) camera.quaternion.slerp(desiredOrientation,
          Math.min(1 - Math.exp(-delta * STEERING.response), STEERING.radiansPerSecond * delta / angle));
      }
    }

    function resize() {
      camera.aspect = innerWidth / innerHeight;
      camera.updateProjectionMatrix();
      const ratio = MOTION.pixelRatio('maxPixelRatio');
      if (renderer.getPixelRatio() !== ratio) renderer.setPixelRatio(ratio);
      renderer.setSize(innerWidth, innerHeight);
      invalidate();
    }

    function pointer(e) {
      parallaxTarget.set(e.clientX / innerWidth - 0.5, e.clientY / innerHeight - 0.5);
      if (!calm && !detail && flightSpeed > 0.001) invalidate();
    }

    function tick(now) {
      if (stopped) return;
      frame = 0;
      if (document.hidden || detail) { last = 0; return; }
      const delta = last ? Math.min((now - last) / 1000, 0.05) : 1 / 60;
      last = now;

      /* Sustained slow frames demote the tier once. Density and resolution give
         way; formation, flight and disintegration do not. */
      if (delta > 0.03 && !calm && !detail) slowTime += delta;
      else slowTime = Math.max(0, slowTime - delta);
      if (slowTime > 5) {
        slowTime = 0;
        const previous = renderer.getPixelRatio();
        if (MOTION.demote()) {
          const ratio = MOTION.pixelRatio('maxPixelRatio');
          if (ratio !== previous) renderer.setPixelRatio(ratio);
        }
      }
      if (calm && !dirty) return;

      progress = calm ? targetProgress : progress + (targetProgress - progress) * (1 - Math.exp(-delta * FRICTION));

      fly(calm ? 0 : progress, delta);
      camera.updateMatrixWorld(true);



      const p = calm ? 0 : progress;
      if (p !== beaconProgress) {
        const departing = Math.floor(p);
        const arriving = Math.ceil(p);
        for (let i = 0; i < targetStars.length; i++) {
          const star = targetStars[i];
          star.visible = i === departing || i === arriving;
          const distance = Math.abs(i - p);
          if (star.visible) {
            const amount = Math.max(0, 1 - distance);
            star.scale.setScalar(i === 0 ? 0 : 0.18 + amount * 0.62);
            star.material.opacity = 0.3 + amount * 0.6;
          }
          motifs[i].visible = distance < 1.4;
        }
        beaconProgress = p;
      }

      if (window.onGalaxyFrame) {
        const index = Math.min(Math.max(Math.ceil(progress - 1e-4), 0), targetStars.length - 1);
        projected.copy(targetStars[index].position).project(camera);
        readout.progress = progress;
        readout.index = index;
        readout.speed = flightSpeed;
        readout.starX = (projected.x * 0.5 + 0.5) * innerWidth;
        readout.starY = (-0.5 * projected.y + 0.5) * innerHeight;
        readout.visible = projected.z > -1 && projected.z < 1;
        window.onGalaxyFrame(readout);
      }

      renderer.render(scene, camera);
      dirty = false;
      /* Exponential decay never reaches its target, so these epsilons decide
         how long the loop keeps drawing after the visitor has stopped. The old
         values took roughly two and a half seconds of full-rate rendering to
         satisfy — time spent on sub-pixel motion nobody can see, competing with
         the next scroll gesture if one arrives. These land the same frame the
         movement stops being visible. */
      const settling = Math.abs(targetProgress - progress) > 0.0004 || 1-Math.abs(camera.quaternion.dot(desiredOrientation)) > 0.00004
        || (!calm && !detail && flightSpeed > 0.001 && parallax.distanceToSquared(parallaxTarget) > 0.00004);
      if (!calm && settling) frame = requestAnimationFrame(tick);
      else last = 0;
    }

    function invalidate() {
      dirty = true;
      if (!stopped && !frame && !document.hidden && !detail) frame = requestAnimationFrame(tick);
    }
    function visibility() {
      if (document.hidden) { cancelAnimationFrame(frame); frame = 0; last = 0; }
      else invalidate();
    }
    document.addEventListener('visibilitychange', visibility);
    function contextLost(event) {
      event.preventDefault();
      cancelAnimationFrame(frame); frame = 0; stopped = true;
      if (window.onGalaxyUnavailable) window.onGalaxyUnavailable();
    }
    renderer.domElement.addEventListener('webglcontextlost', contextLost);
    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', pointer, { passive: true });
    invalidate();

    return {
      setDestinationLayout: setDestinationLayout,
      projectDestination: projectDestination,
      setProgress: function (p) {
        if (detail) return;
        const next = Math.max(0, Math.min(waypoints.length - 1, p));
        if (next === targetProgress) return;
        targetProgress = next;
        invalidate();
      },
      /* Jumping (nav, hash, prev/next) must not fake a flight it did not fly:
         settle the camera at the destination instead of easing across the void. */
      snapProgress: function (p) {
        targetProgress = Math.max(0, Math.min(waypoints.length - 1, p));
        progress = targetProgress;
        orientationReady=false;
        fly(progress, 1);
        invalidate();
      },
      setCalm: function (v) { calm = v; invalidate(); },
      setDetail: function (v) {
        detail = v;
        if (v) { targetProgress = progress; cancelAnimationFrame(frame); frame = 0; last = 0; }
        else invalidate();
      },
      speed: function () { return flightSpeed; },
      destroy: function () {
        stopped = true;
        cancelAnimationFrame(frame);
        window.removeEventListener('resize', resize);
        window.removeEventListener('pointermove', pointer);
        document.removeEventListener('visibilitychange', visibility);
        renderer.domElement.removeEventListener('webglcontextlost', contextLost);
        galaxyAsset.destroy();
        resources.forEach(function (r) { if (r && r.dispose) r.dispose(); });
        renderer.dispose();
        renderer.domElement.remove();
      }
    };
  };
})();
