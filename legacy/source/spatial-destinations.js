/* Camera-projected portfolio content. Only the current flight pair is mounted;
   semantic targets remain touch-sized independently of visual distance. */
(function () {
  'use strict';
  window.createSpatialDestinations = function (stage, panels, route) {
    const M = window.MOTION;
    const S = M.SPATIAL;
    let destroyed = false;
    let enabled = false;
    let revision = 0;
    let measuredRevision = -1;
    let chrome = 112;
    const live = new Set();
    const records = panels.map(function (panel, index) {
      const hit = document.createElement('button');
      hit.type = 'button'; hit.className = 'destination-hit od-touch'; hit.hidden = true;
      const title = panel.querySelector('[id^="panel-title-"]');
      const label = title ? title.textContent : route[index].id;
      const detail = route[index].kind === 'project' || route[index].kind === 'experience';
      hit.setAttribute('aria-label', (detail ? 'Open ' : 'Visit ') + label);
      if (detail) { hit.dataset.detail = route[index].contentId; hit.setAttribute('aria-haspopup', 'dialog'); }
      else hit.dataset.goto = route[index].id;
      const caption = document.createElement('span');
      caption.className = 'destination-hit-label'; caption.textContent = label; hit.appendChild(caption);
      const controls = Array.from(panel.querySelectorAll('a[href],button,input,select,textarea,[tabindex]')).map(function (el) {
        return { element: el, tab: el.getAttribute('tabindex') };
      });
      return { panel: panel, hit: hit, controls: controls, readable: null, width: 0, height: 0, revision: -1, x: 0, y: 0,
        scale: 0, visible: false, hitX: 0, hitY: 0, hitVisible: false,
        shown: null, hitShown: null, travelling: null, labelLeft: null, labelAbove: null,
        transform: '', hitTransform: '' };
    });
    function invalidate() { revision++; }
    if (document.fonts) document.fonts.ready.then(function () { if (!destroyed) invalidate(); });
    function retire(index) {
      const r = records[index];
      if (r.panel.contains(document.activeElement) || r.hit === document.activeElement) {
        const current = document.querySelector('.nav-link[aria-current]');
        if (current) current.focus({ preventScroll: true });
      }
      r.panel.remove(); r.hit.remove(); r.hit.hidden = true;
      r.panel.classList.remove('is-live'); r.panel.setAttribute('aria-hidden', 'true');
      r.shown = null; r.hitShown = null;
      r.visible = false; r.hitVisible = false; live.delete(index);
    }
    function mount(index) {
      const r = records[index];
      if (live.has(index)) return r;
      stage.appendChild(r.panel); stage.appendChild(r.hit);
      r.panel.classList.add('is-live', 'is-solid');
      r.panel.removeAttribute('inert'); r.panel.removeAttribute('aria-hidden');
      r.panel.style.visibility = 'hidden'; r.revision = -1; live.add(index);
      return r;
    }
    function sync(progress, galaxy) {
      if (!enabled || destroyed || !galaxy) return;
      const index = Math.min(route.length - 1, Math.max(0, Math.floor(progress)));
      const moving = progress - index > M.chapter(index).phase.holdEnd;
      const incoming = moving && index + 1 < route.length ? index + 1 : -1;
      if (measuredRevision !== revision) {
        chrome = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--chrome-height')) || 112;
        measuredRevision = revision;
      }
      for (const i of live) { if (i !== index && i !== incoming) retire(i); }
      mount(index); if (incoming >= 0) mount(incoming);
      /* Measure the whole active pair before writing either projection. A
         second card must never force layout after the first card's transform. */
      for (const i of live) {
        const r = records[i];
        if (r.revision !== revision) {
          r.width = r.panel.offsetWidth; r.height = r.panel.offsetHeight;
          const margin = Math.max(16, Math.min(80, innerWidth * 0.05));
          const x = innerWidth <= 900 ? innerWidth / 2 : margin + r.width / 2;
          const y = chrome + Math.max(0, innerHeight - chrome) / 2;
          galaxy.setDestinationLayout(i, x, y); r.revision = revision;
        }
      }
      for (const i of live) {
        const r = records[i];
        galaxy.projectDestination(i, r);
        const halfW = r.width * r.scale / 2;
        const halfH = r.height * r.scale / 2;
        r.visible = r.visible && r.x + halfW > 0 && r.x - halfW < innerWidth
          && r.y + halfH > chrome && r.y - halfH < innerHeight;
        if (r.shown !== r.visible) {
          r.panel.style.visibility = r.visible ? 'visible' : 'hidden';
          r.panel.toggleAttribute('inert', !r.visible);
          r.panel.setAttribute('aria-hidden', r.visible ? 'false' : 'true');
          r.shown = r.visible;
        }
        if (r.visible) {
          const transform = 'translate3d(' + (r.x - halfW).toFixed(3) + 'px,'
            + (r.y - halfH).toFixed(3) + 'px,0) scale(' + r.scale.toFixed(6) + ')';
          if (transform !== r.transform) { r.panel.style.transform = transform; r.transform = transform; }
        }
        const travelling = r.scale < S.readableScale;
        if (travelling !== r.travelling) {
          r.panel.classList.toggle('is-travelling', travelling); r.travelling = travelling;
        }
        r.hitVisible = r.visible && r.scale < S.readableScale;
        const readable = r.visible && !r.hitVisible;
        if (readable !== r.readable) {
          r.controls.forEach(function (c) {
            if (!readable) c.element.setAttribute('tabindex', '-1');
            else if (c.tab === null) c.element.removeAttribute('tabindex');
            else c.element.setAttribute('tabindex', c.tab);
          });
          r.readable = readable;
        }
        if (!r.hitVisible && readable && document.activeElement === r.hit && r.controls.length) {
          r.controls[0].element.focus({ preventScroll: true });
        }
        if (r.hitShown !== r.hitVisible) { r.hit.hidden = !r.hitVisible; r.hitShown = r.hitVisible; }
        if (r.hitVisible) {
          const half = S.hitSize / 2;
          r.hitX = Math.max(half, Math.min(innerWidth - half, r.x));
          r.hitY = Math.max(chrome + half + S.hitGap, Math.min(innerHeight - half, r.y));
        }
      }
      const a = records[index];
      const b = incoming >= 0 ? records[incoming] : null;
      if (b && a.hitVisible && b.hitVisible && Math.abs(a.hitX - b.hitX) < S.hitSize + S.hitGap
          && Math.abs(a.hitY - b.hitY) < S.hitSize + S.hitGap) {
        const span = S.hitSize + S.hitGap;
        const center = Math.max(span, Math.min(innerWidth - span, (a.hitX + b.hitX) / 2));
        a.hitX = center - span / 2; b.hitX = center + span / 2;
      }
      for (const i of live) {
        const r = records[i];
        if (!r.hitVisible) continue;
        const left = r.hitX > innerWidth / 2;
        const above = r.hitY > innerHeight / 2;
        if (left !== r.labelLeft) { r.hit.classList.toggle('label-left', left); r.labelLeft = left; }
        if (above !== r.labelAbove) { r.hit.classList.toggle('label-above', above); r.labelAbove = above; }
        const transform = 'translate3d(' + (r.hitX - S.hitSize / 2).toFixed(2)
          + 'px,' + (r.hitY - S.hitSize / 2).toFixed(2) + 'px,0)';
        if (transform !== r.hitTransform) { r.hit.style.transform = transform; r.hitTransform = transform; }
      }
    }
    return {
      sync: sync, invalidate: invalidate,
      mode: function (value) {
        enabled = value; live.forEach(retire);
        panels.forEach(function (panel, i) {
          records[i].hit.remove(); panel.style.removeProperty('transform'); panel.style.removeProperty('visibility');
          panel.classList.remove('is-travelling');
          records[i].controls.forEach(function (c) {
            if (c.tab === null) c.element.removeAttribute('tabindex'); else c.element.setAttribute('tabindex', c.tab);
          });
          records[i].readable = null;
          records[i].shown = null; records[i].hitShown = null; records[i].travelling = null;
          records[i].transform = ''; records[i].hitTransform = '';
          if (value) panel.remove();
          else { stage.appendChild(panel); panel.classList.add('is-live', 'is-solid');
            panel.removeAttribute('inert'); panel.removeAttribute('aria-hidden'); }
        });
        invalidate();
      },
      destroy: function () { destroyed = true; live.forEach(retire); }
    };
  };
})();
