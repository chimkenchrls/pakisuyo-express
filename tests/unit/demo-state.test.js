import { describe, it, expect } from 'vitest';
import { initialState, reducer, visibleStores, isTrackingDone, TRACKING_STEPS } from '../../src/demo/state.js';

const run = (actions, state = initialState()) => actions.reduce(reducer, state);
const toCheckout = [
  { type: 'SKIP_SPLASH' },
  { type: 'OPEN_STORE', storeId: 'jollibee-sariaya' },
  { type: 'ADD_ITEM', itemId: 'chickenjoy-rice' },
  { type: 'ADD_ITEM', itemId: 'coke-float' },
  { type: 'GO_CHECKOUT' },
];

describe('demo reducer: happy path', () => {
  it('walks splash → home → store → checkout → tracking → delivered', () => {
    let s = run(toCheckout);
    expect(s.screen).toBe('checkout');
    s = run([{ type: 'OPEN_SHEET' }, { type: 'SET_PAYMENT', payment: 'cod' }, { type: 'APPLY_PROMO' }], s);
    expect(s).toMatchObject({ payment: 'cod', sheetOpen: false, promoApplied: true });
    s = reducer(s, { type: 'PLACE_ORDER', orderNo: 'PX-1234' });
    expect(s).toMatchObject({ screen: 'tracking', trackingStep: 0, orderNo: 'PX-1234' });
    for (let i = 0; i < 10; i++) s = reducer(s, { type: 'ADVANCE_TRACKING' });
    expect(s.trackingStep).toBe(TRACKING_STEPS.length - 1); // capped at Delivered
    expect(isTrackingDone(s)).toBe(true);
  });
});

describe('demo reducer: button mashing (Review Focus 5)', () => {
  it('a second PLACE_ORDER is a no-op (same object)', () => {
    const placed = reducer(run(toCheckout), { type: 'PLACE_ORDER', orderNo: 'PX-1' });
    expect(reducer(placed, { type: 'PLACE_ORDER', orderNo: 'PX-2' })).toBe(placed);
  });

  it('cannot check out an empty cart', () => {
    const s = run([{ type: 'SKIP_SPLASH' }, { type: 'OPEN_STORE', storeId: 'jollibee-sariaya' }]);
    expect(reducer(s, { type: 'GO_CHECKOUT' })).toBe(s);
  });

  it('BACK from checkout keeps the cart and closes the sheet', () => {
    const s = run([...toCheckout, { type: 'OPEN_SHEET' }, { type: 'BACK' }]);
    expect(s).toMatchObject({ screen: 'store', sheetOpen: false });
    expect(s.cart.lines).toHaveLength(2);
  });

  it('opening a different store clears the cart and promo', () => {
    let s = run([...toCheckout, { type: 'APPLY_PROMO' }, { type: 'BACK' }, { type: 'BACK' }]);
    s = reducer(s, { type: 'OPEN_STORE', storeId: 'labarrida-sariaya' });
    expect(s.cart.lines).toEqual([]);
    expect(s.promoApplied).toBe(false);
  });

  it('reopening the same store keeps the cart', () => {
    const s = run([...toCheckout, { type: 'BACK' }, { type: 'BACK' }, { type: 'OPEN_STORE', storeId: 'jollibee-sariaya' }]);
    expect(s.cart.lines).toHaveLength(2);
  });

  it('RESTART mid-tracking resets everything and skips the splash', () => {
    const s = run([...toCheckout, { type: 'PLACE_ORDER', orderNo: 'PX-1' }, { type: 'ADVANCE_TRACKING' }, { type: 'RESTART' }]);
    expect(s).toEqual({ ...initialState(), screen: 'home' });
  });

  it('ignores unknown stores, items and payments', () => {
    const s = run(toCheckout);
    expect(reducer(s, { type: 'OPEN_STORE', storeId: 'nope' })).toBe(s);
    expect(reducer(s, { type: 'SET_PAYMENT', payment: 'bitcoin' })).toBe(s);
    expect(reducer(s, { type: 'SET_PAYMENT', payment: 'maya' })).toBe(s);
    const store = run(toCheckout.slice(0, 2));
    expect(reducer(store, { type: 'ADD_ITEM', itemId: 'nope' })).toBe(store);
  });

  it('ADVANCE_TRACKING outside tracking is a no-op', () => {
    const s = run(toCheckout);
    expect(reducer(s, { type: 'ADVANCE_TRACKING' })).toBe(s);
  });
});

describe('visibleStores', () => {
  it('filters by category and by search over names and menu items', () => {
    const base = { ...initialState(), screen: 'home' };
    expect(visibleStores({ ...base, category: 'cafe' }).map((s) => s.id)).toEqual(['kope-right', 'dash-espresso-sariaya']);
    expect(visibleStores({ ...base, query: 'spaghetti' }).map((s) => s.id)).toEqual(['jollibee-sariaya']);
    expect(visibleStores({ ...base, query: '  kope-right ' }).map((s) => s.id)).toEqual(['kope-right']);
    expect(visibleStores({ ...base }).map((s) => s.id)[0]).toBe('jollibee-sariaya'); // demo keeps Jollibee first
    expect(visibleStores({ ...base, query: 'zzz' })).toEqual([]);
  });
});
