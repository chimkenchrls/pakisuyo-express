import { logoHorizontal } from '../brand/logo.js';
import { icon } from '../lib/icons.js';

const LINKS = [
  ['#restaurants', 'Restaurants'],
  ['#how', 'How it works'],
  ['#order', 'Order'],
  ['#app', 'App'],
];

export function renderHeader(el) {
  el.className = 'site-header';
  el.innerHTML = `
    <div class="container site-header__inner">
      <a href="#hero" class="site-header__brand" aria-label="Pakisuyo Express, back to top">${logoHorizontal({ size: 36 })}</a>
      <nav class="site-nav" id="site-nav" aria-label="Main">
        ${LINKS.map(([href, label]) => `<a href="${href}">${label}</a>`).join('')}
      </nav>
      <a class="btn btn--primary site-header__cta" href="#order">Order Now</a>
      <button class="site-header__toggle" type="button" aria-expanded="false" aria-controls="site-nav" aria-label="Menu">${icon('list')}</button>
    </div>`;

  const toggle = el.querySelector('.site-header__toggle');
  const nav = el.querySelector('#site-nav');
  const setOpen = (open) => {
    toggle.setAttribute('aria-expanded', String(open));
    nav.classList.toggle('is-open', open);
  };
  toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
  nav.addEventListener('click', (e) => {
    if (e.target.closest('a')) setOpen(false);
  });
}
