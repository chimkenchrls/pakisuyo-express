import { STORES, getStore } from '../data/stores.js';
import { PAYMENT_METHODS } from '../data/payments.js';
import { emptyCart, addItem, removeItem, itemCount } from '../lib/cart.js';

export const TRACKING_STEPS = ['Order Placed', 'Preparing', 'Rider Assigned', 'Out for Delivery', 'Delivered'];
export const DEMO_STORE_ID = 'jollibee-sariaya';

export const initialState = () => ({
  screen: 'splash',
  query: '',
  category: 'all',
  storeId: null,
  cart: emptyCart(),
  payment: 'gcash',
  sheetOpen: false,
  promoApplied: false,
  trackingStep: 0,
  orderNo: null,
});

const BACK_TO = { store: 'home', checkout: 'store' };

// Returns the same state object when an action doesn't apply, so callers can skip re-rendering.
export function reducer(state, action) {
  switch (action.type) {
    case 'SKIP_SPLASH':
      return state.screen === 'splash' ? { ...state, screen: 'home' } : state;
    case 'SEARCH':
      return { ...state, query: action.query };
    case 'SET_CATEGORY':
      return { ...state, category: action.category };
    case 'OPEN_STORE': {
      if (!getStore(action.storeId)) return state;
      const same = action.storeId === state.storeId;
      return {
        ...state,
        screen: 'store',
        storeId: action.storeId,
        cart: same ? state.cart : emptyCart(),
        promoApplied: same ? state.promoApplied : false,
      };
    }
    case 'ADD_ITEM': {
      const item = getStore(state.storeId)?.menu.find((i) => i.id === action.itemId);
      return item ? { ...state, cart: addItem(state.cart, item) } : state;
    }
    case 'REMOVE_ITEM':
      return { ...state, cart: removeItem(state.cart, action.itemId) };
    case 'GO_CHECKOUT':
      return state.screen === 'store' && itemCount(state.cart) > 0 ? { ...state, screen: 'checkout' } : state;
    case 'BACK':
      return BACK_TO[state.screen] ? { ...state, screen: BACK_TO[state.screen], sheetOpen: false } : state;
    case 'OPEN_SHEET':
      return state.screen === 'checkout' ? { ...state, sheetOpen: true } : state;
    case 'CLOSE_SHEET':
      return state.sheetOpen ? { ...state, sheetOpen: false } : state;
    case 'SET_PAYMENT':
      return PAYMENT_METHODS.some((m) => m.id === action.payment)
        ? { ...state, payment: action.payment, sheetOpen: false }
        : state;
    case 'APPLY_PROMO':
      return state.screen === 'checkout' && !state.promoApplied ? { ...state, promoApplied: true } : state;
    case 'PLACE_ORDER':
      return state.screen === 'checkout' && itemCount(state.cart) > 0
        ? { ...state, screen: 'tracking', trackingStep: 0, orderNo: action.orderNo, sheetOpen: false }
        : state;
    case 'ADVANCE_TRACKING':
      return state.screen === 'tracking' && state.trackingStep < TRACKING_STEPS.length - 1
        ? { ...state, trackingStep: state.trackingStep + 1 }
        : state;
    case 'RESTART':
      return { ...initialState(), screen: 'home' };
    default:
      return state;
  }
}

export function visibleStores(state, stores = STORES) {
  const q = state.query.trim().toLowerCase();
  return stores.filter((s) => (state.category === 'all' || s.category === state.category)
    && (!q
      || s.name.toLowerCase().includes(q)
      || s.categoryLabel.toLowerCase().includes(q)
      || s.menu.some((i) => i.name.toLowerCase().includes(q))));
}

export const isTrackingDone = (state) => state.screen === 'tracking' && state.trackingStep === TRACKING_STEPS.length - 1;
