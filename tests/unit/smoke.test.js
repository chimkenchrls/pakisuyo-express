import { describe, it, expect } from 'vitest';
import { runSmokeChecks } from '../../scripts/smoke-checks.mjs';

const res = (status, type, body = '') => ({
  ok: status >= 200 && status < 300, status,
  headers: { get: (h) => (h.toLowerCase() === 'content-type' ? type : null) },
  text: async () => body, json: async () => JSON.parse(body),
});
const GOOD = '<html><head><title>Pakisuyo Express Sariaya | Food delivery</title></head><body><script type="module" crossorigin src="/assets/index-abc.js"></script></body></html>';

const site = ({ html = GOOD, status = 200, js = 200, stores = 150, jsonStatus = 200, brand = res(404, 'text/html') } = {}) => async (url) => {
  if (url.endsWith('/assets/index-abc.js')) return res(js, 'text/javascript');
  if (url.endsWith('/data/directory.json')) return res(jsonStatus, 'application/json', JSON.stringify({ stores: Array(stores).fill({}) }));
  if (url.endsWith('/assets/stores/jollibee-sariaya/logo.png')) return brand;
  return res(status, 'text/html', html);
};
const check = (opts) => runSmokeChecks('https://x.test', { fetchFn: site(opts) });

describe('runSmokeChecks', () => {
  it('passes a healthy public site', async () => {
    expect(await check()).toEqual({ ok: true, failures: [] });
  });

  it('fails when the page is down', async () => {
    const r = await check({ status: 503 });
    expect(r.ok).toBe(false);
    expect(r.failures[0]).toMatch(/home page returned 503/);
  });

  it('fails when the page is not our site', async () => {
    expect((await check({ html: '<html><title>Page not found</title></html>' })).failures).toContain('page title is not Pakisuyo Express');
  });

  it("fails when the app's JavaScript does not load", async () => {
    expect((await check({ js: 404 })).failures).toContain('app script /assets/index-abc.js returned 404');
    expect((await check({ html: GOOD.replace(/<script[^>]*><\/script>/, '') })).failures).toContain('no app script found in the page');
  });

  it('fails if the pitch build (noindex) was deployed', async () => {
    const html = GOOD.replace('<title>', '<meta name="robots" content="noindex"><title>');
    expect((await check({ html })).failures).toContain('page has noindex (pitch build deployed?)');
  });

  it('fails if the store list is missing or too small', async () => {
    expect((await check({ jsonStatus: 404 })).failures[0]).toMatch(/directory\.json returned 404/);
    expect((await check({ stores: 3 })).failures[0]).toMatch(/only 3 stores/);
  });

  it('fails only if the brand logo is really served as an image', async () => {
    expect((await check({ brand: res(200, 'image/png') })).failures).toContain('brand image is publicly served');
    // dev servers answer unknown paths with the home page (200, text/html): not a real file
    expect((await check({ brand: res(200, 'text/html') })).ok).toBe(true);
  });
});
