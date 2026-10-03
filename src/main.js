import './styles/tokens.css';
import './styles/base.css';
import './styles/sections.css';
import './styles/demo.css';
import { renderHeader } from './sections/header.js';
import { renderHero } from './sections/hero.js';
import { renderRestaurants } from './sections/restaurants.js';
import { renderHowItWorks } from './sections/how-it-works.js';
import { renderOrderForm } from './sections/order-form.js';
import { renderCoverage } from './sections/coverage.js';
import { renderAppPromo } from './sections/app-promo.js';
import { renderFooter } from './sections/footer.js';
import { installImageFallback } from './lib/images.js';

const $ = (id) => document.getElementById(id);

installImageFallback(document);
renderHeader($('site-header'));
renderHero($('hero'));
renderRestaurants($('restaurants'));
renderHowItWorks($('how'));
renderOrderForm($('order'));
renderCoverage($('coverage'));
renderAppPromo($('app'));
renderFooter($('site-footer'));
