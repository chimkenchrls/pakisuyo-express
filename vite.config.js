import { defineConfig, loadEnv } from 'vite';
import { readFileSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { BRAND_PROTECTED } from './src/lib/brand-assets.js';

// Public (launch) builds drop the pitch-only bits: the noindex tag and third-party brand image files.
// `--mode pitch` (npm run build:pitch / dev:pitch) keeps them; see .env.pitch.
function launchBuild({ pitch }) {
  let outDir;
  return {
    name: 'pakisuyo-launch-build',
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir);
    },
    transformIndexHtml(html) {
      return pitch ? html : html.replace(/\s*<meta name="robots" content="noindex">/, '');
    },
    async closeBundle() {
      if (pitch || !outDir) return;
      const manifest = JSON.parse(readFileSync(new URL('./src/data/images.json', import.meta.url), 'utf8'));
      const files = Object.entries({ ...manifest.stores, ...manifest.items }).filter(([id]) => BRAND_PROTECTED.has(id));
      await Promise.all(files.map(([, path]) => rm(resolve(outDir, `.${path}`), { force: true })));
    },
  };
}

export default defineConfig(({ mode }) => ({
  plugins: [launchBuild({ pitch: loadEnv(mode, process.cwd()).VITE_PITCH === 'true' })],
  test: {
    include: ['tests/unit/**/*.test.js'],
  },
}));
