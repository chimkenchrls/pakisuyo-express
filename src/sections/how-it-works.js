import { icon } from '../lib/icons.js';

const STEPS = [
  ['storefront', 'Choose your store', 'Pick from our featured stores, or any store you like.'],
  ['receipt', 'Place your order', 'Fill in the order form. We copy it for you to send on Messenger.'],
  ['wallet', 'Pay your way', 'Cash on Delivery or GCash.'],
  ['moped', 'Track your rider', 'We keep you posted from Preparing to Out for Delivery.'],
];

export function renderHowItWorks(el) {
  el.className = 'section how';
  el.innerHTML = `
    <div class="container">
      <h2 class="section-title">How it works</h2>
      <p class="section-lead">Four steps from craving to doorstep.</p>
      <ol class="steps">
        ${STEPS.map(([name, title, text]) => `
          <li class="step">
            <span class="step__icon" aria-hidden="true">${icon(name)}</span>
            <h3 class="step__title">${title}</h3>
            <p class="step__text">${text}</p>
          </li>`).join('')}
      </ol>
    </div>`;
}
