/* Odyssey controller.
   Owns scroll -> narrative progress, spatial destination presentation, the FLIP
   expansion, navigation, hash/history routing, and the calm/no-WebGL fallbacks.
   Continuous values live in refs and the animation frame; the DOM only changes
   class state when the discrete active destination changes. */
(function () {
  'use strict';

  const doc = document;
  const root = doc.documentElement;
  const data = { experiences: window.EXPERIENCES_DATA || [], projects: window.PROJECTS_DATA || [] };
  const route = window.PORTFOLIO_ROUTE || [];
  const navItems = window.PORTFOLIO_NAV || [];
  const aliases = window.PORTFOLIO_HASH_ALIASES || {};

  const stage = doc.getElementById('stage');
  const track = doc.getElementById('track');
  const canvasHost = doc.getElementById('galaxy');
  const navList = doc.getElementById('waypoint-nav');
  const progressFill = doc.getElementById('progress-fill');
  const progressLabel = doc.getElementById('progress-label');
  const starLabel = doc.getElementById('star-label');
  const starLabelText = starLabel.querySelector('.star-label-inner');
  const liveRegion = doc.getElementById('announcer');
  const motionToggle = doc.getElementById('motion-toggle');
  const prevButton = doc.getElementById('prev-destination');
  const nextButton = doc.getElementById('next-destination');
  const detail = doc.getElementById('detail');
  const detailPanel = detail.querySelector('.detail-panel');
  const detailScrim = detail.querySelector('.detail-scrim');
  const detailBody = doc.getElementById('detail-body');
  const detailPosition = doc.getElementById('detail-position');
  const topbar = doc.querySelector('.topbar');
  let spatial = null;
  function sizeChrome() {
    root.style.setProperty('--chrome-height', Math.ceil(topbar.getBoundingClientRect().height) + 'px');
    if (spatial) spatial.invalidate();
  }
  sizeChrome();
  const chromeObserver = window.ResizeObserver ? new ResizeObserver(sizeChrome) : null;
  if (chromeObserver) chromeObserver.observe(topbar);
  else window.addEventListener('resize', sizeChrome);

  /* Chapter phase model. Every boundary is derived in source/motion-config.js
     from the four requested multipliers, so no timing is a magic number here.
     With travel 4x slower, dwell 2x longer and both materialization phases 5x
     longer, a chapter reads:

       hold (readable) -> disintegrate -> cruise -> materialize -> arrive

     and the numbers come out at roughly 0.23 / 0.41 / 0.83 / 1.00. Crucially
     revealStart sits well after departEnd, so the next destination never begins
     assembling over a card that is still being read. */
  const MOTION = window.MOTION;
  /* Scroll distance per chapter, on top of the multipliers in motion-config.

     This is a mapping from pixels to progress, not a timing: the chapter's
     internal phases — hold, disintegrate, cruise, materialize — keep exactly
     the proportions motion-config derives, whatever this value is. All it
     decides is how far the visitor has to push to travel one leg.

     At 5 a single leg cost about 30,700px on a 1080p screen — roughly 28
     viewport heights, with the whole journey running past 300. That is what
     made the site feel like it took forever to move through, and it also
     multiplied every per-frame cost by the number of frames a traverse spends
     on screen. At 1.5 a leg is about 8 viewport heights and the journey is
     under 90: still a deliberate, cinematic scroll, no longer an endurance
     test. */
  const SLOWDOWN = 1.5;
  /* The approaching destination's name becomes legible during the run-in, just
     before its dust begins to converge. */

  const detailOrder = route
    .filter(function (wp) { return wp.kind === 'experience' || wp.kind === 'project'; })
    .map(function (wp) { return wp.contentId; });

  /* ---------- capability + preference state ---------- */

  function webglSupported() {
    try {
      const probe = doc.createElement('canvas');
        const context = window.WebGLRenderingContext && (probe.getContext('webgl') || probe.getContext('experimental-webgl'));
        const supported = !!context;
        const release = context && context.getExtension('WEBGL_lose_context');
        if (release) release.loseContext();
        return supported;
    } catch (error) {
      return false;
    }
  }

  const reduceQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const compactQuery = window.matchMedia('(max-width: 900px)');
  let storedMotion = null;
  try { storedMotion = localStorage.getItem('odyssey-motion'); } catch (error) { storedMotion = null; }

  const hasWebGL = webglSupported() && !!window.THREE;
  let motionOn = storedMotion === null ? !reduceQuery.matches : storedMotion === 'on';
  let odysseyMode = hasWebGL && motionOn;

  /* ---------- content ---------- */

  const panels = window.buildPanels(route, data);
  panels.forEach(function (panel) { stage.appendChild(panel); });
  const cards = panels.map(function (panel) { return panel.querySelector('.panel-inner'); });

  navItems.forEach(function (item) {
    const entry = doc.createElement('li');
    const button = doc.createElement('button');
    button.type = 'button';
    button.className = 'nav-link od-touch';
    button.textContent = item.label;
    button.setAttribute('data-goto', item.id);
    button.setAttribute('data-od-id', 'nav-' + item.hash);
    entry.appendChild(button);
    navList.appendChild(entry);
  });
  const navButtons = Array.prototype.slice.call(navList.querySelectorAll('[data-goto]'));

  spatial = window.createSpatialDestinations(stage, panels, route);

  /* ---------- odyssey geometry ---------- */

  let offsets = [];
  let baselineOffsets = [];

  function measure() {
    /* CHAPTER_SCALE carries the 4x travel and 2x dwell requests, so slower
       travel is a change to the scroll mapping itself rather than a delay. */
    const base = Math.max(520, window.innerHeight) * (compactQuery.matches ? 1.05 : 1.25)
      * SLOWDOWN;
    offsets = [];
    baselineOffsets = [];
    let running = 0;
    let baselineRunning = 0;
    route.forEach(function (wp, index) {
      running += index === 0 ? 0 : base * MOTION.chapter(index - 1).scale * (wp.dwellLength || wp.dwell || 1);
      baselineRunning += index === 0 ? 0 : base * MOTION.baselineChapter(index - 1).scale * (wp.dwellLength || wp.dwell || 1);
      offsets.push(running);
      baselineOffsets.push(baselineRunning);
    });
    track.style.height = odysseyMode ? (running + window.innerHeight) + 'px' : '';
    refreshScroll();
  }

  function progressFromScroll(y) {
    if (offsets.length < 2) return 0;
    for (let i = 1; i < offsets.length; i++) {
      if (y < offsets[i]) {
        const span = offsets[i] - offsets[i - 1] || 1;
        return (i - 1) + (y - offsets[i - 1]) / span;
      }
    }
    return route.length - 1;
  }

  function scrollForIndex(index) {
    return offsets[Math.max(0, Math.min(index, offsets.length - 1))] || 0;
  }

  function scrollForProgress(p) {
    const i = Math.max(0, Math.min(offsets.length - 1, Math.floor(p)));
    return offsets[i] + (p - i) * ((offsets[i + 1] || offsets[i]) - offsets[i]);
  }
  function baselineScroll(y) {
    const p = progressFromScroll(y);
    const i = Math.max(0, Math.min(route.length - 1, Math.floor(p)));
    if (i === route.length - 1) return baselineOffsets[i];
    const f = p - i;
    const phase = MOTION.chapter(i).phase;
    const old = MOTION.baselineChapter(i).phase;
    const mapped = f <= phase.holdEnd ? f / phase.holdEnd * old.holdEnd
      : f <= phase.flightEnd ? old.holdEnd + (f - phase.holdEnd) / (phase.flightEnd - phase.holdEnd) * (old.flightEnd - old.holdEnd)
      : old.flightEnd + (f - phase.flightEnd) / (1 - phase.flightEnd) * (1 - old.flightEnd);
    return baselineOffsets[i] + mapped * (baselineOffsets[i + 1] - baselineOffsets[i]);
  }

  /* ---------- render loop ---------- */

  function clamp(value) { return value < 0 ? 0 : value > 1 ? 1 : value; }

  let progress = 0;
  let activeIndex = -1;
  let ticking = false;
  let userInitiated = false;
  let settleTimer = 0;

  function applyPanels() {
    spatial.sync(progress, galaxy);
  }

  function pad(value) { return value < 10 ? '0' + value : String(value); }

  function labelFor(waypoint) {
    const panel = panels[indexOfWaypoint(waypoint.id)];
    const title = panel && panel.querySelector('[id^="panel-title-"]');
    return title ? title.textContent : waypoint.id;
  }

  function indexOfWaypoint(id) {
    for (let i = 0; i < route.length; i++) if (route[i].id === id) return i;
    return -1;
  }

  function nearestNavId(index) {
    let found = navItems.length ? navItems[0].id : null;
    navItems.forEach(function (item) {
      const itemIndex = indexOfWaypoint(item.id);
      if (itemIndex !== -1 && itemIndex <= index) found = item.id;
    });
    return found;
  }

  function hashFor(index) {
    const navId = nearestNavId(index);
    const waypoint = route[index];
    if (waypoint.id === navId) {
      const item = navItems.filter(function (entry) { return entry.id === navId; })[0];
      return item ? item.hash : waypoint.id;
    }
    return waypoint.id;
  }

  /* The hash follows a settled destination, never a moving camera. */
  function scheduleHash(index) {
    window.clearTimeout(settleTimer);
    settleTimer = window.setTimeout(function () {
      const target = '#' + hashFor(index);
      if (window.location.hash !== target) history.replaceState({ waypoint: route[index].id }, '', target);
    }, 500);
  }

  function setActive(index) {
    if (index === activeIndex) return;
    activeIndex = index;
    const waypoint = route[index];
    root.setAttribute('data-waypoint', waypoint.id);
    root.setAttribute('data-environment', waypoint.localEnvironment || '');

    const navId = nearestNavId(index);
    navButtons.forEach(function (button) {
      const current = button.getAttribute('data-goto') === navId;
      button.classList.toggle('is-current', current);
      if (current) button.setAttribute('aria-current', 'true');
      else button.removeAttribute('aria-current');
    });

    progressLabel.textContent = pad(index + 1) + ' / ' + pad(route.length);
    prevButton.disabled = index === 0;
    nextButton.disabled = index === route.length - 1;

    if (userInitiated) {
      liveRegion.textContent = 'Destination ' + (index + 1) + ' of ' + route.length + ': ' + labelFor(waypoint);
      userInitiated = false;
    }
    scheduleHash(index);
  }

  function updateProgressBar() {
    const ratio = route.length > 1 ? progress / (route.length - 1) : 0;
    progressFill.style.transform = 'scaleX(' + clamp(ratio).toFixed(4) + ')';
  }

  function arrivedIndex() {
    const index = Math.min(route.length - 1, Math.max(0, Math.floor(progress)));
    return Math.min(route.length - 1, index + (progress - index >= MOTION.chapter(index).phase.flightEnd ? 1 : 0));
  }

  function frame() {
    ticking = false;
    const requestedProgress = progressFromScroll(window.scrollY || window.pageYOffset || 0);
    if(galaxy && odysseyMode){galaxy.setProgress(requestedProgress);return;}
    progress = requestedProgress;
    applyPanels();
    updateProgressBar();
    setActive(arrivedIndex());
    if (galaxy) galaxy.setProgress(progress);
    else updateStarLabel();
  }

  /* Static mode has no camera: the active destination is simply the panel
     closest to the middle of the viewport. */
  function staticFrame() {
    ticking = false;
    const middle = window.innerHeight / 2;
    let best = 0;
    let bestDistance = Infinity;
    for (let i = 0; i < panels.length; i++) {
      const rect = panels[i].getBoundingClientRect();
      const distance = Math.abs(rect.top + rect.height / 2 - middle);
      if (distance < bestDistance) { bestDistance = distance; best = i; }
    }
    progress = best;
    updateProgressBar();
    setActive(best);
  }

  function onScroll() {
    if (ticking || detailOpen || resumeOpen || doc.hidden) return;
    ticking = true;
    requestAnimationFrame(odysseyMode ? frame : staticFrame);
  }

  /* One scroll authority. ScrollTrigger owns the listener, the rAF batching and
     refresh-on-resize; this file only maps scroll position onto journey
     progress. Without GSAP the plain listener still works. */
  const hasGsap = !!(window.gsap && window.ScrollTrigger);
  let scrollInstalled = false;
  let normalizing = false;

  /* The resume PDF is a nested document with its own scroller; normalised touch
     scrolling cannot cooperate with it, so it stands down while the sheet is
     open and resumes afterwards. */
  function suspendNormalize(suspend) {
    if (!normalizing) return;
    try { window.ScrollTrigger.normalizeScroll(suspend ? false : { type: 'touch', allowNestedScroll: true }); }
    catch (error) { /* normalisation is an enhancement, never required */ }
  }

  /* Called once the scene and panels exist, so a refresh cannot run the frame
     callback before everything it touches is initialised. */
  function installScrollAuthority() {
    if (scrollInstalled) return;
    scrollInstalled = true;
    if (!hasGsap) {
      window.addEventListener('scroll', onScroll, { passive: true });
      return;
    }
    window.gsap.registerPlugin(window.ScrollTrigger);
    /* Normalised touch scrolling removes the address-bar jumps that make a long
       scroll-linked journey stutter on mobile. */
    if (window.matchMedia('(pointer: coarse)').matches) {
      try {
        window.ScrollTrigger.normalizeScroll({ type: 'touch', allowNestedScroll: true });
        normalizing = true;
      } catch (error) { normalizing = false; }
    }
    window.ScrollTrigger.create({
      start: 0,
      end: function () { return window.ScrollTrigger.maxScroll(window); },
      onUpdate: function () { onScroll(); },
      onRefresh: function () { onScroll(); }
    });
  }

  function refreshScroll() {
    if (hasGsap && scrollInstalled) window.ScrollTrigger.refresh();
  }

  /* A single tween owns a commanded jump, so its easing belongs to the flight
     system rather than to the browser's own smooth-scroll curve. */
  let travelTween = null;
  function interruptTravel(){if(travelTween){travelTween.kill();travelTween=null;}}
  window.addEventListener('wheel',interruptTravel,{passive:true});
  window.addEventListener('touchstart',interruptTravel,{passive:true});
  function travelTo(y) {
    if (travelTween) travelTween.kill();
    if (!window.gsap) { window.scrollTo({ top: y, behavior: 'smooth' }); return; }
    const state = { y: window.scrollY || window.pageYOffset || 0 };
    const originalDistance = Math.abs(baselineScroll(y) - baselineScroll(state.y));
    const distanceRatio = originalDistance > 0 ? Math.abs(y - state.y) / originalDistance : 1;
    travelTween = window.gsap.to(state, {
      y: y,
      duration: Math.min(3.4, 0.9 + originalDistance / 9000) / MOTION.UPGRADE.travelSpeed * distanceRatio,
      /* The physical velocity profile supplies acceleration; a second scroll
         ease would distort the device-specific travel velocity. */
      ease: 'none',
      overwrite: true,
      onUpdate: function () { window.scrollTo(0, state.y); }
    });
  }

  /* ---------- the approaching destination label ---------- */

  let starReadout = null;
  let labelTransform = '';
  let labelOpacity = '';

  function updateStarLabel() {
    starLabel.classList.remove('is-visible');
  }

  window.onGalaxyFrame = function (readout) {
    starReadout=readout;
    if(odysseyMode){progress=readout.progress;applyPanels();updateProgressBar();setActive(arrivedIndex());}
    updateStarLabel();
  };

  /* ---------- scene ---------- */

  let galaxy = null;

  function startGalaxy() {
    if (!hasWebGL || galaxy) return;
    const waypoints = window.buildWaypoints(window.THREE, { compact: compactQuery.matches });
    galaxy = window.createGalaxyOdyssey(canvasHost, waypoints);
    if (!galaxy) {
      root.classList.add('no-webgl');
      odysseyMode = false;
      motionToggle.disabled = true;
      motionToggle.title = 'The 3D scene could not start on this device; the portfolio is shown as a plain page.';
      return;
    }
    galaxy.setCalm(!motionOn);
  }

  /* ---------- mode switching ---------- */

  function applyMode() {
    odysseyMode = hasWebGL && !!galaxy && motionOn;
    root.classList.toggle('mode-odyssey', odysseyMode);
    root.classList.toggle('mode-static', !odysseyMode);
    motionToggle.setAttribute('aria-pressed', motionOn ? 'true' : 'false');
    motionToggle.textContent = motionOn ? 'Motion: on' : 'Motion: off';
    if (galaxy) galaxy.setCalm(!motionOn);
    measure();
    spatial.mode(odysseyMode);

    if (odysseyMode) {
      frame();
    } else {
      panels.forEach(function (panel) {
        panel.classList.add('is-live');
        panel.classList.add('is-solid');
        panel.removeAttribute('inert');
        panel.removeAttribute('aria-hidden');
        panel.style.removeProperty('--reveal');
        panel.style.removeProperty('--depart');
        panel.style.removeProperty('--deform');
        panel.classList.remove('is-deforming');
      });
      starLabel.classList.remove('is-visible');
      staticFrame();
    }
  }

  /* ---------- navigation ---------- */

  function goTo(id, options) {
    const settings = options || {};
    const index = indexOfWaypoint(id);
    if (index === -1) return;
    window.clearTimeout(settleTimer);
    userInitiated = settings.silent !== true;
    const instant = settings.instant || reduceQuery.matches || !motionOn;
    if (odysseyMode) {
      const destination = scrollForIndex(index);
      if (instant) {
        if (travelTween) travelTween.kill();
        window.scrollTo(0, destination);
        /* Skipping ahead must not fake a flight that was never flown. */
        if (galaxy && galaxy.snapProgress) galaxy.snapProgress(index);
        requestAnimationFrame(frame);
      } else {
        travelTo(destination);
      }
    } else {
      const destinationTop = window.scrollY + panels[index].getBoundingClientRect().top - parseFloat(getComputedStyle(root).getPropertyValue('--chrome-height') || 0);
      window.scrollTo({ top: Math.max(0, destinationTop), behavior: instant ? 'auto' : 'smooth' });
      setActive(index);
    }
    if (settings.push) {
      const target = '#' + hashFor(index);
      if (window.location.hash !== target) history.pushState({ waypoint: route[index].id }, '', target);
    }
  }

  function resolveHash(raw) {
    const key = (raw || '').replace(/^#/, '').toLowerCase();
    if (!key) return null;
    if (aliases[key]) return aliases[key];
    return indexOfWaypoint(key) !== -1 ? key : null;
  }

  function step(direction) {
    const from = activeIndex < 0 ? 0 : activeIndex;
    const next = Math.max(0, Math.min(route.length - 1, from + direction));
    if (next !== from) goTo(route[next].id, { push: true });
  }

  /* The supplied project has no portfolio PDF. Flip this asset flag when the
     author's PDF is added; never substitute the resume for the portfolio. */
  const PORTFOLIO_PDF_AVAILABLE = false;
  let printDocument = null;
  function preparePrint() {
    if (printDocument) return;
    printDocument = doc.createElement('article');
    printDocument.id = 'portfolio-print';
    window.buildPanels(route, data).forEach(function (panel, index) {
      const waypoint = route[index];
      if (waypoint.kind === 'experience' || waypoint.kind === 'project') {
        panel.replaceChildren(...window.buildDetail(waypoint.contentId, data));
      }
      panel.querySelectorAll('.viewer-block, button, .actions, .hint').forEach(function (node) { node.remove(); });
      panel.querySelectorAll('img').forEach(function (img) { img.loading = 'eager'; });
      panel.querySelectorAll('[id]').forEach(function (node) { node.removeAttribute('id'); });
      panel.removeAttribute('id');
      panel.removeAttribute('aria-labelledby');
      printDocument.appendChild(panel);
    });
    doc.body.appendChild(printDocument);
  }
  window.addEventListener('beforeprint', preparePrint);
  window.addEventListener('afterprint', function () {
    if (printDocument) printDocument.remove();
    printDocument = null;
  });
  function openPortfolioPdf(link) {
    if (PORTFOLIO_PDF_AVAILABLE) { window.open(link.getAttribute('href'), '_blank', 'noopener'); return; }
    liveRegion.textContent = 'Opening the complete portfolio for printing. Choose Save as PDF in the print dialog.';
    preparePrint();
    const images = Array.from(printDocument.querySelectorAll('img'));
    Promise.allSettled(images.map(function (img) { return img.decode ? img.decode() : Promise.resolve(); }))
      .then(function () { window.print(); });
  }

  /* ---------- resume ----------

     The resume is the author's own PDF, shown by the browser's own PDF viewer
     inside the site's chrome. Nothing is re-typed into HTML, so the document
     the visitor reads is the document the author wrote — and download, print
     and open-in-tab all act on that same file. */

  const resumeSheet = doc.getElementById('resume');
  const resumeFrame = doc.getElementById('resume-frame');
  const resumePrint = doc.getElementById('resume-print');
  let resumeOpen = false;
  let resumeTrigger = null;

  function resumeKeys(event) {
    if (event.key === 'Escape') { event.preventDefault(); closeResume(); return; }
    if (event.key !== 'Tab') return;
    const focusable = Array.prototype.slice.call(resumeSheet.querySelectorAll(
      'a[href], button:not([disabled]), iframe, [tabindex]:not([tabindex="-1"])'
    )).filter(function (node) { return node.offsetParent !== null; });
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && doc.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && doc.activeElement === last) { event.preventDefault(); first.focus(); }
  }

  function openResume(trigger) {
    if (!resumeSheet || resumeOpen) return;
    resumeOpen = true;
    resumeTrigger = trigger || null;
    /* Fetched only when asked for. */
    if (resumeFrame && !resumeFrame.getAttribute('src')) {
      resumeFrame.setAttribute('src', resumeFrame.getAttribute('data-src'));
    }
    resumeSheet.hidden = false;
    root.classList.add('sheet-open');
    suspendNormalize(true);
    lockBackground(true);
    if (galaxy) galaxy.setDetail(true);
    interruptTravel();
    if (odysseyMode) window.scrollTo(0, scrollForProgress(progress));
    doc.addEventListener('keydown', resumeKeys, true);
    if (window.gsap && !reduceQuery.matches) {
      window.gsap.fromTo(resumeSheet.querySelector('.sheet-panel'),
        { autoAlpha: 0, y: 22, scale: 0.985 },
        { autoAlpha: 1, y: 0, scale: 1, duration: 0.42, ease: 'power3.out' });
      window.gsap.fromTo(resumeSheet.querySelector('.sheet-scrim'),
        { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.42, ease: 'power2.out' });
    }
    liveRegion.textContent = 'Resume opened. Download, print, or return to the portfolio.';
    const close = resumeSheet.querySelector('[data-resume-close]:not([tabindex])');
    if (close) close.focus();
  }

  function closeResume() {
    if (!resumeOpen) return;
    const finish = function () {
      resumeOpen = false;
      resumeSheet.hidden = true;
      root.classList.remove('sheet-open');
      suspendNormalize(false);
      lockBackground(false);
      if (galaxy) galaxy.setDetail(false);
      doc.removeEventListener('keydown', resumeKeys, true);
      if (resumeTrigger && doc.contains(resumeTrigger)) resumeTrigger.focus({ preventScroll: true });
      resumeTrigger = null;
    };
    if (window.gsap && !reduceQuery.matches) {
      window.gsap.to(resumeSheet.querySelector('.sheet-panel'), {
        autoAlpha: 0, y: 14, duration: 0.24, ease: 'power2.in', onComplete: finish
      });
      window.gsap.to(resumeSheet.querySelector('.sheet-scrim'), { autoAlpha: 0, duration: 0.24 });
    } else {
      finish();
    }
  }

  if (resumePrint) {
    resumePrint.addEventListener('click', function () {
      /* Print the PDF itself. Some browsers refuse to drive a framed PDF's
         print dialog, so a new tab is the documented fallback rather than a
         silent no-op. */
      try {
        if (resumeFrame && resumeFrame.contentWindow) {
          resumeFrame.contentWindow.focus();
          resumeFrame.contentWindow.print();
          return;
        }
      } catch (error) { /* fall through */ }
      window.open('assets/Resume.pdf', '_blank', 'noopener');
      liveRegion.textContent = 'The resume opened in a new tab; use your browser print command there.';
    });
  }

  if (resumeSheet) {
    resumeSheet.addEventListener('click', function (event) {
      if (event.target.closest('[data-resume-close]')) closeResume();
    });
  }

  doc.addEventListener('click', function (event) {
    const resume = event.target.closest('#resume-action');
    if (resume) { event.preventDefault(); openResume(resume); return; }

    const pdf = event.target.closest('#portfolio-pdf-action');
    if (pdf) { event.preventDefault(); openPortfolioPdf(pdf); return; }

    const goto = event.target.closest('[data-goto]');
    if (goto) {
      event.preventDefault();
      goTo(goto.getAttribute('data-goto'), { push: true });
      return;
    }
    const opener = event.target.closest('[data-detail]');
    if (opener) {
      event.preventDefault();
      openDetail(opener.getAttribute('data-detail'), opener);
    }
  });

  prevButton.addEventListener('click', function () { step(-1); });
  nextButton.addEventListener('click', function () { step(1); });

  motionToggle.addEventListener('click', function () {
    motionOn = !motionOn;
    try { localStorage.setItem('odyssey-motion', motionOn ? 'on' : 'off'); } catch (error) { /* storage is optional */ }
    storedMotion = motionOn ? 'on' : 'off';
    const current = activeIndex < 0 ? 0 : activeIndex;
    applyMode();
    goTo(route[current].id, { instant: true, silent: true });
    liveRegion.textContent = motionOn
      ? 'Camera flight enabled.'
      : 'Camera flight disabled. The portfolio now scrolls as a plain page.';
  });

  window.addEventListener('popstate', function () {
    const id = resolveHash(window.location.hash);
    if (id) goTo(id, { instant: true });
  });

  doc.addEventListener('keydown', function (event) {
    if (detailOpen || resumeOpen || event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
    const target = event.target;
    if (target && target.closest && target.closest('input, textarea, select, [contenteditable], .viewer-host')) return;
    if (event.key === 'ArrowRight') { event.preventDefault(); step(1); }
    else if (event.key === 'ArrowLeft') { event.preventDefault(); step(-1); }
  });

  /* ---------- FLIP expansion ---------- */

  const FLIP_MS = 450;
  const FLIP_EASE = 'cubic-bezier(0.2, 0, 0, 1)';

  let detailOpen = false;
  let detailTrigger = null;
  let detailId = null;
  let detailClosing = false;
  let transitionVersion = 0;
  let transitionAnimations = [];
  let logoCleanup = null;
  function cancelTransitions() {
    transitionVersion++;
    transitionAnimations.forEach(function (animation) { animation.cancel(); });
    transitionAnimations = [];
    if (logoCleanup) { logoCleanup(); logoCleanup = null; }
  }
  function trackAnimation(animation) {
    if (animation) transitionAnimations.push(animation);
    return animation;
  }
  function lockBackground(locked) {
    stage.inert = locked;
    doc.querySelector('.topbar').inert = locked;
  }
  const viewers = new Map();
  let viewerObserver = null;

  function mountViewers() {
    if (!window.createPortfolioViewer) return;
    viewerObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        const host = entry.target;
        if (!viewerObserver || !detailBody.contains(host)) return;
        const key = host.getAttribute('data-viewer');
        viewerObserver.unobserve(host);
        if (viewers.has(key)) return;
        const instance = window.createPortfolioViewer(host, key);
        if (instance) viewers.set(key, instance);
      });
    }, { root: detailBody, rootMargin: '200px' });
    detailBody.querySelectorAll('[data-viewer]').forEach(function (host) { viewerObserver.observe(host); });
  }

  function teardownViewers() {
    if (viewerObserver) { viewerObserver.disconnect(); viewerObserver = null; }
    viewers.forEach(function (instance) { instance.destroy(); });
    viewers.clear();
    teardownClips();
  }

  /* ---------- machining footage ---------- */

  /* The silent loops attach their source only once their tile is actually in
     view of the detail scroller, and detach it again on the way out, so the
     strip costs one decode at a time instead of three for the life of the
     modal. A visitor who never scrolls to the footage never fetches it. */
  let clipObserver = null;
  const visibleClips = new Set();
  function resumeVisibleClip() {
    let chosen = null;
    const full = detailBody.querySelector('.video-full');
    visibleClips.forEach(function (clip) {
      if (!chosen && !full && !clip.hidden && !doc.hidden && motionOn && !reduceQuery.matches) chosen = clip;
    });
    detailBody.querySelectorAll('.video-preview').forEach(function (clip) {
      if (clip === chosen) {
        if (!clip.getAttribute('src')) clip.setAttribute('src', clip.getAttribute('data-preview'));
        const playback = clip.play(); if (playback) playback.catch(function () {});
      } else {
        clip.pause();
        if (clip.getAttribute('src')) { clip.removeAttribute('src'); clip.load(); }
      }
    });
  }

  function mountClips() {
    const clips = detailBody.querySelectorAll('.video-preview[data-preview]');
    if (!clips.length) return;
    clipObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        const clip = entry.target;
        if (clip.classList.contains('video-full')) { if (!entry.isIntersecting) clip.pause(); return; }
        if (entry.isIntersecting) visibleClips.add(clip);
        else visibleClips.delete(clip);
      });
      resumeVisibleClip();
    }, { root: detailBody, rootMargin: '0px' });
    clips.forEach(function (clip) { clipObserver.observe(clip); });
  }

  function teardownClips() {
    visibleClips.clear();
    if (clipObserver) { clipObserver.disconnect(); clipObserver = null; }
    /* Dropping the source is what actually frees the decoder; pause alone
       leaves the buffered media attached to a detached element. */
    detailBody.querySelectorAll('video').forEach(function (clip) {
      clip.pause();
      clip.removeAttribute('src');
      clip.load();
    });
  }

  /* Swap one tile from its silent loop to the full capture. Only the tile the
     visitor asked for is upgraded, and any tile already playing full footage
     is returned to its loop so two 720p streams never decode at once. */
  function playFullClip(button) {
    const frame = button.closest('.video-frame');
    if (!frame || frame.dataset.full === 'true') return;
    detailBody.querySelectorAll('.video-frame[data-full="true"]').forEach(function (other) {
      const full = other.querySelector('.video-full');
      if (full) {
        if (clipObserver) clipObserver.unobserve(full);
        full.pause(); full.removeAttribute('src'); full.load(); full.remove();
      }
      other.dataset.full = 'false';
      const loop = other.querySelector('.video-preview');
      const play = other.querySelector('.video-play');
      if (play) play.hidden = false;
      if (loop) loop.hidden = false;
    });

    const loop = frame.querySelector('.video-preview');
    if (loop) { loop.pause(); loop.hidden = true; }
    button.hidden = true;

    const full = doc.createElement('video');
    full.className = 'video-full';
    full.controls = true;
    full.playsInline = true;
    full.preload = 'auto';
    full.width = 1280;
    full.height = 720;
    full.setAttribute('aria-label', button.getAttribute('data-video-label') || 'Machining pass');
    full.src = button.getAttribute('data-video-full');
    frame.appendChild(full);
    frame.dataset.full = 'true';
    if (clipObserver) clipObserver.observe(full);
    resumeVisibleClip();
    const started = full.play();
    if (started) started.catch(function () {});
    full.focus({ preventScroll: true });
  }

  function renderDetail(id) {
    teardownViewers();
    while (detailBody.firstChild) detailBody.removeChild(detailBody.firstChild);
    window.buildDetail(id, data).forEach(function (node) { detailBody.appendChild(node); });
    const heading = detailBody.querySelector('h2');
    if (heading) heading.id = 'detail-title';
    detailPosition.textContent = (detailOrder.indexOf(id) + 1) + ' / ' + detailOrder.length;
    detailBody.scrollTop = 0;
    mountViewers();
    mountClips();
    // The visitor's original spatial position is retained beneath the detail.
  }

  /* First / Last / Invert / Play. The card rect is First, the modal rect is
     Last; the inverse transform is applied and then released. The company logo
     runs the same morph independently so it reads as one shared element. */
  function playFlip(fromRect, element, options) {
    const settings = options || {};
    if (!element || !fromRect || !fromRect.width) return null;
    const to = element.getBoundingClientRect();
    if (!to.width || !to.height) return null;
    const dx = fromRect.left + fromRect.width / 2 - (to.left + to.width / 2);
    const dy = fromRect.top + fromRect.height / 2 - (to.top + to.height / 2);
    const sx = fromRect.width / to.width;
    const sy = fromRect.height / to.height;
    const inverted = 'translate3d(' + dx.toFixed(2) + 'px,' + dy.toFixed(2) + 'px,0) scale(' + sx.toFixed(4) + ',' + sy.toFixed(4) + ')';
    const collapsed = { transform: inverted, opacity: settings.fade === false ? 1 : 0.15 };
    const expanded = { transform: 'none', opacity: 1 };
    const frames = settings.reverse ? [expanded, collapsed] : [collapsed, expanded];
    return trackAnimation(element.animate(frames, { duration: settings.reverse ? FLIP_MS * 0.65 : FLIP_MS, easing: FLIP_EASE, fill: 'both' }));
  }

  function logoIn(container) {
    return container ? container.querySelector('.logo-mark') : null;
  }

  // A fixed shared logo avoids inheriting the panel's simultaneous scale.
  function morphLogo(fromRect, destination, reverse) {
    if (!fromRect || !destination) return;
    const to = destination.getBoundingClientRect();
    const clone = destination.cloneNode(true);
    clone.classList.add('flip-logo');
    clone.setAttribute('aria-hidden', 'true');
    Object.assign(clone.style, { left: to.left + 'px', top: to.top + 'px', width: to.width + 'px' });
    detail.appendChild(clone);
    destination.style.visibility = 'hidden';
    logoCleanup = function () { clone.remove(); destination.style.removeProperty('visibility'); };
    const animation = playFlip(fromRect, clone, { fade: false, reverse: reverse });
    if (animation) animation.addEventListener('finish', function () {
      if (logoCleanup) { logoCleanup(); logoCleanup = null; }
    }, { once: true });
  }

  function openDetail(id, trigger) {
    if (detailOpen && detailId === id && !detailClosing) return;
    const swapping = detailOpen;
    interruptTravel();
    window.clearTimeout(settleTimer);
    if (!swapping && odysseyMode) {
      if (galaxy) galaxy.setDetail(true);
      window.scrollTo(0, scrollForProgress(progress));
    }
    if (trigger) detailTrigger = trigger;
    detailId = id;

    const source = swapping ? detailPanel : detailTrigger;
    const first = source ? source.getBoundingClientRect() : null;
    const firstLogo = logoIn(source);
    const firstLogoRect = firstLogo ? firstLogo.getBoundingClientRect() : null;

    cancelTransitions();
    detailClosing = false;

    renderDetail(id);

    if (!swapping) {
      detailOpen = true;
      detail.hidden = false;
      root.classList.add('detail-open');
      lockBackground(true);
      if (galaxy) galaxy.setDetail(true);
      suspendNormalize(true);
      window.addEventListener('wheel', blockOdysseyScroll, { passive: false });
      window.addEventListener('touchmove', blockOdysseyScroll, { passive: false });
      doc.addEventListener('keydown', detailKeys, true);
      if (!reduceQuery.matches) {
        trackAnimation(detailScrim.animate([{ opacity: 0 }, { opacity: 1 }], { duration: FLIP_MS, easing: FLIP_EASE, fill: 'both' }));
      }
    }

    if (!reduceQuery.matches && first) {
      const nextLogo = logoIn(detailPanel);
      if (nextLogo && firstLogoRect) morphLogo(firstLogoRect, nextLogo, false);
      playFlip(first, detailPanel, { fade: !swapping });
    }

    const closeButton = detailPanel.querySelector('[data-detail-close]');
    if (closeButton) closeButton.focus();
  }

  function closeDetail() {
    if (!detailOpen || detailClosing) return;
    cancelTransitions();
    detailClosing = true;
    const version = transitionVersion;
    const target = detailTrigger;
    const finish = function () {
      if (version !== transitionVersion) return;
      detailOpen = false;
      detailClosing = false;
      teardownViewers();
      detail.hidden = true;
      detailId = null;
      root.classList.remove('detail-open');
      lockBackground(false);
      suspendNormalize(false);
      if (galaxy) galaxy.setDetail(false);
      window.removeEventListener('wheel', blockOdysseyScroll);
      window.removeEventListener('touchmove', blockOdysseyScroll);
      doc.removeEventListener('keydown', detailKeys, true);
      cancelTransitions();
      if (target && doc.contains(target)) target.focus({ preventScroll: true });
      detailTrigger = null;
    };

    if (reduceQuery.matches) { finish(); return; }
    trackAnimation(detailScrim.animate([{ opacity: 1 }, { opacity: 0 }], { duration: FLIP_MS * 0.65, easing: FLIP_EASE, fill: 'both' }));
    const rect = target && doc.contains(target) ? target.getBoundingClientRect() : null;
    const targetLogo = logoIn(target);
    if (targetLogo) morphLogo(targetLogo.getBoundingClientRect(), logoIn(detailPanel), true);
    const animation = playFlip(rect, detailPanel, { reverse: true });
    if (animation) animation.addEventListener('finish', finish, { once: true });
    else finish();
  }

  function blockOdysseyScroll(event) {
    if (event.target && event.target.closest && event.target.closest('#detail-body')) return;
    event.preventDefault();
  }

  function detailKeys(event) {
    if (event.key === 'Escape') { event.preventDefault(); closeDetail(); return; }
    if (event.key !== 'Tab') return;
    const focusable = Array.prototype.slice.call(detail.querySelectorAll(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )).filter(function (node) { return node.offsetParent !== null; });
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && doc.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && doc.activeElement === last) { event.preventDefault(); first.focus(); }
  }

  function stepDetail(direction) {
    const position = detailOrder.indexOf(detailId);
    const nextId = detailOrder[(position + direction + detailOrder.length) % detailOrder.length];
    openDetail(nextId, null);
  }

  detail.addEventListener('click', function (event) {
    if (event.target.closest('[data-detail-close]')) { closeDetail(); return; }
    if (event.target.closest('[data-detail-prev]')) { stepDetail(-1); return; }
    if (event.target.closest('[data-detail-next]')) { stepDetail(1); return; }
    const play = event.target.closest('[data-video-full]');
    if (play) { playFullClip(play); return; }
    const action = event.target.closest('[data-viewer-action]');
    if (!action) return;
    const instance = viewers.get(action.getAttribute('data-viewer-for'));
    if (!instance) return;
    const kind = action.getAttribute('data-viewer-action');
    if (kind === 'spin') action.setAttribute('aria-pressed', instance.rotate() ? 'true' : 'false');
    else if (kind === 'reset') instance.reset();
  });

  /* ---------- lifecycle ---------- */

  let resizeTimer = 0;
  window.addEventListener('resize', function () {
    spatial.invalidate();
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(function () {
      const current = progress;
      measure();
      if (odysseyMode) { window.scrollTo(0, scrollForProgress(current)); if (galaxy) galaxy.setProgress(current); }
    }, 180);
  });

  /* gsap.matchMedia owns the breakpoint lifecycle: entering or leaving the
     compact layout remeasures the journey and re-settles the camera, and the
     teardown function runs on the way back out. */
  // The resize handler owns remeasurement without resetting fractional travel.

  reduceQuery.addEventListener('change', function () {
    if (storedMotion !== null) return; // an explicit in-site choice wins
    motionOn = !reduceQuery.matches;
    applyMode();
  });

  window.addEventListener('pagehide', function (event) {
    interruptTravel();
    window.clearTimeout(settleTimer); window.clearTimeout(resizeTimer);
    teardownViewers();
    if (event.persisted) { if (galaxy) galaxy.setDetail(true); return; }
    spatial.destroy();
    if (chromeObserver) chromeObserver.disconnect();
    if (galaxy) galaxy.destroy();
  });
  window.addEventListener('pageshow', function (event) {
    if (!event.persisted) return;
    if (galaxy) galaxy.setDetail(detailOpen || resumeOpen);
    spatial.invalidate();
    if (detailOpen) { mountViewers(); mountClips(); }
    else onScroll();
  });
  doc.addEventListener('visibilitychange', function () {
    if (doc.hidden) {
      interruptTravel();
      detailBody.querySelectorAll('video').forEach(function (clip) { clip.pause(); });
    } else { if (detailOpen) resumeVisibleClip(); else onScroll(); }
  });
  if (doc.fonts) doc.fonts.ready.then(function () { sizeChrome(); spatial.invalidate(); onScroll(); });

  window.onGalaxyUnavailable = function () {
    motionOn = false;
    root.classList.add('no-webgl');
    motionToggle.disabled = true;
    applyMode();
    liveRegion.textContent = 'The 3D scene is unavailable. All portfolio content remains available in the page.';
  };

  if (!hasWebGL) {
    root.classList.add('no-webgl');
    motionToggle.disabled = true;
    motionToggle.title = 'Camera flight needs WebGL, which this browser did not provide.';
  }
  startGalaxy();
  applyMode();
  installScrollAuthority();

  const initial = resolveHash(window.location.hash);
  if (initial) goTo(initial, { instant: true, silent: true });
  else if (odysseyMode) frame();
  else setActive(0);

  root.classList.add('odyssey-ready');
})();
