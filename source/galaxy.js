/* Galaxy scene and interstellar flight.

   The supplied GLB is the only galaxy representation. Waypoint beacons and
   local interaction motifs remain separate from the asset.

   The camera is no longer a drone easing along a spline. Each leg between two
   destinations is flown: the ship turns away from where it has been, builds
   velocity, cruises along a path that bows with the galaxy's curvature, then
   sights the destination and decelerates into its framing. Position comes from
   an integrated velocity profile, so acceleration and deceleration are real
   rather than implied by easing, and orientation is damped so the view never
   snaps. Every timing and density figure is read from window.MOTION. */
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
    let time = 0;
    let progress = 0;
    let targetProgress = 0;
    let dirty = true;
    let slowTime = 0;
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

    /* ---------- flight geometry ----------

       One leg per waypoint pair. The path is a quadratic Bezier whose control
       point is the chord midpoint pushed laterally away from the galaxy centre:
       that bows the route along the disc's curvature instead of cutting a
       straight chord through it, without ever becoming an orbit. */

    const stations = waypoints.map(function (w) { return new T.Vector3(w.cameraPosition[0], w.cameraPosition[1], w.cameraPosition[2]); });
    const framings = waypoints.map(function (w) { return new T.Vector3(w.cameraTarget[0], w.cameraTarget[1], w.cameraTarget[2]); });
    const stars = waypoints.map(function (w) { return new T.Vector3(w.position[0], w.position[1], w.position[2]); });

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

    const legs = [];
    for (let i = 0; i < stations.length - 1; i++) {
      const a = stations[i];
      const b = stations[i + 1];
      const chord = b.clone().sub(a);
      const mid = a.clone().add(b).multiplyScalar(0.5);
      /* Radial direction from the galaxy centre, which sits at the origin. */
      const radial = mid.clone();
      if (radial.lengthSq() < 1e-6) radial.set(0, 1, 0);
      radial.normalize();
      /* Remove the component along the chord so the bow is purely lateral and
         never lengthens or shortens the route. */
      const along = chord.clone().normalize();
      radial.addScaledVector(along, -radial.dot(along));
      if (radial.lengthSq() < 1e-6) radial.set(0, 1, 0);
      radial.normalize();
      const control = mid.clone().addScaledVector(radial, chord.length() * FLIGHT.arcBias);
      const length = Math.max(chord.length(), 1e-3);
      const away = framings[i].clone().sub(a).normalize();
      const arrival = framings[i + 1].clone().sub(b).normalize();
      const c1 = a.clone().addScaledVector(away, -length * 0.26).addScaledVector(radial, length * 0.10);
      const c2 = b.clone().addScaledVector(arrival, -length * 0.34).addScaledVector(radial, length * 0.10);
      legs.push({ a: a, b: b, c1: c1, c2: c2, control: control, length: length });
    }

    const pos = new T.Vector3();
    const tangent = new T.Vector3(0, 0, -1);
    const scratch = new T.Vector3();
    const desiredLook = new T.Vector3().copy(framings[0]);
    const smoothedLook = new T.Vector3().copy(framings[0]);
    const orientationMatrix = new T.Matrix4();
    const desiredOrientation = new T.Quaternion();
    let orientationReady = false;
    const upVector = new T.Vector3(0, 1, 0);
    const rightVector = new T.Vector3();
    const parallax = new T.Vector2(0, 0);
    const parallaxTarget = new T.Vector2(0, 0);
    const projected = new T.Vector3();

    /* Cubic flight: leave the old plane behind, bow through space, approach the
       next station from behind its reading plane. Both endpoints remain fixed. */
    function pathAt(leg, s, out) {
      const u = 1 - s;
      return out.set(0, 0, 0)
        .addScaledVector(leg.a, u * u * u)
        .addScaledVector(leg.c1, 3 * u * u * s)
        .addScaledVector(leg.c2, 3 * u * s * s)
        .addScaledVector(leg.b, s * s * s);
    }
    function pathTangent(leg, s, out) {
      const u = 1 - s;
      return out.set(0, 0, 0)
        .addScaledVector(leg.a, -3 * u * u)
        .addScaledVector(leg.c1, 3 * u * u - 6 * u * s)
        .addScaledVector(leg.c2, 6 * u * s - 3 * s * s)
        .addScaledVector(leg.b, 3 * s * s);
    }

    let flightSpeed = 0;   /* 0 at a station, ~1 at cruise */

    /* Resolves camera position, framing and speed for a narrative progress
       value. This is the whole flight model; nothing else moves the camera. */
    function fly(p, delta) {
      const index = Math.min(Math.floor(p), stations.length - 1);
      const fraction = p - index;
      const PHASE = MOTION.chapter(index).phase;
      const leg = legs[Math.min(index, legs.length - 1)];

      if (fraction <= PHASE.holdEnd || !leg || index >= legs.length) {
        /* Arrived. The frustum is pinned and the destination framed: this is
           the readable dwell, and the only time the ship is still. */
        pos.copy(stations[index]);
        desiredLook.copy(framings[index]);
        flightSpeed = 0;
        tangent.copy(desiredLook).sub(pos);
        if (tangent.lengthSq() < 1e-6) tangent.set(0, 0, -1);
        tangent.normalize();
      } else {
        const u = Math.min(1,(fraction - PHASE.holdEnd) / (PHASE.flightEnd - PHASE.holdEnd));
        const s = profile.arc(u);
        pathAt(leg, s, pos);
        pathTangent(leg, s, tangent);
        if (tangent.lengthSq() < 1e-6) tangent.set(0, 0, -1);
        tangent.normalize();
        flightSpeed = profile.speed(u);

        /* Where the pilot is looking. Orientation ramps from the departing
           framing to straight down the velocity vector, then hands over to the
           arrival framing — so the old destination slides away behind and the
           new one grows ahead, instead of the camera panning sideways. */
        const turnSpan = Math.max(FLIGHT.turnSpan, 0.001);
        const turnAway = Math.min(1, u / turnSpan);
        const sightSpan = Math.max(FLIGHT.approach + FLIGHT.decelerate, 0.001);
        const sightIn = Math.min(1, Math.max(0, (u - (1 - sightSpan)) / sightSpan));
        const forward = FLIGHT.forwardLook * 0.25
          * (turnAway * turnAway * (3 - 2 * turnAway))
          * (1 - sightIn * sightIn * (3 - 2 * sightIn));

        /* Forward gaze point, most of a leg-length ahead along the tangent. */
        scratch.copy(pos).addScaledVector(tangent, leg.length * 0.9);
        /* Destination gaze point: the arriving framing, biased toward the star
           itself early on so it reads as a point of light being approached. */
        const gazeBlend = Math.min(1, u / Math.min(0.35, FLIGHT.turnSpan));
        desiredLook.copy(framings[index]).lerp(destinationAnchors[index + 1], gazeBlend * gazeBlend * (3 - 2 * gazeBlend));
        const settleGaze = Math.max(0, Math.min(1, (s - 0.85) / 0.15));
        desiredLook.lerp(framings[index + 1], settleGaze * settleGaze * (3 - 2 * settleGaze));
      }

      /* Damped orientation. The look point is filtered rather than assigned, so
         no scroll jump can produce an instantaneous change of heading. */
      smoothedLook.copy(desiredLook);

      /* Bank into the curve, proportional to lateral acceleration. A ship
         rolls; a drone does not. */
      rightVector.copy(tangent).cross(upVector);
      let roll = 0;
      if (leg && flightSpeed > 0.001 && rightVector.lengthSq() > 1e-6) {
        rightVector.normalize();
        /* Constant second derivative of a quadratic Bezier. */
        scratch.copy(leg.a).addScaledVector(leg.control, -2).add(leg.b).multiplyScalar(2);
        roll = Math.max(-0.16, Math.min(0.16, -scratch.dot(rightVector) / leg.length * flightSpeed * 2.4));
      } else {
        rightVector.set(1, 0, 0);
      }
      camera.up.set(0, 1, 0).applyAxisAngle(tangent, roll);

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
      orientationMatrix.lookAt(camera.position,desiredLook,camera.up);
      desiredOrientation.setFromRotationMatrix(orientationMatrix);
      if(!orientationReady||calm){camera.quaternion.copy(desiredOrientation);orientationReady=true;}
      else camera.quaternion.slerp(desiredOrientation,1-Math.exp(-delta*(5.5/MOTION.UPGRADE.turnDuration)));
      /* Original 75° lens for the opening hold; the established 45° route
         lens returns progressively once the visitor begins the first flight. */
      const openingFov = waypoints[0] && waypoints[0].openingFov;
      const departure = index === 0 ? Math.max(0, Math.min(1, (fraction - PHASE.holdEnd) / Math.max(PHASE.flightEnd - PHASE.holdEnd, 0.001))) : 1;
      const nextFov = openingFov ? openingFov + (45 - openingFov) * departure : 45;
      if (camera.fov !== nextFov) { camera.fov = nextFov; camera.updateProjectionMatrix(); }
    }

    function resize() {
      camera.aspect = innerWidth / innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(innerWidth, innerHeight);
      invalidate();
    }

    function pointer(e) {
      parallaxTarget.set(e.clientX / innerWidth - 0.5, e.clientY / innerHeight - 0.5);
      invalidate();
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
      if (!calm && !detail) time += delta;

      progress = calm ? targetProgress : progress + (targetProgress - progress) * (1 - Math.exp(-delta * FRICTION));

      fly(calm ? 0 : progress, delta);
      camera.updateMatrixWorld(true);



      const p = calm ? 0 : progress;
      targetStars.forEach(function (s, i) {
        s.visible = i === Math.floor(p) || i === Math.ceil(p);
        const d = Math.abs(i - p);
        const amount = Math.max(0, 1 - d);
        s.scale.setScalar(i === 0 ? 0 : 0.18 + amount * 0.62);
        s.material.opacity = 0.3 + amount * 0.6;
        /* Distant destinations are not drawn at all. */
        motifs[i].visible = d < 1.4;
      });

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
        targetProgress = Math.max(0, Math.min(waypoints.length - 1, p));
        invalidate();
      },
      /* Jumping (nav, hash, prev/next) must not fake a flight it did not fly:
         settle the camera at the destination instead of easing across the void. */
      snapProgress: function (p) {
        targetProgress = Math.max(0, Math.min(waypoints.length - 1, p));
        progress = targetProgress;
        orientationReady=false;
        fly(progress, 1);
        smoothedLook.copy(desiredLook);
        camera.lookAt(smoothedLook);
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
