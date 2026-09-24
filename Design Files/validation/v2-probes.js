// v2 validation probes (pkg-layout-motion). Loaded in the page via dynamic
// import from the dev server; not part of the app bundle.
const raf = () => new Promise(r => requestAnimationFrame(r));
const wait = ms => new Promise(r => setTimeout(r, ms));
const R = el => { if (!el) return null; const b = el.getBoundingClientRect(); return [b.x, b.y, b.width, b.height].map(v => +v.toFixed(2)); };
const inter = (a, b) => a && b && a[0] < b[0] + b[2] && a[0] + a[2] > b[0] && a[1] < b[1] + b[3] && a[1] + a[3] > b[1];
const op = (el, pseudo) => parseFloat(getComputedStyle(el, pseudo).opacity);
function effOpacity(el) { let o = 1; for (let n = el; n && n.nodeType === 1; n = n.parentElement) o *= parseFloat(getComputedStyle(n).opacity); return o; }
const waapi = () => document.getAnimations().filter(a => a.constructor === Animation);
const desc = t => t ? (t.dataset?.odId || t.dataset?.morph || t.className?.toString().slice(0, 40) || t.tagName) : '?';

/* Timing summary of every WAAPI animation currently alive. */
export function timings() {
  const list = waapi().map(a => { const t = a.effect.getTiming(); const c = a.effect.getComputedTiming(); return { target: desc(a.effect.target) + (a.effect.pseudoElement || ''), delay: +(+t.delay).toFixed(1), duration: +(+t.duration).toFixed(1), endDelay: +(+t.endDelay).toFixed(1), easing: t.easing, rate: a.playbackRate, endTime: +(+c.endTime).toFixed(1) }; });
  return { count: list.length, total: Math.max(0, ...list.map(x => x.endTime)), list };
}

/* Wall-clock duration of a transition: from the trigger until every WAAPI
   animation is finished/idle (or, for a close, until the element is gone). */
async function until(pred, max = 4000) { const t0 = performance.now(); while (!pred()) { if (performance.now() - t0 > max) return -1; await raf(); } return +(performance.now() - t0).toFixed(1); }
const settled = () => waapi().every(a => a.playState !== 'running');

/* ---------------- Phone ---------------- */
const trig = () => document.querySelector('[data-od-id="phone-control"]');
const menu = () => document.getElementById('phone-actions');
function phoneFrame(phase) {
  const m = menu(), tr = R(trig());
  const f = { phase, t: +performance.now().toFixed(1), trig: tr, menu: null, overTrigger: [], contentVisible: 0, surface: null };
  if (!m) return f;
  f.menu = R(m); f.menuTf = getComputedStyle(m).transform;
  f.surface = { before: +op(m, '::before').toFixed(3), after: +op(m, '::after').toFixed(3) };
  f.animTime = waapi().filter(a => a.effect.target === m)[0]?.currentTime ?? null;
  const kids = [...m.children].filter(k => !k.classList.contains('sr-only'));
  for (const k of kids) {
    const o = effOpacity(k), r = R(k);
    if (o > 0.01) f.contentVisible++;
    if (o > 0.004 && inter(r, tr)) f.overTrigger.push({ el: k.tagName + (k.dataset.odId ? '#' + k.dataset.odId : ''), o: +o.toFixed(3), r });
  }
  // Surface overlap: the glass fill over the trigger (paint order decides if it covers the icon).
  const trigZ = getComputedStyle(trig()).zIndex, menuZ = getComputedStyle(m).zIndex;
  f.surfaceOverTrigger = inter(f.menu, tr) && (f.surface.before > 0.004 || f.surface.after > 0.004);
  f.z = [trigZ, menuZ];
  return f;
}
async function sampleUntil(frames, phase, done, max = 3000) { const t0 = performance.now(); while (performance.now() - t0 < max) { frames.push(phoneFrame(phase)); if (done()) break; await raf(); } }
export async function phoneRun(mode = 'toggle', { scroll = 0 } = {}) {
  scrollTo({ top: scroll, behavior: 'instant' }); await wait(300);
  const frames = [];
  const t = trig();
  frames.push(phoneFrame('pre'));
  const tOpen = performance.now();
  t.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); t.click();
  await raf();
  const openMs = await until(() => { frames.push(phoneFrame('open')); return menu() && settled(); });
  const openTimings = timings();
  await wait(300);
  const tClose = performance.now();
  if (mode === 'toggle') { t.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); t.click(); }
  else if (mode === 'outside') { const target = document.querySelector('#hero-title'); target.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); target.click(); }
  else if (mode === 'escape') { (document.activeElement || document.body).dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); }
  await raf();
  const closeTimings = timings();
  await sampleUntil(frames, 'close', () => !menu());
  const closeMs = +(performance.now() - tClose).toFixed(1);
  for (let i = 0; i < 6; i++) { await raf(); frames.push(phoneFrame('post')); }
  const bad = frames.filter(f => f.overTrigger.length);
  const cl = frames.filter(f => f.phase === 'close');
  return { mode, viewport: [innerWidth, innerHeight], openMs, closeMs, openTimings: { total: openTimings.total, count: openTimings.count }, closeTimings: { total: closeTimings.total, count: closeTimings.count, geometry: closeTimings.list.find(x => x.target === 'phone-actions') }, closeFrames: cl.length, closeMovedFrames: new Set(cl.map(f => f.menuTf)).size, contentOverTriggerFrames: bad.length, firstBad: bad.slice(0, 4), surfaceOverTriggerFrames: frames.filter(f => f.surfaceOverTrigger).length, frames };
}
/* Scrub the phone close: pause every animation and step the timeline. */
export async function phoneScrub(step = 4, dir = -1) {
  scrollTo({ top: 0, behavior: 'instant' }); await wait(300);
  const t = trig();
  if (!menu()) { t.click(); await wait(900); }
  if (dir < 0) { t.click(); }
  else { t.click(); await wait(900); t.click(); await wait(20); t.click(); }
  await raf();
  const anims = waapi().filter(a => menu()?.contains(a.effect.target));
  const total = Math.max(...anims.map(a => a.effect.getComputedTiming().endTime));
  const c0 = anims[0].currentTime, rate = anims[0].playbackRate;
  anims.forEach(a => a.pause());
  const samples = [];
  for (let k = 0; k <= Math.ceil(total / step); k++) { const ms = dir > 0 ? Math.min(total, k * step) : Math.max(0, total - k * step); anims.forEach(a => { a.currentTime = ms; }); const f = phoneFrame(dir > 0 ? 'open' : 'close'); f.timeline = ms; samples.push(f); }
  anims.forEach(a => { a.currentTime = c0; a.playbackRate = rate; a.play(); });
  await wait(900);
  return { total, anims: anims.length, badSamples: samples.filter(s => s.overTrigger.length).map(s => ({ ms: s.timeline, over: s.overTrigger })), surfaceOverTrigger: samples.filter(s => s.surfaceOverTrigger).map(s => s.timeline), samples };
}
/* Pause the phone close at a given timeline ms (for a screenshot). */
export async function phoneFreeze(ms) {
  scrollTo({ top: 0, behavior: 'instant' }); await wait(200);
  const t = trig();
  if (!menu()) { t.click(); await wait(900); }
  t.click(); await raf();
  const anims = waapi().filter(a => menu()?.contains(a.effect.target));
  anims.forEach(a => { a.pause(); a.currentTime = ms; });
  return phoneFrame('frozen');
}
export function unfreeze() { waapi().forEach(a => a.play()); }

/* ---------------- Dialog morphs ---------------- */
function snap(cardId, phase) {
  const card = cardId && document.querySelector(`[data-od-id="portfolio-title-${cardId}"]`);
  const dlgT = document.querySelector('dialog[open] [data-morph="title"]');
  const nodes = [['card', card], ['dialog', dlgT]].filter(([, e]) => e && e.isConnected).map(([k, e]) => { const o = effOpacity(e); const r = document.createRange(); r.selectNodeContents(e); return { k, id: e.dataset.odId, o: +o.toFixed(4), lines: [...r.getClientRects()].map(b => [b.x, b.y, b.width, b.height].map(v => +v.toFixed(2))), text: e.textContent.trim() }; });
  const dlg = document.querySelector('dialog.portfolio-dialog');
  const content = dlg ? [...dlg.querySelectorAll('.detail-content > *')].filter(e => !e.matches('[data-morph]') && !e.querySelector('[data-morph]')).slice(0, 3).map(e => +op(e).toFixed(3)) : [];
  return { phase, t: +performance.now().toFixed(1), nodes, visible: nodes.filter(n => n.o > 0.01).map(n => n.k), dialogOpen: !!dlg?.open, fill: dlg ? +op(dlg, '::before').toFixed(3) : null, content, clip: dlg ? getComputedStyle(dlg).clipPath : null };
}
const openers = { resume: '[data-od-id="view-resume"]', portfolio: '[data-od-id="view-portfolio-pdf"]' };
const opener = id => document.querySelector(openers[id] || `[data-od-id="open-detail-${id}"]`);
/* Real-time run: open, hold, optionally navigate prev/next, close. */
export async function dialogRun(id, { hold = 700, nav = [], closeWith = 'button' } = {}) {
  const o = opener(id); (o.closest('.panel-surface') || o).scrollIntoView({ block: 'center', behavior: 'instant' }); await wait(500);
  const cardId = document.querySelector(`[data-od-id="portfolio-title-${id}"]`) ? id : null;
  const frames = []; for (let i = 0; i < 3; i++) { frames.push(snap(cardId, 'pre')); await raf(); }
  const t0 = performance.now(); o.click(); await raf();
  const openTim = timings();
  const openMs = await until(() => { frames.push(snap(cardId, 'open')); return settled(); });
  await wait(hold);
  let shown = id;
  for (const n of nav) { document.querySelector(`[data-od-id="detail-${n}"]`).click(); await wait(400); shown = document.querySelector('dialog[open] [data-morph="title"]')?.dataset.odId?.replace('detail-title-', '') || shown; }
  const tc = performance.now();
  if (closeWith === 'escape') document.querySelector('dialog[open]').dispatchEvent(new Event('cancel', { cancelable: true }));
  else document.querySelector('[data-od-id="close-detail"]').click();
  await raf();
  const closeTim = timings();
  const closeCard = document.querySelector(`[data-od-id="portfolio-title-${shown}"]`) ? shown : cardId;
  const closeMs = await until(() => { frames.push(snap(closeCard, 'close')); return !document.querySelector('dialog.portfolio-dialog'); });
  for (let i = 0; i < 6; i++) { await raf(); frames.push(snap(closeCard, 'post')); }
  return { id, nav, shown, viewport: [innerWidth, innerHeight], openMs, closeMs, openTotal: openTim.total, closeTotal: closeTim.total, closeTimings: closeTim.list.filter(x => /title|dialog|detail/.test(x.target)).slice(0, 6), analysis: analyze(frames), frames };
}
function analyze(frames) {
  let multi = 0, none = 0, dips = 0, jumps = [];
  let prev = null, prevD = null;
  for (const [i, f] of frames.entries()) {
    if (f.phase === 'pre' || f.phase === 'post') { if (f.visible.length !== 1 && f.nodes.length) { if (f.visible.length > 1) multi++; else none++; } continue; }
    if (!f.nodes.length) continue;
    const v = f.nodes.filter(n => n.o > 0.01);
    if (v.length > 1) multi++; if (!v.length) none++;
    const p = [...v].sort((a, b) => b.o - a.o)[0]; if (!p) continue;
    if (p.o < 0.99) dips++;
    const l = p.lines[0]; const pos = [l[0], l[1], l[0] + l[2], l[1] + l[3]];
    if (prev && prev.phase === f.phase) { const d = pos.map((x, j) => x - prev.pos[j]); if (prevD) { const acc = Math.max(...d.map((x, j) => Math.abs(x - prevD[j]))); if (acc > 24) jumps.push({ i, phase: f.phase, acc: +acc.toFixed(1) }); } prevD = d; } else prevD = null;
    prev = { pos, phase: f.phase };
  }
  return { frames: frames.length, multiVisibleFrames: multi, noTitleFrames: none, titleOpacityDipFrames: dips, bigAccelFrames: jumps };
}
/* Deterministic scrub of a dialog open then close. */
export async function dialogScrub(id, { step = 4, nav = [] } = {}) {
  const o = opener(id); (o.closest('.panel-surface') || o).scrollIntoView({ block: 'center', behavior: 'instant' }); await wait(500);
  const cardId = document.querySelector(`[data-od-id="portfolio-title-${id}"]`) ? id : null;
  const pre = snap(cardId, 'pre');
  o.click(); await raf();
  const open = await scrubAll(cardId, 1, step);
  await wait(700);
  let shown = id;
  for (const n of nav) { document.querySelector(`[data-od-id="detail-${n}"]`).click(); await wait(400); }
  shown = document.querySelector('dialog[open] [data-morph="title"]')?.dataset.odId?.replace('detail-title-', '') || cardId;
  document.querySelector('[data-od-id="close-detail"]').click(); await raf();
  const closeCard = document.querySelector(`[data-od-id="portfolio-title-${shown}"]`) ? shown : cardId;
  const close = await scrubAll(closeCard, -1, step);
  const tail = []; const tEnd = performance.now();
  while (performance.now() - tEnd < 1500) { tail.push(snap(closeCard, document.querySelector('dialog[open]') ? 'close' : 'post')); await raf(); if (tail.filter(f => f.phase === 'post').length > 6) break; }
  const s = (arr) => { const a = analyze(arr); const fillDips = []; let pf = null; for (const f of arr) { if (pf != null && f.fill != null) { /* monotonic fill check */ } pf = f.fill; } return a; };
  return { id, nav, shown: closeCard, pre, open: { total: open.total, n: open.samples.length, ...s(open.samples), monotonic: mono(open.samples, 1) }, close: { total: close.total, n: close.samples.length, ...s(close.samples), monotonic: mono(close.samples, -1) }, tail: s([pre, ...tail]), handoff: handoff(pre, close.samples.at(-1)), openSamples: open.samples, closeSamples: close.samples, tailSamples: tail };
}
function mono(samples) { // count non-monotonic changes in the dialog fill and title position (reversals = pops)
  let rev = 0; let d0 = null; let prev = null;
  for (const s of samples) { const t = s.nodes.find(n => n.k === 'dialog'); if (!t) continue; const y = t.lines[0][1]; if (prev != null) { const d = Math.sign(Math.round((y - prev) * 10)); if (d && d0 && d !== d0) rev++; if (d) d0 = d; } prev = y; }
  return { titleYReversals: rev };
}
function handoff(pre, last) { const c = pre?.nodes.find(n => n.k === 'card'), g = last?.nodes.find(n => n.k === 'dialog'); return c && g ? g.lines[0].map((x, j) => +(x - c.lines[0][j]).toFixed(2)) : null; }
async function scrubAll(cardId, dir, step) {
  let anims = waapi(); for (let i = 0; i < 60 && !anims.length; i++) { await wait(0); anims = waapi(); }
  const c0 = Number(anims[0].currentTime), rate = anims[0].playbackRate;
  anims.forEach(a => a.pause());
  const total = Math.max(...anims.map(a => a.effect.getComputedTiming().endTime));
  const samples = [];
  for (let k = 0; k <= Math.ceil(total / step); k++) { const ms = dir > 0 ? Math.min(total, k * step) : Math.max(0, total - k * step); anims.forEach(a => { a.currentTime = ms; }); const s = snap(cardId, dir > 0 ? 'open' : 'close'); s.timeline = ms; samples.push(s); }
  anims.forEach(a => { a.currentTime = c0; a.playbackRate = rate; a.play(); });
  return { total, samples };
}

/* ---------------- Scroll / frame pacing ---------------- */
export async function scrollPerf(dist = 3000, ms = 3000) {
  scrollTo({ top: 0, behavior: 'instant' }); await wait(400);
  const deltas = []; let last = performance.now(); const t0 = last; const longs = [];
  const po = new PerformanceObserver(l => { for (const e of l.getEntries()) longs.push(+e.duration.toFixed(1)); }); try { po.observe({ type: 'long-animation-frame', buffered: false }); } catch { po.observe({ type: 'longtask', buffered: false }); }
  while (performance.now() - t0 < ms) { await raf(); const now = performance.now(); deltas.push(now - last); last = now; const p = (now - t0) / ms; scrollTo({ top: dist * (p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2), behavior: 'instant' }); }
  await wait(100); po.disconnect();
  const sorted = [...deltas].sort((a, b) => a - b); const med = sorted[sorted.length >> 1];
  return { frames: deltas.length, medianFrameMs: +med.toFixed(2), p95: +sorted[Math.floor(sorted.length * .95)].toFixed(2), max: +sorted.at(-1).toFixed(2), over1_5x: deltas.filter(d => d > med * 1.5).length, longFrames: longs.length, longFrameMs: longs.slice(0, 20) };
}
export function layout() {
  const q = s => document.querySelector(s); const top = el => Math.round((el.getBoundingClientRect().top + scrollY) * 100) / 100;
  return { vw: innerWidth, hero: [top(q('#hero')), +(q('#hero').getBoundingClientRect().bottom + scrollY).toFixed(2)], about: top(q('#about')), experience: top(q('#experience')), projects: top(q('#projects')), panelSurfaces: [...document.querySelectorAll('.portfolio-document .panel-surface')].map(top), footer: top(q('.model-credit')), docHeight: document.documentElement.scrollHeight, revealNodes: document.querySelectorAll('.reveal,[data-reveal]').length };
}
