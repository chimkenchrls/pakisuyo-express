import { logoStacked } from '../brand/logo.js';
import { MESSENGER_URL, FACEBOOK_URL } from '../data/contact.js';

export function renderFooter(el) {
  el.className = 'site-footer';
  el.innerHTML = `
    <div class="container site-footer__inner">
      ${logoStacked({ tone: 'dark', size: 56 })}
      <div>
        <p>Always ready for your Pakisuyo! · Est. 2022</p>
        <p>#PakisuyoExpressSince2022</p>
        <p>Open daily 8AM–7PM · Sariaya, Quezon</p>
      </div>
      <p>
        <a href="${MESSENGER_URL}" target="_blank" rel="noopener">Messenger</a> ·
        <a href="${FACEBOOK_URL}" target="_blank" rel="noopener">Facebook</a>
      </p>
      <details class="privacy">
        <summary>Privacy</summary>
        <p>Orders made here are copied to your clipboard and sent by you through Messenger — this website doesn't store them.</p>
        <p>If you tick “Remember my details”, your name, number, address, landmark and map pin are saved only in this phone's browser. Remove them anytime with “Not you? Clear saved details”.</p>
        <p>When you drop a pin, its location is sent to OpenStreetMap to look up the street address. Map and store list © OpenStreetMap contributors.</p>
      </details>
    </div>`;
}
