import { describe, it, expect, vi, beforeEach } from 'vitest';

let loadDirectory;
beforeEach(async () => {
  vi.resetModules();
  ({ loadDirectory } = await import('../../src/lib/directory-data.js'));
});

const ok = (stores) => vi.fn(async () => ({ ok: true, json: async () => ({ meta: {}, stores }) }));

describe('loadDirectory', () => {
  it('fetches the directory once and merges featured + extras', async () => {
    const fetchFn = ok([{ id: 'osm-n1', name: 'Libra Bakery', category: 'bakery', town: 'Lucena' }]);
    const list = await loadDirectory({ fetchFn });
    await loadDirectory({ fetchFn });
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(fetchFn).toHaveBeenCalledWith('/data/directory.json');
    expect(list[0]).toMatchObject({ id: 'jollibee-sariaya', featured: true });
    expect(list.map((s) => s.id)).toContain('osm-n1');
  });

  it('rejects on failure and retries on the next call (Review Focus 3)', async () => {
    const failing = vi.fn(async () => ({ ok: false, status: 503 }));
    await expect(loadDirectory({ fetchFn: failing })).rejects.toThrow('503');
    const list = await loadDirectory({ fetchFn: ok([]) });
    expect(list).toHaveLength(5); // featured only (extras duplicate featured)
  });
});
