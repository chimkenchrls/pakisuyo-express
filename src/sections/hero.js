import { logoStacked } from '../brand/logo.js';
import { getHoursStatus } from '../lib/hours.js';
import { MESSENGER_URL } from '../data/contact.js';

export function renderHero(el, { now = new Date() } = {}) {
  const hours = getHoursStatus(now);
  el.className = 'hero';
  el.innerHTML = `
    <div class="container hero__inner">
      <div class="hero__copy">
        <span class="pill ${hours.isOpen ? 'pill--open' : 'pill--closed'}" data-testid="hours-badge">● ${hours.label}</span>
        <h1 class="hero__title">Always ready for your <span class="hero__accent">Pakisuyo!</span></h1>
        <p class="hero__sub">Food and drinks from your favourite spots, delivered anywhere in Sariaya.</p>
        <div class="hero__ctas">
          <a class="btn btn--primary" href="#order">Order Now</a>
          <a class="btn btn--light" href="${MESSENGER_URL}" target="_blank" rel="noopener">Message us</a>
        </div>
      </div>
      <div class="hero__visual" aria-hidden="true">
        <div class="hero__card">${logoStacked({ size: 96 })}</div>
        <span class="bubble bubble--1">🍗 Chickenjoy</span>
        <span class="bubble bubble--2">🧋 Milk tea</span>
        <span class="bubble bubble--3">🍰 Ube cake</span>
      </div>
    </div>`;
}
