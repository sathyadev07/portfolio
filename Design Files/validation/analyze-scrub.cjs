// node analyze-scrub.cjs <scrub.json> — dense timeline analysis.
const fs = require('fs');
const d = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const vis = f => f.nodes.filter(n => f.visible.includes(n.k));
function pass(samples, label) {
  let multi = 0, dips = 0, minO = 1, prev = null, prevD = null, prevK = null; const jumps = [], switches = [];
  for (const [i, s] of samples.entries()) {
    const v = vis(s); if (v.length > 1) multi++;
    const p = v.sort((a, b) => b.o - a.o)[0]; if (!p) { jumps.push({ i, none: true }); continue; }
    if (p.o < 0.99) { dips++; minO = Math.min(minO, p.o); }
    const l = p.lines[0], pos = [l[0], l[1], l[0] + l[2], l[1] + l[3]];
    if (prevK && prevK !== p.k) switches.push({ i, ms: s.timeline, from: prevK, to: p.k });
    if (prev) { const dl = pos.map((x, j) => x - prev[j]); if (prevD) { const acc = Math.max(...dl.map((x, j) => Math.abs(x - prevD[j]))); if (acc > 2) jumps.push({ i, ms: s.timeline, acc: +acc.toFixed(2), dl: dl.map(x => +x.toFixed(2)) }); } prevD = dl; }
    prev = pos; prevK = p.k;
  }
  return { label, samples: samples.length, multiVisible: multi, opacityDips: dips, minPrimaryOpacity: +minO.toFixed(4), jumps: jumps.slice(0, 10), jumpCount: jumps.length, switches };
}
// Close speed: displacement of the dialog title's first line vs elapsed ms since click.
function speed(samples) {
  const g = samples.map(s => ({ ms: s.elapsed, n: s.nodes.find(n => n.k === 'dialog') })).filter(x => x.n);
  const a = g[0].n.lines[0], b = g.at(-1).n.lines[0];
  const total = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const disp = g.map(x => ({ ms: x.ms, px: Math.hypot(x.n.lines[0][0] - a[0], x.n.lines[0][1] - a[1]) }));
  const i0 = disp.findIndex(x => x.px > 0.01);
  const start = disp[Math.max(0, i0 - 1)];
  const at = k => disp.find(x => x.ms >= start.ms + k);
  const win = [4, 8, 16, 33].map(k => { const e = at(k); return e ? { firstMs: k, pxPerMs: +((e.px - start.px) / (e.ms - start.ms)).toFixed(4), normSlope: +(((e.px - start.px) / total) / ((e.ms - start.ms) / (b && disp.at(-1).ms - start.ms))).toFixed(3) } : null; });
  return { totalPx: +total.toFixed(1), motionStartsMsAfterClick: start.ms, motionDurationMs: disp.at(-1).ms - start.ms, initial: win };
}
function tail(t, pre) {
  const out = [];
  let last = null;
  for (const s of t) { const v = vis(s); const p = v.sort((a, b) => b.o - a.o)[0]; out.push({ phase: s.phase, visible: s.visible, primary: p?.k, o: p?.o, line0: p?.lines[0] }); }
  const final = t.filter(s => s.phase === 'close').at(-1);
  const g = final?.nodes.find(n => n.k === 'dialog'), c = pre.nodes.find(n => n.k === 'card');
  const handoffDelta = g && c ? g.lines[0].map((x, j) => +(x - c.lines[0][j]).toFixed(2)) : null;
  return { frames: out.length, multiVisible: t.filter(s => vis(s).length > 1).length, noneVisible: t.filter(s => vis(s).length === 0).length, handoffLastDialogVsCardLine0: handoffDelta, lineCountCard: c?.lines.length, lineCountDialogAtHandoff: g?.lines.length };
}
const openEnd = d.open.samples.at(-1).nodes.find(n => n.k === 'dialog');
const openStart = d.open.samples[0].nodes.find(n => n.k === 'dialog');
const c = d.pre.nodes.find(n => n.k === 'card');
console.log(JSON.stringify({ viewport: d.viewport, card: d.cardId, open: pass(d.open.samples, 'open'), openT0DialogVsCardLine0: openStart ? openStart.lines[0].map((x, j) => +(x - c.lines[0][j]).toFixed(2)) : null, openT0Lines: [c.lines.length, openStart?.lines.length], close: pass(d.close.samples, 'close'), closeTitleTiming: d.close.titleTiming, closeSpeed: speed(d.close.samples), tail: tail(d.tail, d.pre) }, null, 1));
