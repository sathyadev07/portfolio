// node analyze-morph.cjs <frames.json> — frame analysis for the title morph.
const fs = require('fs');
const file = process.argv[2];
let d = JSON.parse(fs.readFileSync(file, 'utf8'));
const F = d.frames;
const issues = [];
const vis = f => f.nodes.filter(n => f.visible.includes(n.k));
// Primary = most opaque visible title node; position = first text line box.
const prim = f => vis(f).sort((a, b) => b.o - a.o)[0];
let multi = 0, dips = 0, minOpacity = 1, prevPos = null, prevDelta = null, prevK = null, jumps = [];
for (let i = 0; i < F.length; i++) {
  const f = F[i]; const v = vis(f);
  if (v.length > 1) { multi++; if (multi <= 5) issues.push(`frame ${i} (${f.phase}) ${v.length} visible titles: ${v.map(n => n.k + '@' + n.o).join(', ')}`); }
  const p = prim(f);
  if (!p) { issues.push(`frame ${i} (${f.phase}) no visible title`); continue; }
  const sumO = Math.min(1, v.reduce((s, n) => s + n.o, 0));
  if (p.o < 0.99) { dips++; minOpacity = Math.min(minOpacity, p.o); }
  const l = p.lines[0]; const pos = [l[0], l[1], l[2]];
  if (prevPos) {
    const delta = pos.map((x, j) => x - prevPos[j]);
    if (prevDelta) {
      const acc = Math.max(...delta.map((x, j) => Math.abs(x - prevDelta[j])));
      if (acc > 2) jumps.push({ i, phase: f.phase, from: prevK, to: p.k, delta: delta.map(x => +x.toFixed(2)), prevDelta: prevDelta.map(x => +x.toFixed(2)), acc: +acc.toFixed(2) });
    }
    prevDelta = delta;
  }
  if (prevK && prevK !== p.k) issues.push(`frame ${i} (${f.phase}) primary title switches ${prevK} -> ${p.k}`);
  prevPos = pos; prevK = p.k;
}
// Line-wrap agreement between the dialog title (at its t=0 pose) and card title.
const wrap = [];
for (const f of F) { const c = f.nodes.find(n => n.k === 'card'), g = f.nodes.find(n => n.k === 'dialog'); if (c && g) { wrap.push({ phase: f.phase, card: c.lines.length, dialog: g.lines.length }); } }
const wrapMismatch = wrap.filter(w => w.card !== w.dialog);
// Closing speed: dialog title first-line displacement after close click.
const closeFrames = F.filter(f => f.phase === 'close').map(f => ({ t: f.t, g: f.nodes.find(n => n.k === 'dialog') })).filter(x => x.g);
let speed = null;
if (closeFrames.length > 3 && d.tClose) {
  const start = closeFrames[0].g.lines[0];
  const end = closeFrames.at(-1).g.lines[0];
  const total = Math.hypot(end[0] - start[0], end[1] - start[1]);
  const series = closeFrames.map(x => ({ dt: +(x.t - d.tClose).toFixed(1), disp: +Math.hypot(x.g.lines[0][0] - start[0], x.g.lines[0][1] - start[1]).toFixed(2) }));
  const firstMove = series.findIndex(s => s.disp > 0.05);
  const moving = series.slice(Math.max(0, firstMove - 1), firstMove + 5);
  const v = [];
  for (let i = 1; i < moving.length; i++) v.push(+((moving[i].disp - moving[i - 1].disp) / (moving[i].dt - moving[i - 1].dt)).toFixed(4));
  speed = { totalPx: +total.toFixed(1), firstMoveMsAfterClick: firstMove >= 0 ? series[firstMove].dt : null, firstFramesPxPerMs: v, series: series.slice(0, 40) };
}
const out = { file, frames: F.length, multiVisibleFrames: multi, opacityDipFrames: dips, minPrimaryOpacity: +minOpacity.toFixed(4), unexplainedJumps: jumps, wrapMismatchFrames: wrapMismatch.length, issues: issues.slice(0, 20), closeSpeed: speed };
console.log(JSON.stringify(out, null, 1));
