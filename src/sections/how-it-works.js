const STEPS = [
  ['🏪', 'Choose your store', 'Pick from our featured stores, or any store you like.'],
  ['📝', 'Place your order', 'Fill in the order form. We copy it for you to send on Messenger.'],
  ['💳', 'Pay your way', 'Cash on Delivery, GCash, Maya or Card.'],
  ['🛵', 'Track your rider', 'We keep you posted from Preparing to Out for Delivery.'],
];

export function renderHowItWorks(el) {
  el.className = 'section how';
  el.innerHTML = `
    <div class="container">
      <h2 class="section-title">How it works</h2>
      <p class="section-lead">Four steps from craving to doorstep.</p>
      <ol class="steps">
        ${STEPS.map(([icon, title, text]) => `
          <li class="step">
            <span class="step__icon" aria-hidden="true">${icon}</span>
            <h3 class="step__title">${title}</h3>
            <p class="step__text">${text}</p>
          </li>`).join('')}
      </ol>
    </div>`;
}
