import { logoStacked } from "../brand/logo.js";
import { MESSENGER_URL, FACEBOOK_URL } from "../data/contact.js";

export function renderFooter(el) {
  el.className = "site-footer";
  el.innerHTML = `
    <div class="container site-footer__inner">
      ${logoStacked({ tone: "dark", size: 56 })}
      <div>
        <p>Always ready for your Pakisuyo! · Est. 2022</p>
        <p>Open daily 8AM–7PM · Sariaya, Quezon</p>
        <p>Portfolio demo, made with permission. Not an official channel of Pakisuyo Express.</p>
      </div>
      <p>
        <a href="${MESSENGER_URL}" target="_blank" rel="noopener">Messenger</a> ·
        <a href="${FACEBOOK_URL}" target="_blank" rel="noopener">Facebook</a>
      </p>
      <nav class="site-footer__legal" aria-label="About and policies">
        <a href="#about">About</a> · <a href="#privacy">Privacy</a> · <a href="#terms">Terms &amp; Conditions</a>
        <span class="site-footer__credit">Map and store list © OpenStreetMap contributors</span>
      </nav>
    </div>`;
}
