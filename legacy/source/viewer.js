/* Project model viewer.

   Renders the real exported geometry for a destination when that geometry
   exists, and the author's real CAD/CAM/FEA media when it does not. It never
   substitutes primitive shapes for engineering parts and never reports analysis
   values it was not given — the outgoing implementation did both.

   Mapping, orientation and framing all come from source/model-map.js. */
(function () {
  'use strict';

  const T = window.THREE;
  const MOTION = window.MOTION;

  /* One probe per model path for the life of the page. */
  const availability = new Map();

  function probe(path) {
    if (availability.has(path)) return availability.get(path);
    const result = fetch(path, { method: 'HEAD' })
      .then(function (response) { return response.ok; })
      .catch(function () { return false; });
    availability.set(path, result);
    return result;
  }

  function el(tag, attrs, children) {
    const node = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (key) {
      const value = attrs[key];
      if (value === null || value === undefined || value === false) return;
      if (key === 'class') node.className = value;
      else if (key === 'text') node.textContent = value;
      else node.setAttribute(key, value === true ? '' : value);
    });
    (children || []).forEach(function (child) { if (child) node.appendChild(child); });
    return node;
  }

  /* When the expected model has not been exported yet, the block states that
     plainly and points at the real media instead. It does not repeat a gallery
     image inside a viewer frame, and it never stands in a substitute shape for
     engineering geometry. */
  function showPending(host) {
    host.classList.add('viewer-pending');
    host.removeAttribute('tabindex');
    host.removeAttribute('role');
    host.removeAttribute('aria-label');
    host.replaceChildren(el('p', {
      class: 'viewer-note mono',
      text: 'The interactive model could not load. The project’s CAD, CAM and FEA images remain available in the gallery above.'
    }));
    /* The controls would have nothing to act on. */
    const block = host.parentNode;
    if (block) {
      const controls = block.querySelector('.viewer-controls');
      if (controls) controls.remove();
    }
    return null;
  }

  function buildModelView(host, spec) {
    let renderer;
    try {
      renderer = new T.WebGLRenderer({ alpha: true, antialias: !MOTION || MOTION.tier().name !== 'low' });
    } catch (error) {
      return showPending(host);
    }

    const orientation = spec.orientation || {};
    const scene = new T.Scene();
    const camera = new T.PerspectiveCamera(38, 1, 0.01, 200);
    const pivot = new T.Group();     /* holds the centred, normalised model */
    scene.add(pivot);

    renderer.setPixelRatio(MOTION ? MOTION.pixelRatio('viewerPixelRatio') : 1.4);
    renderer.outputEncoding = T.sRGBEncoding;
    renderer.setClearColor(0x000000, 0);
    host.replaceChildren(renderer.domElement);

    /* Neutral studio light. Warm key, cool fill, amber rim — enough to read
       machined surfaces without tinting the material. */
    scene.add(new T.HemisphereLight(0xdfe9f5, 0x0a0f1a, 0.85));
    const key = new T.DirectionalLight(0xfff4e2, 1.5);
    key.position.set(3.2, 5.4, 3.8);
    scene.add(key);
    const fill = new T.DirectionalLight(0xb8d0e8, 0.6);
    fill.position.set(-3.6, -1.4, -2.4);
    scene.add(fill);
    const rim = new T.DirectionalLight(0xf5bf74, 0.5);
    rim.position.set(-1.2, 2.2, -4.4);
    scene.add(rim);

    /* Orbit state. Azimuth and elevation start from the authored presentation
       attitude, so the part is first seen the way it is meant to be seen. */
    let azimuth = orientation.azimuth || 0;
    let elevation = orientation.elevation === undefined ? 0.2 : orientation.elevation;
    let distance = 3;
    let baseDistance = 3;
    /* Auto-rotation is the default presentation, exactly as on the original
       portfolio, where every viewer shell carries model-viewer's `auto-rotate`.
       It starts as soon as the geometry is framed; the control below turns it
       off, it never has to be used to turn it on. */
    let auto = true;
    let dragging = false;
    let px = 0;
    let py = 0;
    let frame = 0;
    let disposed = false;
    let loaded = false;
    /* The transformed bounding box, as eight points, plus the angle the
       framing is solved at. See fitDistance(). */
    let corners = [];
    const fitAzimuth = azimuth;
    const fitElevation = elevation;

    function disposeModel(model) {
      model.traverse(function (child) {
        if (!child.isMesh) return;
        if (child.geometry) child.geometry.dispose();
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        materials.forEach(function (material) {
          if (!material) return;
          Object.keys(material).forEach(function (slot) {
            if (material[slot] && material[slot].isTexture) material[slot].dispose();
          });
          material.dispose();
        });
      });
    }

    function place() {
      const pitch = Math.max(-1.35, Math.min(1.35, elevation));
      const cos = Math.cos(pitch);
      camera.position.set(
        Math.sin(azimuth) * cos * distance,
        Math.sin(pitch) * distance,
        Math.cos(azimuth) * cos * distance
      );
      camera.lookAt(0, 0, 0);
    }

    function draw() {
      if (!disposed) renderer.render(scene, camera);
    }

    /* Framing distance, fitted to the part's real silhouette at the authored
       presentation angle.

       A bounding-sphere fit was wrong for anything that is not roughly a ball:
       the sphere that contains a flat relief plate is far larger than the plate
       the camera actually sees, so the part was pushed back until it occupied
       half the frame. The original portfolio fits the model snugly, so this
       projects the eight corners of the transformed bounding box onto the
       camera's own axes and solves for the nearest distance that still holds
       every one of them inside the frustum. `frame` is then the margin left
       around that fit — 1.12 for model-viewer's `auto`, 5% more where the
       original asked for 105%.

       The fit is always taken at the authored angle, never the current one, so
       orbiting the part never re-zooms it under the visitor's hand. */
    function fitDistance() {
      if (!corners.length) return baseDistance;
      const vHalf = camera.fov * Math.PI / 360;
      const tv = Math.tan(vHalf);
      const th = Math.tan(Math.atan(tv * camera.aspect));
      const pitch = Math.max(-1.35, Math.min(1.35, fitElevation));
      const cp = Math.cos(pitch);
      /* Unit vector from the target toward the camera, matching place(). */
      const dx = Math.sin(fitAzimuth) * cp;
      const dy = Math.sin(pitch);
      const dz = Math.cos(fitAzimuth) * cp;
      /* right = normalize(worldUp x d); up = d x right. */
      let rx = dz;
      let rz = -dx;
      const rl = Math.hypot(rx, rz) || 1;
      rx /= rl;
      rz /= rl;
      const ux = dy * rz;
      const uy = dz * rx - dx * rz;
      const uz = -dy * rx;
      let needed = 0;
      for (let i = 0; i < corners.length; i++) {
        const p = corners[i];
        const depth = p.x * dx + p.y * dy + p.z * dz;
        const across = Math.abs(p.x * rx + p.z * rz);
        const up = Math.abs(p.x * ux + p.y * uy + p.z * uz);
        needed = Math.max(needed, depth + across / th, depth + up / tv);
      }
      return Math.max(needed, 0.05) * (orientation.frame || 1.12);
    }

    function resize() {
      const w = host.clientWidth;
      const h = host.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      const previousBase = baseDistance;
      baseDistance = fitDistance();
      /* Preserve whatever zoom the visitor has dialled in across a resize. */
      distance = loaded ? baseDistance * distance / previousBase : baseDistance;
      place();
      draw();
    }

    const loader = new T.GLTFLoader();
    const draco = T.DRACOLoader ? new T.DRACOLoader() : null;
    if (draco) {
      draco.setDecoderPath('assets/vendor/');
      draco.setWorkerLimit(1);
      loader.setDRACOLoader(draco);
    }
    const loading = el('p', { class: 'viewer-loading mono', role: 'status', text: 'Loading 3D model…' });
    host.appendChild(loading);
    host.setAttribute('aria-busy', 'true');
    loader.load(spec.model, function (gltf) {
      const model = gltf.scene || (gltf.scenes && gltf.scenes[0]);
      if (disposed) { if (model) disposeModel(model); return; }
      if (!model) { showPending(host); return; }

      /* Normalise position and scale without touching proportions: centre the
         bounding box on the origin, then apply a single uniform scale. */
      const box = new T.Box3().setFromObject(model);
      const size = box.getSize(new T.Vector3());
      const centre = box.getCenter(new T.Vector3());
      const largest = Math.max(size.x, size.y, size.z) || 1;
      model.position.sub(centre);

      const normalised = new T.Group();
      normalised.add(model);
      normalised.scale.setScalar(1 / largest);

      /* Only the rotation the presentation needs — the asset is never edited.
         'YXZ' is model-viewer's own order for its `orientation` attribute, so
         the angles in model-map.js land on the same axes the original site
         puts them on. */
      const rotation = orientation.rotation || [0, 0, 0];
      normalised.rotation.set(rotation[0], rotation[1], rotation[2], 'YXZ');
      pivot.add(normalised);

      /* The eight corners of the part as the camera will actually see it —
         normalisation and presentation rotation already applied. fitDistance()
         frames against these, so a flat plate and a bulky assembly both fill
         the frame the same way. */
      const fitted = new T.Box3().setFromObject(normalised);
      corners = [];
      for (let bit = 0; bit < 8; bit++) {
        corners.push(new T.Vector3(
          bit & 1 ? fitted.max.x : fitted.min.x,
          bit & 2 ? fitted.max.y : fitted.min.y,
          bit & 4 ? fitted.max.z : fitted.min.z
        ));
      }

      host.tabIndex = 0;
      host.setAttribute('role', 'img');
      host.setAttribute('aria-label', spec.label + ' \u2014 interactive 3D model. Drag or use the arrow keys to rotate; plus and minus to zoom.');
      loading.remove();
      host.removeAttribute('aria-busy');
      host.parentNode.querySelectorAll('[data-viewer-action]').forEach(function (button) { button.disabled = false; });
      place();
      resize();
      loaded = true;
      scheduleRotation();
    }, undefined, function () {
      /* The path resolved but the payload did not parse. Fall back rather than
         leave an empty frame. */
      if (!disposed) { host.removeAttribute('aria-busy'); showPending(host); }
    });

    function down(e) {
      if (e.pointerType === 'touch' && !e.isPrimary) return;
      dragging = true;
      px = e.clientX;
      py = e.clientY;
      host.setPointerCapture(e.pointerId);
    }
    function move(e) {
      if (!dragging) return;
      azimuth -= (e.clientX - px) * 0.008;
      elevation += (e.clientY - py) * 0.008;
      px = e.clientX;
      py = e.clientY;
      place();
      draw();
    }
    function up() { dragging = false; scheduleRotation(); }
    function key2(e) {
      const keys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '=', '-'];
      if (keys.indexOf(e.key) === -1) return;
      e.preventDefault();
      if (e.key === 'ArrowLeft') azimuth -= 0.14;
      if (e.key === 'ArrowRight') azimuth += 0.14;
      if (e.key === 'ArrowUp') elevation += 0.12;
      if (e.key === 'ArrowDown') elevation -= 0.12;
      if (e.key === '+' || e.key === '=') distance = Math.max(baseDistance * 0.5, distance - baseDistance * 0.12);
      if (e.key === '-') distance = Math.min(baseDistance * 2.2, distance + baseDistance * 0.12);
      place();
      draw();
    }

    host.addEventListener('pointerdown', down);
    host.addEventListener('pointermove', move);
    host.addEventListener('pointerup', up);
    host.addEventListener('pointercancel', up);
    host.addEventListener('keydown', key2);
    const observer = new ResizeObserver(resize);
    observer.observe(host);

    let rotationTime = 0;
    let onScreen = false;
    const reducedQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    function canRotate() { return !disposed && loaded && auto && !dragging && onScreen && !document.hidden && !reducedQuery.matches; }
    function scheduleRotation() {
      if (!canRotate()) { cancelAnimationFrame(frame); frame = 0; rotationTime = 0; return; }
      if (!frame) frame = requestAnimationFrame(tick);
    }
    function tick(now) {
      frame = 0;
      if (!canRotate()) { rotationTime = 0; return; }
      const delta = rotationTime ? Math.min((now - rotationTime) / 1000, 0.05) : 0;
      rotationTime = now;
      /* 18deg/s — model-viewer's `rotation-per-second` on the original site.
         Slow enough to read a machined face, fast enough to show the part is
         live rather than a still. */
      azimuth += 0.3142 * delta;
      place();
      draw();
      scheduleRotation();
    }
    const visibilityObserver = new IntersectionObserver(function (entries) {
      onScreen = entries[0].isIntersecting;
      scheduleRotation();
    });
    visibilityObserver.observe(host);
    document.addEventListener('visibilitychange', scheduleRotation);
    reducedQuery.addEventListener('change', scheduleRotation);
    place();

    return {
      rotate: function () { auto = !auto; scheduleRotation(); return auto; },
      reset: function () {
        azimuth = orientation.azimuth || 0;
        elevation = orientation.elevation === undefined ? 0.2 : orientation.elevation;
        distance = baseDistance;
        place();
        draw();
      },
      destroy: function () {
        disposed = true;
        cancelAnimationFrame(frame);
        observer.disconnect();
        visibilityObserver.disconnect();
        document.removeEventListener('visibilitychange', scheduleRotation);
        reducedQuery.removeEventListener('change', scheduleRotation);
        if (draco) draco.dispose();
        host.removeEventListener('pointerdown', down);
        host.removeEventListener('pointermove', move);
        host.removeEventListener('pointerup', up);
        host.removeEventListener('pointercancel', up);
        host.removeEventListener('keydown', key2);
        /* Geometry, materials and every texture they reference are released,
           so repeated traversal of the site cannot accumulate GPU memory. */
        scene.traverse(function (child) {
          if (!child.isMesh) return;
          if (child.geometry) child.geometry.dispose();
          const materials = Array.isArray(child.material) ? child.material : [child.material];
          materials.forEach(function (material) {
            if (!material) return;
            Object.keys(material).forEach(function (slot) {
              const value = material[slot];
              if (value && value.isTexture) value.dispose();
            });
            material.dispose();
          });
        });
        renderer.dispose();
        if (renderer.forceContextLoss) renderer.forceContextLoss();
        renderer.domElement.remove();
      }
    };
  }

  /* `key` is a content id (fsae, proj-01, ...). Returns an instance with a
     destroy() method, or null when the destination presents a still. */
  window.createPortfolioViewer = function (host, key) {
    const spec = (window.PORTFOLIO_MODELS || {})[key];
    if (!spec) return null;
    if (!T || !spec.model) return showPending(host);

    let instance = null;
    let cancelled = false;
    probe(spec.model).then(function (ok) {
      if (cancelled) return;
      if (ok) instance = buildModelView(host, spec);
      else showPending(host);
    });

    /* A proxy: the modal may close before the probe resolves. */
    return {
      rotate: function () { return instance ? instance.rotate() : false; },
      reset: function () { if (instance) instance.reset(); },
      live: function () { return !!instance; },
      destroy: function () {
        cancelled = true;
        if (instance) instance.destroy();
        instance = null;
      }
    };
  };
})();
