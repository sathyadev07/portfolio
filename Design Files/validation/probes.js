// Validation probes for pkg-morph-phone. Loaded in the browser via dynamic import
// from the dev server; not part of the app bundle.
const raf = () => new Promise(r => requestAnimationFrame(r));
const wait = ms => new Promise(r => setTimeout(r, ms));
const rect = el => { if (!el) return null; const b = el.getBoundingClientRect(); return [b.x, b.y, b.width, b.height].map(v => +v.toFixed(2)); };

export async function phoneProbe(label, scrollTo = 0) {
  window.scrollTo({ top: scrollTo, behavior: 'instant' });
  await wait(400);
  const shifts = [];
  const po = new PerformanceObserver(l => { for (const e of l.getEntries()) shifts.push({ v: +e.value.toFixed(4), t: Math.round(e.startTime), src: (e.sources || []).map(s => ({ node: s.node?.className || s.node?.nodeName, prev: [s.previousRect.x, s.previousRect.y, s.previousRect.width, s.previousRect.height].map(Math.round), cur: [s.currentRect.x, s.currentRect.y, s.currentRect.width, s.currentRect.height].map(Math.round) })) }); });
  po.observe({ type: 'layout-shift', buffered: false });
  const trig = document.querySelector('[data-od-id="phone-control"]');
  const header = document.querySelector('.portfolio-topbar');
  const frames = [];
  const sample = phase => { const m = document.getElementById('phone-actions'); frames.push({ phase, t: Math.round(performance.now()), header: rect(header), trig: rect(trig), menu: rect(m), menuPos: m ? getComputedStyle(m).position : null, menuTf: m ? getComputedStyle(m).transform : null, sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, sy: Math.round(scrollY) }); };
  const run = async (phase, ms) => { const t0 = performance.now(); while (performance.now() - t0 < ms) { sample(phase); await raf(); } };
  await run('pre', 100);
  trig.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); trig.click();
  await run('open', 800);
  trig.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); trig.click();
  await run('close', 800);
  po.disconnect();
  const pre = frames[0];
  const headerMoved = frames.filter(f => JSON.stringify(f.header) !== JSON.stringify(pre.header)).length;
  const trigMoved = frames.filter(f => JSON.stringify(f.trig) !== JSON.stringify(pre.trig)).length;
  const settled = frames.filter(f => f.phase === 'open').at(-1);
  const vw = document.documentElement.clientWidth;
  return { label, viewport: [innerWidth, innerHeight], shifts, headerMovedFrames: headerMoved, trigMovedFrames: trigMoved, preHeader: pre.header, preTrig: pre.trig, settledMenu: settled.menu, settledMenuPos: settled.menuPos, menuInsideViewport: settled.menu ? settled.menu[0] >= 0 && settled.menu[0] + settled.menu[2] <= vw : null, menuBelowTrigger: settled.menu ? +(settled.menu[1] - (settled.trig[1] + settled.trig[3])).toFixed(2) : null, menuRightVsTrigRight: settled.menu ? +((settled.menu[0] + settled.menu[2]) - (settled.trig[0] + settled.trig[2])).toFixed(2) : null, scrollWidthMax: Math.max(...frames.map(f => f.sw)), clientWidth: vw, scrollYs: [...new Set(frames.map(f => f.sy))], frames };
}

/* Morph probe. Samples every animation frame: the title rect(s), each visible
   title node's effective opacity (product of ancestor opacities incl. the dialog
   and the card surface), its transform, and its text line rects. */
function effOpacity(el) { let o = 1; for (let n = el; n && n.nodeType === 1; n = n.parentElement) o *= parseFloat(getComputedStyle(n).opacity); return o; }
function lineRects(el) { const r = document.createRange(); r.selectNodeContents(el); return [...r.getClientRects()].map(b => [b.x, b.y, b.width, b.height].map(v => +v.toFixed(2))); }
function titleNodes(cardId) {
  const card = document.querySelector(`[data-od-id="portfolio-title-${cardId}"]`);
  const dlg = document.querySelector(`dialog[open] [data-od-id="detail-title-${cardId}"]`);
  return { card, dlg };
}
function snap(cardId, phase) {
  const { card, dlg } = titleNodes(cardId);
  const nodes = [['card', card], ['dialog', dlg]].filter(([, e]) => e && e.isConnected).map(([k, e]) => { const o = effOpacity(e); const d = e.closest('dialog'); return { k, o: +o.toFixed(4), rect: rect(e), lines: lineRects(e), tf: getComputedStyle(e).transform, font: getComputedStyle(e).fontSize, dialogOpen: d ? d.open : null }; });
  const visible = nodes.filter(n => n.o > 0.01 && (n.k === 'card' || n.dialogOpen));
  return { phase, t: +performance.now().toFixed(1), nodes, visible: visible.map(v => v.k) };
}
export async function morphProbe(cardId, opts = {}) {
  const { interruptAt = null, holdOpen = 900, scroll = true } = opts;
  const card = document.querySelector(`[data-od-id="portfolio-card-${cardId}"]`);
  if (scroll) { card.scrollIntoView({ block: 'center', behavior: 'instant' }); await wait(600); }
  const frames = [];
  const hit = document.querySelector(`[data-od-id="open-detail-${cardId}"]`);
  for (let i = 0; i < 5; i++) { frames.push(snap(cardId, 'pre')); await raf(); }
  const tOpen = performance.now();
  hit.click();
  let clickedClose = false, tClose = null;
  const closeNow = () => { const b = document.querySelector('[data-od-id="close-detail"]'); b.click(); clickedClose = true; tClose = performance.now(); };
  if (interruptAt === 0) closeNow();
  while (true) {
    await raf();
    const now = performance.now();
    if (!clickedClose && interruptAt != null && now - tOpen >= interruptAt) closeNow();
    if (!clickedClose && interruptAt == null && now - tOpen >= holdOpen) closeNow();
    frames.push(snap(cardId, clickedClose ? 'close' : 'open'));
    if (clickedClose && !document.querySelector('dialog[open]') && now - tClose > 100) { for (let i = 0; i < 8; i++) { await raf(); frames.push(snap(cardId, 'post')); } break; }
    if (now - tOpen > 5000) break;
  }
  return { cardId, viewport: [innerWidth, innerHeight], tOpen, tClose, frames };
}

/* Deterministic scrub. Right after the open (or close) click, pause every
   animation owned by the dialog or the source card, step the shared timeline
   in `step` ms increments, and record the title nodes at each step. Then put
   the timeline back and resume, so the real finish/unmount path still runs. */
function morphAnimations(cardId) {
  const card = document.querySelector(`[data-od-id="portfolio-card-${cardId}"]`);
  return document.getAnimations().filter(a => { if (a.constructor !== Animation) return false; const t = a.effect?.target; return t && (t.closest?.('dialog') || card.contains(t)); });
}
async function scrub(cardId, dir, step) {
  let anims = morphAnimations(cardId);
  for (let i = 0; i < 60 && !anims.length; i++) { await new Promise(r => setTimeout(r, 0)); anims = morphAnimations(cardId); }
  const t0 = Number(anims[0].currentTime);
  const rate = anims[0].playbackRate;
  anims.forEach(a => a.pause());
  const total = Math.max(...anims.map(a => { const t = a.effect.getComputedTiming(); return t.endTime; }));
  const samples = [];
  for (let k = 0; k <= Math.ceil(total / step); k++) {
    const ms = dir > 0 ? Math.min(total, k * step) : Math.max(0, total - k * step);
    anims.forEach(a => { a.currentTime = ms; });
    const s = snap(cardId, dir > 0 ? 'open' : 'close'); s.timeline = ms; s.elapsed = Math.min(total, k * step); samples.push(s);
  }
  const titleAnim = anims.find(a => a.effect.target?.dataset?.morph === 'title' && /transform/.test(JSON.stringify(a.effect.getKeyframes())));
  const timing = titleAnim ? { ...titleAnim.effect.getTiming() } : null;
  anims.forEach(a => { a.currentTime = t0; a.playbackRate = rate; a.play(); });
  return { total, anims: anims.length, titleTiming: timing, samples };
}
export async function scrubProbe(cardId, step = 2) {
  const card = document.querySelector(`[data-od-id="portfolio-card-${cardId}"]`);
  card.scrollIntoView({ block: 'center', behavior: 'instant' }); await wait(600);
  const pre = snap(cardId, 'pre');
  document.querySelector(`[data-od-id="open-detail-${cardId}"]`).click();
  const open = await scrub(cardId, 1, step);
  await wait(1200);
  document.querySelector('[data-od-id="close-detail"]').click();
  const close = await scrub(cardId, -1, step);
  // Real-time tail: the unmount handoff.
  const tail = [];
  const tEnd = performance.now();
  while (performance.now() - tEnd < 1500) { tail.push(snap(cardId, document.querySelector('dialog[open]') ? 'close' : 'post')); await raf(); if (tail.filter(f => f.phase === 'post').length > 6) break; }
  return { cardId, viewport: [innerWidth, innerHeight], pre, open, close, tail };
}
