// Usage: node scripts/smoke.mjs <url> [--retries 6] [--delay 10000]
import { runSmokeChecks } from './smoke-checks.mjs';

const [url, ...rest] = process.argv.slice(2);
if (!url) { console.error('usage: node scripts/smoke.mjs <url> [--retries N] [--delay ms]'); process.exit(2); }
const opt = (name, fallback) => { const i = rest.indexOf(`--${name}`); return i >= 0 ? Number(rest[i + 1]) : fallback; };
const retries = opt('retries', 6);
const delay = opt('delay', 10000);

for (let attempt = 1; attempt <= retries; attempt += 1) {
  let result;
  try { result = await runSmokeChecks(url); } catch (err) { result = { ok: false, failures: [`request failed: ${err.message}`] }; }
  if (result.ok) { console.log(`smoke ok: ${url}`); process.exit(0); }
  console.warn(`smoke attempt ${attempt}/${retries} failed: ${result.failures.join('; ')}`);
  if (attempt < retries) await new Promise((r) => setTimeout(r, delay));
}
process.exit(1);
