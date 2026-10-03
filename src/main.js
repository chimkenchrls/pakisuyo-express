import './styles/tokens.css';
import './styles/base.css';
import './styles/sections.css';
import './styles/demo.css';
import './styles/motion.css';
import { renderHeader, followHero } from './sections/header.js';
import { renderHero } from './sections/hero.js';
import { renderRestaurants } from './sections/restaurants.js';
import { renderHowItWorks } from './sections/how-it-works.js';
import { renderOrderForm } from './sections/order-form.js';
import { renderCoverage } from './sections/coverage.js';
import { renderAppPromo } from './sections/app-promo.js';
import { renderFooter } from './sections/footer.js';
import { mountStoreSheet } from './sections/store-sheet.js';
import { mountInfoModals } from './sections/info-modals.js';
import { installImageFallback } from './lib/images.js';
import { setupReveal } from './lib/reveal.js';

const $ = (id) => document.getElementById(id);

// Animations only when the visitor hasn't asked their phone/computer to reduce motion.
if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) document.documentElement.classList.add('motion');

installImageFallback(document);
renderHeader($('site-header'));
renderHero($('hero'));
followHero($('site-header'), $('hero'));
const storeSheet = mountStoreSheet({ returnFocus: () => document.querySelector('[data-action="browse-stores"]') });
renderRestaurants($('restaurants'), { onBrowse: (trigger) => storeSheet.openFromPage(trigger) });
renderHowItWorks($('how'));
renderOrderForm($('order'), { onBrowse: (trigger) => storeSheet.openFromPage(trigger) });
renderCoverage($('coverage'));
renderAppPromo($('app'));
renderFooter($('site-footer'));
mountInfoModals();
setupReveal();
