# CI/CD Pipeline: Design Spec

**Date:** 2026-10-03
**Status:** Awaiting review
**Context:** The Pakisuyo Express site is now a portfolio piece for a DevOps role. The owner declined using it for now but allowed it in the portfolio. This spec automates testing and deploys of the **public** build.

## 1. Goals

- Every change is tested automatically: unit tests, end-to-end tests, both builds, and Lighthouse budgets.
- Every pull request gets its own live preview link.
- Merging to `main` deploys the public site to **https://pakisuyoexpress.netlify.app**, then smoke-tests it.
- The repo is **public** and shows a professional workflow: protected `main`, green checks, badges.

**Out of scope:** Docker, Terraform, monitoring/uptime, Dependabot/CodeQL, the scheduled store-list refresh (later candidates).

## 2. Decisions

| Topic | Decision |
|---|---|
| What production serves | The **public** build (`npm run build`): no third-party brand logos/photos, indexable. The pitch build is no longer online; it stays buildable locally (`npm run dev:pitch` / `build:pitch`). |
| Repo visibility | **Public**, existing history kept as-is (older commits still contain the pitch-only brand images; accepted). |
| Brand-protected files | Untracked from now on. `public/assets/stores/jollibee-sariaya/` is git-ignored and removed from the index (kept on disk locally), so new commits contain no third-party brand files. `images.json` still lists them; the public build filters them out (`src/lib/brand-assets.js`), and a pitch build without the files shows the existing initials/icon fallbacks. |
| CI host | GitHub Actions (`ubuntu-latest`). |
| Deploy mechanism | GitHub Actions builds, then uploads with `netlify-cli deploy --no-build` (Netlify does not build). |
| Secrets | `NETLIFY_AUTH_TOKEN` as a repository **secret** (personal access token, created by the user in Netlify). `NETLIFY_SITE_ID` (`6f251678-3b03-47f2-96f9-e5eeebf33bc4`) as a repository **variable** (not secret). |
| Node | Pinned via `.nvmrc` (`22`); workflows use `actions/setup-node` with `node-version-file` and npm cache. |
| Branch protection | `main` requires a pull request and the CI status checks to pass before merging. Admins are not exempt, but no review approval is required (single developer). |

## 3. Workflows

### 3.1 `ci.yml`: on `pull_request` and `push` to `main`

Permissions: `contents: read`. Concurrency: one run per ref, newer cancels older.

1. **`checks`:** `npm ci` → `npm test` → `npm run build` → `npm run build:pitch`.
2. **`e2e`:** `npm ci` → `npx playwright install --with-deps chromium` → `npx playwright test` (the config's `webServer` builds and previews). On failure, upload `playwright-report/` and `test-results/` as an artifact (7-day retention).
3. **`lighthouse`:** `npm ci` → `npm run build` → Lighthouse CI (`@lhci/cli autorun`) against `vite preview`, mobile preset, 3 runs, median. Assertions: `categories:performance ≥ 0.90`, `categories:accessibility ≥ 0.95`. Upload reports as an artifact. Config in `lighthouserc.json`.

Job names (`checks`, `e2e`, `lighthouse`) are the required status checks for branch protection.

### 3.2 `deploy.yml`

- **Trigger:** `workflow_run` of `CI` completed on `main` with `conclusion == success` (production), and `pull_request` (previews).
- **Production job** (`main` only, `environment: production`): checkout the commit CI tested (`workflow_run.head_sha`) → `npm ci` → `npm run build` → `netlify deploy --prod --dir dist --no-build --site $NETLIFY_SITE_ID --message "<sha>"` → smoke test.
- **Preview job** (pull requests from this repo only; forks have no secrets): build → `netlify deploy --dir dist --no-build --alias pr-<number>` → comment (create or update) the URL on the pull request. Permissions: `pull-requests: write`.
- **Concurrency:** production deploys run one at a time (`group: deploy-production`, no cancel-in-progress).
- **Smoke test** (`scripts/smoke.mjs`, plain Node `fetch`): against the deployed URL, retried for up to 60 s:
  - `/` returns 200 and contains the hero headline "Always ready for your";
  - no `<meta name="robots" content="noindex">` (public build);
  - `/data/directory.json` returns 200 with more than 100 stores;
  - the third-party brand logo is **not served** (`/assets/stores/jollibee-sariaya/logo.png` must not return 200).

  Any failure exits non-zero.

## 4. Repo changes

- `.github/workflows/ci.yml`, `.github/workflows/deploy.yml`, `lighthouserc.json`, `scripts/smoke.mjs`, `.nvmrc`.
- `.gitignore`: add `public/assets/stores/jollibee-sariaya/` and `.lighthouseci/`; untrack that folder (`git rm --cached`).
- `package.json`: `"smoke": "node scripts/smoke.mjs"`; dev dependency `@lhci/cli`.
- `README.md`: CI and deploy status badges, a "How changes ship" section (branch → PR → checks → preview → merge → production), and the required secret/variable.
- `netlify.toml`: unchanged (headers still apply to CLI deploys).

## 5. One-time setup (user + Claude)

1. The user creates a Netlify personal access token (Netlify → User settings → Applications → New access token) and stores it with `gh secret set NETLIFY_AUTH_TOKEN` (pasted at the prompt, never shown in chat).
2. Claude sets `NETLIFY_SITE_ID` with `gh variable set`, makes the repo public (`gh repo edit --visibility public`), and, after the first green CI run, enables branch protection on `main` via the GitHub API with the three required checks.
3. The first production deploy replaces the pitch build on `pakisuyoexpress.netlify.app` with the public build.

## 6. Testing the pipeline

- `scripts/smoke.mjs` is tested locally against the current live site and a local preview.
- The workflows are proven by real runs:
  - a pull request that passes (preview link commented, merge enabled);
  - a deliberately failing pull request (e.g. a broken unit test) shows a red check and **cannot merge**, then is closed;
  - the merge to `main` triggers a green production deploy and smoke test.
- `actionlint` validates the workflow files locally before pushing, if it's available (`npx actionlint` or a Docker image).
