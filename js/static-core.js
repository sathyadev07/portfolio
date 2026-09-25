// Static core: the only script in the initial payload.
// 1. Copies the phone number to the clipboard (falls back to tel: when unavailable).
// 2. Loads the Cool Stuff Mode bundle on demand, never before the click.
// 3. Small detail-sheet conveniences: Escape to go back, focus the opened sheet.

const html = document.documentElement;

/* ---------- Phone copy ---------- */
const phoneBtn = document.getElementById('copy-phone-btn');
const phoneTip = document.getElementById('copy-phone-status');
let tipTimer = 0;

function showTip(text) {
  phoneTip.textContent = text;
  clearTimeout(tipTimer);
  tipTimer = setTimeout(() => { phoneTip.textContent = ''; }, 1800);
}

phoneBtn?.addEventListener('click', (event) => {
  if (!navigator.clipboard?.writeText) return; // let tel: handle it
  event.preventDefault();
  const phone = phoneBtn.getAttribute('data-phone');
  navigator.clipboard.writeText(phone).then(
    () => showTip(`Copied ${phone}`),
    () => showTip(phone),
  );
});

/* ---------- Detail sheets ---------- */
const isDetail = (hash) => hash.startsWith('#detail-');

function backTarget() {
  const sheet = document.querySelector('.project-detail-view:target');
  return sheet?.querySelector('.back-btn')?.getAttribute('href') ?? '#projects';
}

function focusTarget() {
  const { hash } = location;
  if (!isDetail(hash)) return;
  const sheet = document.getElementById(hash.slice(1));
  sheet?.focus({ preventScroll: true });
}

window.addEventListener('hashchange', focusTarget);
focusTarget();

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && isDetail(location.hash) && !html.classList.contains('cool-mode')) {
    location.hash = backTarget();
  }
});

/* ---------- Cool Stuff Mode ---------- */
const coolBtn = document.getElementById('cool-stuff-toggle');
const coolLabel = coolBtn?.querySelector('.toggle-label');
const container = document.getElementById('webgl-portal-container');
const mainContent = document.getElementById('main-content');
let bundle = null;
let active = false;
let loading = false;
let savedScroll = 0;

const status = document.createElement('p');
status.className = 'cool-status';
status.setAttribute('role', 'status');
status.setAttribute('aria-live', 'polite');
document.body.append(status);

function setLabel(text) { if (coolLabel) coolLabel.textContent = text; }

/* The Cool Mode button lives in the static header; in Cool Mode it is moved
   into the stylized site's header row (after phone / email / LinkedIn) so the
   row's own flex layout spaces it, and moved back before that site unmounts. */
const homeSlot = coolBtn?.parentElement;
let dockObserver = null;

function dockInStylizedHeader() {
  const place = () => {
    const row = container.querySelector('.portfolio-topbar .header-actions');
    if (!row) return false;
    row.append(coolBtn);
    return true;
  };
  if (place()) return;
  dockObserver = new MutationObserver(() => {
    if (place()) { dockObserver.disconnect(); dockObserver = null; }
  });
  dockObserver.observe(container, { childList: true, subtree: true });
}

function returnHome() {
  dockObserver?.disconnect();
  dockObserver = null;
  if (homeSlot && coolBtn.parentElement !== homeSlot) homeSlot.append(coolBtn);
}

function exitCool({ restoreScroll = true } = {}) {
  if (!active) return;
  active = false;
  returnHome();
  bundle?.unmount();
  container.classList.add('hidden');
  container.setAttribute('aria-hidden', 'true');
  html.classList.remove('cool-mode');
  document.body.classList.add('static-mode');
  mainContent.inert = false;
  coolBtn.setAttribute('aria-pressed', 'false');
  setLabel('Cool Mode');
  // Leaving the deep-linked mode returns to the plain (canonical) URL.
  if (new URLSearchParams(location.search).has('mode')) {
    history.replaceState(null, '', location.pathname + location.hash);
  }
  if (restoreScroll) window.scrollTo(0, savedScroll);
}

function openDetail(id) {
  exitCool({ restoreScroll: false });
  const target = document.getElementById(`detail-${id}`);
  location.hash = target ? `#detail-${id}` : '#projects';
}

async function enterCool() {
  if (loading) return;
  if (isDetail(location.hash)) history.replaceState(null, '', location.pathname + location.search);
  savedScroll = window.scrollY;
  if (!bundle) {
    loading = true;
    coolBtn.setAttribute('aria-busy', 'true');
    setLabel('Loading…');
    status.textContent = 'Loading Cool Stuff Mode…';
    try {
      bundle = await import('./cool-stuff-bundle.js');
    } catch (error) {
      console.error(error);
      status.textContent = 'Cool Stuff Mode could not load. The portfolio is unaffected; try again.';
      setTimeout(() => { status.textContent = ''; }, 4000);
      setLabel('Cool Mode');
      return;
    } finally {
      loading = false;
      coolBtn.removeAttribute('aria-busy');
    }
    status.textContent = '';
  }
  active = true;
  // Reflect the mode in the address bar so a copied / shared URL reopens in
  // Cool Mode (?mode=cool). Exiting strips it back to the canonical URL.
  const params = new URLSearchParams(location.search);
  if (params.get('mode') !== 'cool') {
    params.set('mode', 'cool');
    history.replaceState(null, '', `${location.pathname}?${params}${location.hash}`);
  }
  html.classList.add('cool-mode');
  // The stylized site brings its own typography and element styles; drop the
  // static page's body-scoped rules so they don't bleed into it.
  document.body.classList.remove('static-mode');
  mainContent.inert = true;
  window.scrollTo(0, 0);
  container.classList.remove('hidden');
  container.setAttribute('aria-hidden', 'false');
  coolBtn.setAttribute('aria-pressed', 'true');
  setLabel('Cool Mode');
  bundle.mount(container, { onExit: () => exitCool(), onOpenDetail: openDetail });
  dockInStylizedHeader();
}

coolBtn?.addEventListener('click', () => {
  if (active) exitCool();
  else enterCool();
});

// Deep link: https://sathyadev07.github.io/portfolio/?mode=cool opens straight
// into the black hole. The plain URL stays the static, ATS-first page.
if (new URLSearchParams(location.search).get('mode') === 'cool') enterCool();
