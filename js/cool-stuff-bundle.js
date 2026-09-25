// Cool Stuff Mode bundle. Loaded only by static-core.js on an explicit click,
// so React, Three.js, shaders and the display fonts never touch the initial page.
// mount() renders the stylized React portfolio (src/App.tsx) — the site that was
// live before the static page: its own header, hero, experience/project panels,
// detail dialogs and the WebGPU ray-marched black hole background.
// unmount() tears the React root down, which stops the render loop, removes the
// app's listeners and disposes the WebGPU/WebGL renderers.
import { createElement, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from '../src/App';
import { PANEL_TILT_ENABLED } from '../src/features';
import '../src/styles/tokens.css';
import '../src/styles/layout.css';
import '../src/styles/portfolio.css';
import './cool-stuff.css';

let root = null;

export function mount(container) {
  if (root) return;
  if (PANEL_TILT_ENABLED) document.documentElement.dataset.panelTilt = '';
  root = createRoot(container);
  root.render(createElement(StrictMode, null, createElement(App)));
}

export function unmount() {
  if (!root) return;
  root.unmount();
  root = null;
  delete document.documentElement.dataset.panelTilt;
  document.documentElement.classList.remove('mode-galaxy');
}
