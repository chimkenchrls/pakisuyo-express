import { mountDemo } from '../demo/demo.js';
import { icon } from '../lib/icons.js';

const BENEFITS = [
  ['shopping-bag', 'Order in a few taps, no more typing forms'],
  ['moped', 'Live rider tracking, from Preparing to Delivered'],
  ['wallet', 'Pay with GCash or Cash on Delivery'],
  ['confetti', 'Exclusive app-only promos'],
];

export function renderAppPromo(el) {
  el.className = 'section app-promo';
  el.innerHTML = `
    <div class="container app-promo__inner">
      <div>
        <span class="eyebrow">Coming soon</span>
        <h2 class="section-title">The Pakisuyo app</h2>
        <p class="section-lead">Everything you do in Messenger today, in a few taps. Try it: tap the phone.</p>
        <ul class="benefits">${BENEFITS.map(([name, text]) => `<li>${icon(name, 'icon--brand')}${text}</li>`).join('')}</ul>
      </div>
      <div id="demo-root"></div>
    </div>`;
  mountDemo(el.querySelector('#demo-root'));
}
