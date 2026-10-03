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

// White while the yellow hero is behind the bar, the brand yellow once the hero has scrolled away.
export function followHero(header, hero) {
  const setOverHero = (over) => header.classList.toggle('is-over-hero', over);
  const headerHeight = () => Math.round(header.getBoundingClientRect().height);
  setOverHero(hero.getBoundingClientRect().bottom > headerHeight()); // right colour from the first paint
  if (!('IntersectionObserver' in window)) return;
  new IntersectionObserver(([entry]) => setOverHero(entry.isIntersecting), {
    rootMargin: `-${headerHeight()}px 0px 0px 0px`,
  }).observe(hero);
}
