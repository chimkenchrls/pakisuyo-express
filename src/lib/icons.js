// Phosphor Icons (MIT), duotone style. Only the icons listed here are bundled; add an import to use another.
import arrowLeft from '@phosphor-icons/core/assets/duotone/arrow-left-duotone.svg?raw';
import arrowRight from '@phosphor-icons/core/assets/duotone/arrow-right-duotone.svg?raw';
import beerStein from '@phosphor-icons/core/assets/duotone/beer-stein-duotone.svg?raw';
import bowlFood from '@phosphor-icons/core/assets/duotone/bowl-food-duotone.svg?raw';
import bowlSteam from '@phosphor-icons/core/assets/duotone/bowl-steam-duotone.svg?raw';
import bread from '@phosphor-icons/core/assets/duotone/bread-duotone.svg?raw';
import chatCircleDots from '@phosphor-icons/core/assets/duotone/chat-circle-dots-duotone.svg?raw';
import check from '@phosphor-icons/core/assets/duotone/check-duotone.svg?raw';
import checkCircle from '@phosphor-icons/core/assets/duotone/check-circle-duotone.svg?raw';
import clock from '@phosphor-icons/core/assets/duotone/clock-duotone.svg?raw';
import coffee from '@phosphor-icons/core/assets/duotone/coffee-duotone.svg?raw';
import confetti from '@phosphor-icons/core/assets/duotone/confetti-duotone.svg?raw';
import forkKnife from '@phosphor-icons/core/assets/duotone/fork-knife-duotone.svg?raw';
import hamburger from '@phosphor-icons/core/assets/duotone/hamburger-duotone.svg?raw';
import list from '@phosphor-icons/core/assets/duotone/list-duotone.svg?raw';
import magnifyingGlass from '@phosphor-icons/core/assets/duotone/magnifying-glass-duotone.svg?raw';
import mapPin from '@phosphor-icons/core/assets/duotone/map-pin-duotone.svg?raw';
import moped from '@phosphor-icons/core/assets/duotone/moped-duotone.svg?raw';
import pintGlass from '@phosphor-icons/core/assets/duotone/pint-glass-duotone.svg?raw';
import receipt from '@phosphor-icons/core/assets/duotone/receipt-duotone.svg?raw';
import shoppingBag from '@phosphor-icons/core/assets/duotone/shopping-bag-duotone.svg?raw';
import storefront from '@phosphor-icons/core/assets/duotone/storefront-duotone.svg?raw';
import wallet from '@phosphor-icons/core/assets/duotone/wallet-duotone.svg?raw';
import x from '@phosphor-icons/core/assets/duotone/x-duotone.svg?raw';

const ICONS = {
  'arrow-left': arrowLeft,
  'arrow-right': arrowRight,
  'beer-stein': beerStein,
  'bowl-food': bowlFood,
  'bowl-steam': bowlSteam,
  'bread': bread,
  'chat-circle-dots': chatCircleDots,
  'check': check,
  'check-circle': checkCircle,
  'clock': clock,
  'coffee': coffee,
  'confetti': confetti,
  'fork-knife': forkKnife,
  'hamburger': hamburger,
  'list': list,
  'magnifying-glass': magnifyingGlass,
  'map-pin': mapPin,
  'moped': moped,
  'pint-glass': pintGlass,
  'receipt': receipt,
  'shopping-bag': shoppingBag,
  'storefront': storefront,
  'wallet': wallet,
  'x': x,
};

// Inline SVG that inherits the surrounding text colour (the tint is the same colour at 20%).
export function icon(name, extraClass = '') {
  const svg = ICONS[name];
  if (!svg) throw new Error(`Unknown icon: ${name}`);
  const cls = extraClass ? `icon ${extraClass}` : 'icon';
  return svg.replace('<svg ', `<svg class="${cls}" width="1em" height="1em" aria-hidden="true" focusable="false" `);
}
