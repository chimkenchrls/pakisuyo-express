import { COVERAGE, HOME_TOWN, SARIAYA_DELIVERY_FEE } from '../data/stores.js';
import { normaliseName } from './directory.js';
import { peso } from './cart.js';

const OTHER_TOWNS = COVERAGE.pickupTowns.filter((t) => t !== HOME_TOWN).map(normaliseName);
const HOME_FEE = `Delivery fee: ${peso(SARIAYA_DELIVERY_FEE)} within ${HOME_TOWN}`;

// Picked stores carry their town ("Jollibee (Lucena)"); typed names count as Sariaya unless they name another town.
export function deliveryFeeHint(store) {
  const words = ` ${normaliseName(store)} `;
  if (!words.trim()) return `${HOME_FEE} · out-of-town stores: fee confirmed by our team`;
  return OTHER_TOWNS.some((town) => words.includes(` ${town} `)) ? 'Out-of-town fee: confirmed by our team' : HOME_FEE;
}
