import { describe, it, expect } from 'vitest';
import { latestOnly } from '../../src/lib/async.js';

const deferred = () => {
  let resolve;
  const promise = new Promise((r) => { resolve = r; });
  return { promise, resolve };
};

describe('latestOnly', () => {
  it('marks results of superseded calls as stale even if they resolve last', async () => {
    const first = deferred();
    const second = deferred();
    const calls = [first, second];
    const lookup = latestOnly(() => calls.shift().promise);

    const a = lookup('old');
    const b = lookup('new');
    second.resolve('new address');
    first.resolve('old address');

    expect(await b).toEqual({ stale: false, value: 'new address' });
    expect(await a).toEqual({ stale: true });
  });

  it('returns the value for a single call', async () => {
    const lookup = latestOnly(async (x) => x * 2);
    expect(await lookup(21)).toEqual({ stale: false, value: 42 });
  });
});
