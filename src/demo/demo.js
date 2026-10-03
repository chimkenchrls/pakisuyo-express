import { initialState, reducer, isTrackingDone } from './state.js';
import { renderScreen, CAPTIONS } from './screens.js';

const ID_KEYS = ['storeId', 'itemId', 'category', 'payment'];

// Identifies a control across re-renders so keyboard focus survives.
const focusKeyOf = (el) => el?.dataset?.focusKey
  ?? (el?.dataset?.action ? [el.dataset.action, ...ID_KEYS.map((k) => el.dataset[k] ?? '')].join('|') : null);

const stepMsFromUrl = () => Number(new URLSearchParams(window.location.search).get('demoStepMs')) || 3000;

export function mountDemo(root, { stepMs = stepMsFromUrl(), splashMs = 1000 } = {}) {
  let state = initialState();
  let trackingTimer = null;

  root.innerHTML = `
    <div class="demo">
      <div class="phone" role="region" aria-label="Pakisuyo app demo">
        <div class="phone__screen" data-testid="demo-screen" tabindex="-1"></div>
      </div>
      <p class="demo__caption" aria-live="polite"></p>
    </div>`;
  const screenEl = root.querySelector('.phone__screen');
  const captionEl = root.querySelector('.demo__caption');

  function syncTimer() {
    const shouldRun = state.screen === 'tracking' && !isTrackingDone(state);
    if (shouldRun && !trackingTimer) trackingTimer = setInterval(() => dispatch({ type: 'ADVANCE_TRACKING' }), stepMs);
    if (!shouldRun && trackingTimer) {
      clearInterval(trackingTimer);
      trackingTimer = null;
    }
  }

  function render(previousScreen) {
    const active = document.activeElement;
    const hadFocus = screenEl.contains(active);
    const key = hadFocus ? focusKeyOf(active) : null;
    const selection = key === 'search' ? [active.selectionStart, active.selectionEnd] : null;

    screenEl.innerHTML = renderScreen(state);
    captionEl.textContent = CAPTIONS[state.screen];

    if (!hadFocus) return;
    const target = [...screenEl.querySelectorAll('[data-action], [data-focus-key]')].find((el) => focusKeyOf(el) === key);
    if (target && state.screen === previousScreen) {
      target.focus();
      if (selection) target.setSelectionRange(...selection);
    } else {
      screenEl.focus();
    }
  }

  function dispatch(action) {
    const previousScreen = state.screen;
    const next = reducer(state, action);
    if (next === state) return;
    state = next;
    syncTimer();
    render(previousScreen);
  }

  screenEl.addEventListener('click', (e) => {
    const button = e.target.closest('[data-action]');
    if (!button) return;
    const { action, storeId, itemId, category, payment } = button.dataset;
    const orderNo = action === 'PLACE_ORDER' ? `PX-${1000 + Math.floor(Math.random() * 9000)}` : undefined;
    dispatch({ type: action, storeId, itemId, category, payment, orderNo });
  });

  screenEl.addEventListener('input', (e) => {
    if (e.target.dataset.focusKey === 'search') dispatch({ type: 'SEARCH', query: e.target.value });
  });

  // Show the splash only once the owner scrolls to the demo, then move on.
  new IntersectionObserver((entries, observer) => {
    if (entries.some((entry) => entry.isIntersecting)) {
      observer.disconnect();
      setTimeout(() => dispatch({ type: 'SKIP_SPLASH' }), splashMs);
    }
  }, { threshold: 0.4 }).observe(root);

  render(state.screen);
  return { getState: () => state, dispatch };
}
