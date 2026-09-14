/* Travel factors retain their baseline. Only static scroll-distance holds
   receive LINGER; real-time transitions and steering keep their own clocks. */
(function () {
  'use strict';
  const SPEED = Object.freeze({ desktop: 0.5, tablet: 1.1, mobile: 1.1 });
  const BASELINE = Object.freeze({ heroHold: 0.4, sectionHold: 0.64, translation: 2.112, arrivalHold: 1.8 });
  const LINGER = 0.33;
  const reducedQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const ua = navigator.userAgent || '';
  const handheld = /Android|iPhone|iPad|iPod|Mobile|Tablet/i.test(ua)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    || (window.matchMedia('(pointer: coarse)').matches && !window.matchMedia('(any-pointer: fine)').matches);
  const device = handheld ? (/iPhone|iPod/i.test(ua) || (/Android/i.test(ua) && /Mobile/i.test(ua))
    || Math.min(screen.width, screen.height) < 600 ? 'mobile' : 'tablet') : 'desktop';
  const factor = SPEED[device];
  function chapter(index, speed, linger) {
    const dwell = (index === 0 ? BASELINE.heroHold : BASELINE.sectionHold) * linger;
    const translation = BASELINE.translation / speed;
    /* u has already reached 1 during this tail: the camera is stationary.
       Orientation settling remains time-based in galaxy.js and is not cut. */
    const arrivalHold = BASELINE.arrivalHold * linger;
    const scale = dwell + translation + arrivalHold;
    return { scale: scale, phase: { holdEnd: dwell / scale, flightEnd: (dwell + translation) / scale } };
  }
  const chapters = [chapter(0, factor, LINGER), chapter(1, factor, LINGER)];
  const baselineChapters = [chapter(0, 1, 1), chapter(1, 1, 1)];
  const tiers = {
    high: { name: 'high', galaxyShare: 1, maxPixelRatio: 1.75, viewerPixelRatio: 1.6 },
    medium: { name: 'medium', galaxyShare: 0.62, maxPixelRatio: 1.5, viewerPixelRatio: 1.4 },
    low: { name: 'low', galaxyShare: 0.3, maxPixelRatio: 1.25, viewerPixelRatio: 1.2 }
  };
  let activeTier;
  const listeners = new Set();
  function tier() {
    if (activeTier) return activeTier;
    const cores = navigator.hardwareConcurrency || 4;
    const gb = navigator.deviceMemory || 0;
    const pixelRatio = Math.min(devicePixelRatio || 1, 2);
    const pixels = innerWidth * innerHeight * pixelRatio * pixelRatio;
    activeTier = device === 'mobile' ? (cores >= 8 && gb >= 6 ? tiers.medium : tiers.low)
      : cores <= 4 || (gb && gb <= 4) ? tiers.low : cores <= 6 || pixels > 4600000 ? tiers.medium : tiers.high;
    return activeTier;
  }
  function notify() { listeners.forEach(function (fn) { fn(activeTier); }); }
  window.MOTION = {
    DEVICE: device, TRAVEL_SPEED: SPEED, LINGER: LINGER,
    travelFactor: function () { return factor; },
    chapter: function (index) { return chapters[index === 0 ? 0 : 1]; },
    baselineChapter: function (index) { return baselineChapters[index === 0 ? 0 : 1]; },
    UPGRADE: { travelSpeed: 1.5, turnDuration: 3, settling: 5 },
    FLIGHT: { orient: 0.25, turnSpan: 0.58, accelerate: 0.22 / 1.2,
      cruise: 0.40 / 1.2, approach: 0.20 / 1.2, decelerate: 0.08 / 1.2,
      arcBias: 0.26, forwardLook: 0.82, parallax: 0.34, parallaxEase: 2.2 },
    SPATIAL: { standOff: 0.16, hitSize: 44, hitGap: 8, readableScale: 0.98 },
    TIERS: tiers, tier: tier,
    setTier: function (name) { if (tiers[name]) { activeTier = tiers[name]; notify(); } return tier(); },
    demote: function () {
      const order = ['low', 'medium', 'high'];
      const index = order.indexOf(tier().name);
      if (index <= 0) return null;
      activeTier = tiers[order[index - 1]]; notify(); return activeTier;
    },
    onTierChange: function (fn) { listeners.add(fn); return function () { listeners.delete(fn); }; },
    galaxyShare: function () { return tier().galaxyShare; },
    pixelRatio: function (key) { return Math.min(devicePixelRatio || 1, tier()[key || 'maxPixelRatio'] || tier().maxPixelRatio); },
    reduced: function () { return reducedQuery.matches; }
  };
})();
