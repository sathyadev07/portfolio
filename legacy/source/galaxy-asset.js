/* Original galaxy-project presentation adapter.
   The supplied GLB is byte-identical to the source project's galaxy.glb. */
(function () {
  'use strict';
  const T = window.THREE;
  const HAZE = {
    near: { opacity: 0.19, size: 0.052 },
    far: { opacity: 0.036, size: 0.25 },
    core: { opacity: 0.125, span: 152 },
    ambient: { opacity: 0.028, span: 264 }
  };

  window.loadGalaxyAsset = function (parent, renderer, onState) {
    let disposed = false;
    let root = null;
    const resources = new Set();
    function releaseInput(gltf) {
      const owned = new Set();
      gltf.scene.traverse(function (node) {
        if (node.geometry) owned.add(node.geometry);
        const materials = Array.isArray(node.material) ? node.material : node.material ? [node.material] : [];
        materials.forEach(function (material) {
          Object.keys(material).forEach(function (key) { if (material[key] && material[key].isTexture) owned.add(material[key]); });
          owned.add(material);
        });
      });
      owned.forEach(function (resource) { resource.dispose(); });
    }
    const status = document.getElementById('galaxy-load-status');
    const state = function (name, message) {
      if (disposed) return;
      if (status) { status.textContent = message; status.hidden = name === 'ready'; }
      onState(name);
    };
    const release = function () {
      resources.forEach(function (resource) { if (resource && resource.dispose) resource.dispose(); });
      resources.clear();
      if (root && root.parent) root.parent.remove(root);
      root = null;
    };

    state('loading', 'Loading galaxy…');
    const disc = new T.TextureLoader().load(new URL('assets/images/galaxy-disc.png', document.baseURI).href);
    disc.generateMipmaps = false;
    disc.minFilter = T.LinearFilter;
    resources.add(disc);

    new T.GLTFLoader().load(new URL('High-Fidelity-Galaxy.glb', document.baseURI).href, function (gltf) {
      if (disposed) { releaseInput(gltf); return; }
      root = new T.Group();
      gltf.scene.traverse(function (node) {
        if (!node.isPoints || !node.geometry || !node.geometry.getAttribute('position')) return;
        const geometry = node.geometry.clone();
        const position = geometry.getAttribute('position');
        geometry.center();
        const colors = new Float32Array(position.count * 3);
        const color = new T.Color();
        for (let i = 0; i < position.count; i++) {
          const x = position.getX(i);
          const y = position.getY(i);
          const z = position.getZ(i);
          const distance = Math.sqrt(x * x + y * y + z * z) / 100;
          /* The original project's radial color algorithm. */
          color.setRGB(Math.cos(distance), Math.random() * 0.8, Math.sin(distance));
          color.toArray(colors, i * 3);
        }
        geometry.setAttribute('color', new T.BufferAttribute(colors, 3));
        geometry.computeBoundingSphere();

        /* Source point layer: centered GLB geometry, the original 32px sprite,
           vertex colors, unit opacity and the original 0.01 point size. */
        const material = new T.PointsMaterial({
          map: disc,
          transparent: true,
          depthWrite: false,
          depthTest: true,
          vertexColors: true,
          opacity: 1,
          size: 0.01,
          sizeAttenuation: true
        });
        const points = new T.Points(geometry, material);
        points.frustumCulled = false;
        root.add(points);
        resources.add(material);

        /* The source site renders the galaxy through a threshold-zero bloom
           composer. This legacy Three runtime has no compatible composer, so
           two co-located additive envelopes reproduce that optical spread
           without moving, recoloring or multiplying the authored stars. */
        const bloomNear = new T.PointsMaterial({
          map: disc,
          transparent: true,
          depthWrite: false,
          depthTest: true,
          vertexColors: true,
          opacity: HAZE.near.opacity,
          size: HAZE.near.size,
          sizeAttenuation: true,
          blending: T.AdditiveBlending
        });
        const bloomFar = new T.PointsMaterial({
          map: disc,
          transparent: true,
          depthWrite: false,
          depthTest: true,
          vertexColors: true,
          opacity: HAZE.far.opacity,
          size: HAZE.far.size,
          sizeAttenuation: true,
          blending: T.AdditiveBlending
        });
        const nearPoints = new T.Points(geometry, bloomNear);
        const farPoints = new T.Points(geometry, bloomFar);
        nearPoints.frustumCulled = false;
        farPoints.frustumCulled = false;
        nearPoints.renderOrder = -2;
        farPoints.renderOrder = -3;
        root.add(farPoints, nearPoints);
        resources.add(bloomNear);
        resources.add(bloomFar);

        /* Low-frequency core luminosity restores the brown-gold dusty haze
           visible in the source frame. It is optical atmosphere, not a new
           galaxy layer, and remains centered on the authored geometry. */
        const coreGlowMaterial = new T.SpriteMaterial({
          map: disc,
          color: 0xd7a66a,
          transparent: true,
          opacity: HAZE.core.opacity,
          depthWrite: false,
          depthTest: true,
          blending: T.AdditiveBlending
        });
        const coreGlow = new T.Sprite(coreGlowMaterial);
        coreGlow.scale.set(HAZE.core.span, HAZE.core.span, 1);
        coreGlow.renderOrder = -4;
        root.add(coreGlow);
        resources.add(coreGlowMaterial);

        /* A very broad, faint envelope lets the source bloom decay gradually
           into space instead of ending at the point-cloud silhouette. */
        const ambientGlowMaterial = new T.SpriteMaterial({
          map: disc,
          color: 0xd7a66a,
          transparent: true,
          opacity: HAZE.ambient.opacity,
          depthWrite: false,
          depthTest: true,
          blending: T.AdditiveBlending
        });
        const ambientGlow = new T.Sprite(ambientGlowMaterial);
        ambientGlow.scale.set(HAZE.ambient.span, HAZE.ambient.span, 1);
        ambientGlow.renderOrder = -5;
        root.add(ambientGlow);
        resources.add(ambientGlowMaterial);
        resources.add(geometry);
      });
      releaseInput(gltf);
      if (!root.children.length) { release(); state('error', 'Galaxy unavailable. Portfolio navigation remains available.'); return; }
      root.scale.setScalar(0.05);
      parent.add(root);
      state('ready', '');
    }, undefined, function () { state('error', 'Galaxy unavailable. Portfolio navigation remains available.'); });

    return { destroy: function () { disposed = true; release(); } };
  };
})();
