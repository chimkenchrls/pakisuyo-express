import { COVERAGE, SARIAYA_DELIVERY_FEE } from './stores.js';
import { MESSENGER_URL, FACEBOOK_URL } from './contact.js';

export const INFO_UPDATED = '3 October 2026';

const towns = COVERAGE.pickupTowns.filter((t) => t !== COVERAGE.deliveryArea);
const townList = `${towns.slice(0, -1).join(', ')} and ${towns.at(-1)}`;
const messenger = `<a href="${MESSENGER_URL}" target="_blank" rel="noopener">Messenger</a>`;

// Footer pages shown in a modal (see src/sections/info-modals.js). Plain, trusted HTML.
// Owner to confirm before launch: the Terms sections marked with data-confirm, and the Privacy
// statements about how the team handles Messenger messages (use, sharing with riders, deletion).
export const INFO_PAGES = {
  about: {
    title: 'About',
    html: `
      <p class="info-lead">In Filipino, <em>pakisuyo</em> is how you politely ask someone for a favour. That's what we do: you ask, and we go and get it for you.</p>
      <p>Pakisuyo Express has been delivering around Sariaya, Quezon since 2022. We pick up food and drinks from your favourite spots in ${COVERAGE.deliveryArea} and nearby towns like ${townList}, and bring them to your door anywhere in ${COVERAGE.deliveryArea}.</p>
      <h3>How to order</h3>
      <p>Use the order form on this page, or message us on ${messenger}. Our team confirms every order and keeps you posted until it arrives.</p>
      <h3>Hours</h3>
      <p>Open daily, 8AM to 7PM.</p>
      <h3>About this website</h3>
      <p>This website is a portfolio project, made with the permission of Pakisuyo Express. It is not an official ordering channel. To order, message Pakisuyo Express on ${messenger}.</p>
      <h3>Coming soon</h3>
      <p>We're working on the Pakisuyo app, so you can order in a few taps and follow your rider live.</p>
      <p class="info-links">${messenger} · <a href="${FACEBOOK_URL}" target="_blank" rel="noopener">Facebook</a></p>`,
  },

  privacy: {
    title: 'Privacy',
    html: `
      <p class="info-meta">Last updated ${INFO_UPDATED}</p>
      <p>This explains what happens to your information when you use this website. If anything is unclear, message us on ${messenger}.</p>
      <h3>Your order</h3>
      <p>This website does not store your orders or personal details. When you tap "Copy order &amp; open Messenger", your order is copied to your phone's clipboard and you send it to us yourself in Messenger. Messenger is run by Meta, and what you send there is also covered by Meta's privacy policy.</p>
      <h3>How we use what you send us</h3>
      <p>We use your name, number, address and order only to buy and deliver your order, to contact you about it, and to stop fake orders. We share them only as needed for your delivery, for example giving your address and number to your rider. We don't sell your details.</p>
      <h3>Remember my details</h3>
      <p>If "Remember my details on this phone" is ticked, your name, number, address, landmark and map pin are saved only in this phone's browser so the form fills itself next time. They never leave your phone. Untick it, or tap "Not you? Clear saved details", to remove them.</p>
      <h3>Map and location</h3>
      <p>"Use my current location" only works after your browser asks for your permission. When you drop a pin, its location is sent to OpenStreetMap to look up the street address, and the map images come from OpenStreetMap too. See the <a href="https://osmfoundation.org/wiki/Privacy_Policy" target="_blank" rel="noopener">OpenStreetMap privacy policy</a>.</p>
      <h3>Other services</h3>
      <p>Apart from OpenStreetMap, this website loads everything, including its fonts and the store list, from its own server.</p>
      <h3>No tracking</h3>
      <p>No analytics, ads or tracking cookies.</p>
      <h3>Your rights</h3>
      <p>Under the Data Privacy Act of 2012 (Republic Act No. 10173), you can ask what personal data we hold about you, and ask us to correct or delete it. Message us on ${messenger}.</p>
      <h3>Changes</h3>
      <p>We may update this page. The date at the top shows the latest version.</p>`,
  },

  terms: {
    title: 'Terms & Conditions',
    draft: true,
    html: `
      <p class="info-meta">Last updated ${INFO_UPDATED}</p>
      <p>By ordering from Pakisuyo Express, you agree to these terms.</p>
      <h3>1. Our service</h3>
      <p>We buy the items you ask for from the store you choose and deliver them to you. We are not the store: menus, prices and the food itself come from the store.</p>
      <h3>2. Placing an order</h3>
      <p>Your order is confirmed only when our team replies to you in Messenger. We may decline an order, for example outside our hours or delivery area, or when a store is closed or an item is unavailable. We'll tell you in Messenger.</p>
      <h3>3. Prices and fees</h3>
      <p>You pay the store's price for your items plus our delivery fee. Within ${COVERAGE.deliveryArea} the delivery fee is ₱${SARIAYA_DELIVERY_FEE}. For stores outside ${COVERAGE.deliveryArea}, our team confirms the fee before buying your order. If a store's price is different from what you expected, we'll check with you first.</p>
      <h3>4. Payment</h3>
      <p>You can pay by Cash on Delivery or GCash. For Cash on Delivery, please tell us what you'll pay with so the rider can bring change.</p>
      <p data-confirm>For some orders, for example first orders or large orders, we may ask you to pay by GCash before we buy your items.</p>
      <h3>5. Cancellations</h3>
      <p data-confirm>You can cancel for free until our rider has bought your items. After that, you'll be asked to pay for the items, and for the delivery fee if the rider is already on the way.</p>
      <h3>6. Wrong or missing items</h3>
      <p data-confirm>Please check your order when it arrives and message us right away if something is wrong or missing. We'll sort it out with you and the store, and if the mistake was ours, we'll make it right.</p>
      <h3>7. Delivery times</h3>
      <p>Delivery times are estimates. Store preparation, weather and traffic can cause delays, and we'll keep you posted.</p>
      <h3>8. Your part</h3>
      <p>Please give your correct name, mobile number, address and a landmark, keep your phone on, and make sure someone can receive the order.</p>
      <h3>9. Fake orders</h3>
      <p>Fake or prank orders cost our riders real money. Numbers used for them may be blocked.</p>
      <h3>10. Food and allergies</h3>
      <p>Taste, quality, portions and ingredients are the store's responsibility. If you have allergies, ask the store, and add a note to your order so we can pass it on.</p>
      <h3>11. Hours</h3>
      <p>We take orders daily from 8AM to 7PM.</p>
      <h3>12. Changes and questions</h3>
      <p>We may update these terms. The date at the top shows the latest version. For questions, message us on ${messenger}.</p>`,
  },
};
