import { mountDemo } from '../demo/demo.js';

const BENEFITS = [
  '🛒 Order in a few taps — no more typing forms',
  '🛵 Live rider tracking, from Preparing to Delivered',
  '💳 Pay with GCash, Maya, Card or Cash on Delivery',
  '🎉 Exclusive app-only promos',
];

export function renderAppPromo(el) {
  el.className = 'section app-promo';
  el.innerHTML = `
    <div class="container app-promo__inner">
      <div>
        <span class="eyebrow">Coming soon</span>
        <h2 class="section-title">The Pakisuyo app</h2>
        <p class="section-lead">Everything you do in Messenger today, in a few taps. Try it — tap the phone.</p>
        <ul class="benefits">${BENEFITS.map((b) => `<li>${b}</li>`).join('')}</ul>
      </div>
      <div id="demo-root"></div>
    </div>`;
  mountDemo(el.querySelector('#demo-root'));
}
