// v3 validation probes (pkg-site-perf). Loaded in the page via dynamic import
// from the dev server; not part of the app bundle.
export * from './v2-probes.js';
const raf = () => new Promise(r => requestAnimationFrame(r));
const wait = ms => new Promise(r => setTimeout(r, ms));

/* rAF sampler + long-task observer around an async driver. */
async function measure(ms, driver) {
  const longTasks = [];
  let po = null;
  try { po = new PerformanceObserver(l => { for (const e of l.getEntries()) longTasks.push(+e.duration.toFixed(1)); }); po.observe({ type: 'longtask' }); } catch {}
  const deltas = [];
  let last = performance.now(), running = true;
  const loop = t => { deltas.push(t - last); last = t; if (running) requestAnimationFrame(loop); };
  requestAnimationFrame(t => { last = t; requestAnimationFrame(loop); });
  const t0 = performance.now();
  const drive = driver ? driver(ms) : wait(ms);
  await Promise.all([drive, wait(ms)]);
  running = false; await raf(); po?.disconnect();
  const elapsed = performance.now() - t0;
  const sorted = [...deltas].sort((a, b) => a - b);
  const p = q => +sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))].toFixed(2);
  const avg = deltas.reduce((a, b) => a + b, 0) / deltas.length;
  return { frames: deltas.length, elapsedMs: +elapsed.toFixed(0), avgFps: +(1000 / avg).toFixed(1), avgFrameMs: +avg.toFixed(2), p50: p(.5), p95: p(.95), p99: p(.99), max: +sorted[sorted.length - 1].toFixed(1), over20ms: deltas.filter(d => d > 20).length, over33ms: deltas.filter(d => d > 33.4).length, longTasks: longTasks.length, longTaskTotalMs: +longTasks.reduce((a, b) => a + b, 0).toFixed(0) };
}
async function scrollDriver(ms) {
  const max = document.documentElement.scrollHeight - innerHeight, t0 = performance.now();
  scrollTo({ top: 0, behavior: 'instant' });
  while (performance.now() - t0 < ms) { await raf(); const u = Math.min(1, (performance.now() - t0) / ms); scrollTo({ top: max * u, behavior: 'instant' }); }
}
function panels() { return [...document.querySelectorAll('.panel-surface, .tilt-panel')].filter(p => { const b = p.getBoundingClientRect(); return b.bottom > 0 && b.top < innerHeight; }); }
async function pointerDriver(ms) {
  const t0 = performance.now(); let prev = null, i = 0;
  window.__tiltFrames = 0; window.__panelHits = 0; window.__dispatchMs = 0; window.__styleMs = 0;
  while (performance.now() - t0 < ms) {
    await raf();
    if ([...document.querySelectorAll('.panel-surface,.tilt-panel')].some(p => p.style.getPropertyValue('--tilt-x') || p.style.transform)) window.__tiltFrames++;
    // Zig-zag path across the viewport, 2 moves per frame (a real mouse is ~125-1000 Hz).
    for (let k = 0; k < 2; k++) {
      i++;
      const x = innerWidth * (.1 + .8 * (.5 + .5 * Math.sin(i / 23))), y = innerHeight * (.15 + .7 * (.5 + .5 * Math.sin(i / 71)));
      const el = document.elementFromPoint(x, y) || document.body;
      const init = { bubbles: true, cancelable: true, composed: true, clientX: x, clientY: y, pointerType: 'mouse', pointerId: 1, isPrimary: true };
      if (el !== prev) { prev?.dispatchEvent(new PointerEvent('pointerout', { ...init, relatedTarget: el })); el.dispatchEvent(new PointerEvent('pointerover', { ...init, relatedTarget: prev })); prev = el; }
      if (el.closest('.panel-surface,.tilt-panel')) window.__panelHits++;
      const d0 = performance.now();
      el.dispatchEvent(new PointerEvent('pointermove', init));
      window.__dispatchMs += performance.now() - d0;
    }
    // Force the style/layout the next frame would do anyway, so its cost lands in a measurable spot.
    const s0 = performance.now(); document.body.getBoundingClientRect(); for (const p of document.querySelectorAll('.panel-surface')) getComputedStyle(p).transform; window.__styleMs += performance.now() - s0;
  }
  prev?.dispatchEvent(new PointerEvent('pointerout', { bubbles: true, pointerType: 'mouse', relatedTarget: document.body }));
}
function tiltState() {
  const list = [...document.querySelectorAll('.panel-surface, .tilt-panel, .panel-tilt')];
  return { count: list.length, transformed: list.filter(p => getComputedStyle(p).transform !== 'none').length, inlineTransform: list.filter(p => p.style.transform).length, willChange: [...document.querySelectorAll('*')].filter(e => getComputedStyle(e).willChange !== 'auto').map(e => (e.dataset.odId || e.className?.toString().slice(0, 30) || e.tagName)), preserve3d: list.filter(p => getComputedStyle(p).transformStyle === 'preserve-3d').length, tiltVars: list.filter(p => p.style.getPropertyValue('--tilt-x')).length };
}
export async function pointerOnly(ms = 4000, n = 3) {
  const card = document.querySelector('.portfolio-work, .portfolio-project');
  const out = [];
  for (let k = 0; k < n; k++) {
    scrollTo({ top: card ? card.getBoundingClientRect().top + scrollY - 120 : 0, behavior: 'instant' }); await wait(500);
    const m = await measure(ms, pointerDriver);
    out.push({ ...m, framesWithTiltApplied: window.__tiltFrames, pointerMovesOverPanels: window.__panelHits, pointermoveHandlerMs: +window.__dispatchMs.toFixed(1), styleFlushMs: +window.__styleMs.toFixed(1) });
  }
  scrollTo({ top: 0, behavior: 'instant' });
  return { viewport: [innerWidth, innerHeight], runs: out };
}
export async function perfSuite(ms = 4000) {
  scrollTo({ top: 0, behavior: 'instant' }); await wait(800);
  const idle = await measure(ms);
  const scroll = await measure(ms, scrollDriver);
  // Pointer run parked mid-page where the work/project cards are.
  const card = document.querySelector('.portfolio-work, .portfolio-project');
  scrollTo({ top: card ? card.getBoundingClientRect().top + scrollY - 120 : 0, behavior: 'instant' }); await wait(500);
  const before = tiltState();
  const pointer = await measure(ms, pointerDriver);
  const during = { ...tiltState(), framesWithTiltApplied: window.__tiltFrames, pointerMovesOverPanels: window.__panelHits, pointermoveHandlerMs: +window.__dispatchMs.toFixed(1), styleFlushMs: +window.__styleMs.toFixed(1) };
  scrollTo({ top: 0, behavior: 'instant' });
  return { viewport: [innerWidth, innerHeight, devicePixelRatio], ua: navigator.userAgent.slice(-40), gpuCanvas: !!document.querySelector('canvas'), idle, scroll, pointer, visiblePanels: panels().length, tiltBefore: before, tiltAfterPointer: during };
}

/* Phone close verification: every path, real time and scrubbed. */
import { phoneRun, phoneScrub } from './v2-probes.js';
const trig = () => document.querySelector('[data-od-id="phone-control"]');
const menu = () => document.getElementById('phone-actions');
export async function phoneAll() {
  const out = {};
  for (const mode of ['toggle', 'outside', 'escape']) {
    const r = await phoneRun(mode);
    const close = r.frames.filter(f => f.phase === 'close'), post = r.frames.filter(f => f.phase === 'post');
    const lastWithMenu = [...close].reverse().find(f => f.menu);
    out[mode] = { openMs: r.openMs, closeMs: r.closeMs, closeFrames: r.closeFrames, closeMovedFrames: r.closeMovedFrames, geometry: r.closeTimings.geometry, contentOverTriggerFrames: r.contentOverTriggerFrames, firstBad: r.firstBad, surfaceOverTriggerFrames: r.surfaceOverTriggerFrames, lastFrameWithMenu: lastWithMenu ? { menu: lastWithMenu.menu, menuTf: lastWithMenu.menuTf, contentVisible: lastWithMenu.contentVisible, surface: lastWithMenu.surface } : null, postFramesWithMenu: post.filter(f => f.menu).length, maxContentVisibleInLast5Close: Math.max(0, ...close.slice(-5).map(f => f.contentVisible)) };
    await wait(400);
  }
  out.scrubClose = (({ total, anims, badSamples, surfaceOverTrigger, samples }) => ({ total, anims, badSamples, surfaceOverTriggerCount: surfaceOverTrigger.length, samples: samples.length, finalSample: samples.at(-1) && { menuTf: samples.at(-1).menuTf, contentVisible: samples.at(-1).contentVisible, surface: samples.at(-1).surface } }))(await phoneScrub(4, -1));
  await wait(600);
  out.rapid = await phoneRapid();
  return out;
}
/* Rapid toggles: open, interrupt the open with a close, reopen mid-close,
   close again; and a close interrupted by outside press + Escape. Sampled
   every frame. */
export async function phoneRapid() {
  scrollTo({ top: 0, behavior: 'instant' }); await wait(300);
  const tr = trig(), trRect = tr.getBoundingClientRect();
  const frames = [];
  const sample = tag => {
    const m = menu(); if (!m) { frames.push({ tag, menu: false }); return; }
    const kids = [...m.children].filter(k => !k.classList.contains('sr-only'));
    const over = kids.filter(k => { let o = 1; for (let n = k; n && n.nodeType === 1; n = n.parentElement) o *= parseFloat(getComputedStyle(n).opacity); const b = k.getBoundingClientRect(); return o > .004 && b.left < trRect.right && b.right > trRect.left && b.top < trRect.bottom && b.bottom > trRect.top; }).length;
    frames.push({ tag, menu: true, over, t: m.getAnimations()[0]?.currentTime ?? null, tf: getComputedStyle(m).transform });
  };
  const run = async (n, tag) => { for (let i = 0; i < n; i++) { await raf(); sample(tag); } };
  const press = () => { tr.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); tr.click(); };
  press(); await run(6, 'open1');           // open, interrupted ~100ms in
  press(); await run(4, 'close1');          // close mid-open
  press(); await run(3, 'reopen');          // reopen mid-close
  press(); await run(2, 'close2');
  press(); await run(30, 'open-settle');    // open to settle
  press(); await run(3, 'close3');          // toggle close then outside + Esc while closing
  document.querySelector('#hero-title')?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
  document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  await run(60, 'close3-settle');
  const bad = frames.filter(f => f.over);
  return { frames: frames.length, contentOverTriggerFrames: bad.length, bad: bad.slice(0, 5), endsClosed: !menu(), expanded: tr.getAttribute('aria-expanded'), tags: frames.map(f => f.tag + ':' + (f.menu ? (f.t == null ? '-' : Math.round(f.t)) : 'x')).join(' ') };
}

/* Detail covering handshake: timeline of the root attribute across open,
   nav, close, interrupted open and unmount. */
export async function coveringRun(id = 'sikorsky') {
  scrollTo({ top: 0, behavior: 'instant' }); await wait(300);
  const log = [], t0 = performance.now();
  const attr = () => document.documentElement.dataset.detailCovering ?? null;
  const dlg = () => document.querySelector('[data-od-id="portfolio-detail-dialog"]');
  const mo = new MutationObserver(() => log.push({ t: +(performance.now() - t0).toFixed(1), attr: attr(), anim: dlg()?.getAnimations().find(a => !a.effect.pseudoElement && a.effect.target === dlg())?.currentTime ?? null, playState: dlg()?.getAnimations()[0]?.playState ?? null }));
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-detail-covering'] });
  const open = document.querySelector(`[data-od-id="open-detail-${id}"]`);
  const step = async (label, fn, ms) => { log.push({ t: +(performance.now() - t0).toFixed(1), step: label }); fn(); await wait(ms); log.push({ t: +(performance.now() - t0).toFixed(1), step: label + ':after', attr: attr() }); };
  await step('open', () => open.click(), 900);
  const rect = dlg()?.getBoundingClientRect();
  await step('next', () => document.querySelector('[data-od-id="detail-next"]')?.click(), 900);
  await step('prev', () => document.querySelector('[data-od-id="detail-previous"]')?.click(), 900);
  // Close: record the attr and the dialog clip on the very first close frame.
  let firstCloseFrame = null;
  log.push({ step: 'close', t: +(performance.now() - t0).toFixed(1) });
  document.querySelector('[data-od-id="close-detail"]').click();
  const attrSync = attr();
  await raf(); firstCloseFrame = { attr: attr(), anim: dlg()?.getAnimations()[0]?.currentTime ?? null };
  await wait(900);
  // Interrupted open: open then close 60ms in.
  await step('open-interrupt', () => open.click(), 60);
  await step('close-early', () => document.querySelector('[data-od-id="close-detail"]').click(), 900);
  // Reversal: close then reopen mid-close.
  await step('open2', () => open.click(), 900);
  await step('close-mid', () => document.querySelector('[data-od-id="close-detail"]').click(), 80);
  await step('keep-open', () => document.querySelector('[data-od-id="close-detail"]').click(), 900);
  await step('esc', () => dlg()?.dispatchEvent(new Event('cancel', { cancelable: true })), 900);
  mo.disconnect();
  return { viewport: [innerWidth, innerHeight], dialogRect: rect && [rect.x, rect.y, rect.width, rect.height], attrSyncAfterCloseClick: attrSync, firstCloseFrame, finalAttr: attr(), log };
}
