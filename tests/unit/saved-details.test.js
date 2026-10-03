import { describe, it, expect } from 'vitest';
import { loadDetails, saveDetails, clearDetails, STORAGE_KEY } from '../../src/lib/saved-details.js';

const memoryStorage = () => {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
    raw: map,
  };
};

const ORDER = {
  name: ' Juan ', phone: '0917 123 4567', address: '123 Rizal St', landmark: 'Blue gate',
  store: 'Jollibee Sariaya', orderList: '1 Chickenjoy', payment: 'cod', changeFor: '500', notes: 'call me',
  pin: { lat: 13.96, lng: 121.52 },
};

describe('saved details', () => {
  it('saves only the reusable contact fields and the pin, and loads them back', () => {
    const storage = memoryStorage();
    saveDetails(ORDER, storage);
    const stored = JSON.parse(storage.raw.get(STORAGE_KEY));
    expect(Object.keys(stored).sort()).toEqual(['address', 'landmark', 'name', 'phone', 'pin']);
    expect(loadDetails(storage)).toEqual({
      name: 'Juan', phone: '0917 123 4567', address: '123 Rizal St', landmark: 'Blue gate', pin: { lat: 13.96, lng: 121.52 },
    });
  });

  it('keeps pin null when none was set', () => {
    const storage = memoryStorage();
    saveDetails({ ...ORDER, pin: null }, storage);
    expect(loadDetails(storage).pin).toBeNull();
  });

  it('clears saved details', () => {
    const storage = memoryStorage();
    saveDetails(ORDER, storage);
    clearDetails(storage);
    expect(loadDetails(storage)).toBeNull();
  });

  it('returns null for nothing saved, broken JSON or wrong shapes', () => {
    const storage = memoryStorage();
    expect(loadDetails(storage)).toBeNull();
    storage.setItem(STORAGE_KEY, '{not json');
    expect(loadDetails(storage)).toBeNull();
    storage.setItem(STORAGE_KEY, JSON.stringify({ name: 5, phone: [], pin: { lat: 'x' } }));
    expect(loadDetails(storage)).toEqual({ name: '', phone: '', address: '', landmark: '', pin: null });
  });

  it('never throws when storage is blocked (private mode, in-app browsers)', () => {
    const blocked = {
      getItem: () => { throw new Error('SecurityError'); },
      setItem: () => { throw new Error('QuotaExceededError'); },
      removeItem: () => { throw new Error('SecurityError'); },
    };
    expect(loadDetails(blocked)).toBeNull();
    expect(() => saveDetails(ORDER, blocked)).not.toThrow();
    expect(() => clearDetails(blocked)).not.toThrow();
    expect(loadDetails(null)).toBeNull();
  });
});
