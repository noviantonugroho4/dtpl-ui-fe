# dtpl-ui-fe

DTPL - Tugas Kampus. Frontend for the WiDeWi CMS admin console.

## Stack

- Vue 3 + TypeScript, built with Vite
- Vue Router (auth guards), Pinia (auth store), vue-i18n (English / Bahasa Indonesia)
- Tailwind CSS v4

## Getting started

```bash
npm install
cp .env.example .env   # optional, defaults work for local development
npm run dev
```

Open http://localhost:5173. Unauthenticated visitors are redirected to `/login`.

## Backend

API docs: https://dtpl-api.rdlab.cc/docs

Endpoints used:

| Method | Path               | Purpose                          |
| ------ | ------------------ | -------------------------------- |
| POST   | `/api/auth/login`  | Username + password, returns JWT |
| GET    | `/api/auth/me`     | Current user profile             |
| POST   | `/api/auth/logout` | Invalidate the session           |
| GET    | `/api/health`      | Liveness check                   |

The backend does not send CORS headers, so the browser never calls it directly in development.
Vite proxies `/api/*` to `VITE_API_PROXY_TARGET` (default `https://dtpl-api.rdlab.cc`).

For a production build, either serve the built files behind the same origin as the API (reverse proxy `/api`),
or set `VITE_API_BASE_URL` to the API origin and enable CORS on the backend for the frontend origin.

## Project layout

```
src/
  api/         fetch client, typed endpoints, API types
  stores/      Pinia auth store (token + user persisted in localStorage)
  router/      routes and navigation guards
  i18n/        vue-i18n setup and locale files (en, id)
  layouts/     AdminLayout: sidebar + topbar shell
  views/       LoginView, HomeView, NotFoundView
  components/  ProfileCard, LanguageSwitcher
```

## Scripts

- `npm run dev` – start the dev server with API proxy
- `npm run typecheck` – `vue-tsc` only
- `npm run build` – type-check (`vue-tsc`) and build to `dist/`
- `npm test`, `npm run test:run`, `npm run test:coverage` – Vitest
- `npm run preview` – serve the production build locally

## Mock mode (backend offline)

Set in `.env`:

```
VITE_USE_MOCK_API=true
VITE_MOCK_USERNAME=admin
VITE_MOCK_PASSWORD=admin123
VITE_MOCK_ROLE=admin
```

With mock mode on, `src/api/mock.ts` replaces the HTTP calls: login checks the credentials above, issues a fake token,
and the profile endpoint returns a generated user. A notice is shown on the login page. Set it to `false`
(or remove it) to talk to the real backend again. Restart `npm run dev` after changing `.env`.

## Testing

Vitest with Vue Test Utils and jsdom. Tests live next to the code as `*.test.ts`.

```bash
npm test               # watch mode
npm run test:run       # single run
npm run test:coverage  # single run with coverage report in coverage/
```

Shared setup is in `src/test/setup.ts` (i18n plugin, storage reset) and `src/test/helpers.ts` (fixtures).
Tests run with fixed env values from `vitest.config.ts`, so a local `.env` does not affect results.

## CI and deployment (GitHub Actions → Vercel)

`.github/workflows/deploy.yml` runs on every push to `main` and on pull requests:

1. **check**: type-check and unit/component tests with coverage (summary in the job summary, HTML report as artifact).
2. **deploy** (only if check passed): `vercel build` + `vercel deploy --prebuilt`. Push to `main` deploys production;
   a pull request deploys a preview and the URL is posted as a PR comment.

`vercel.json` rewrites `/api/*` to the backend server-side, so the deployed site does not need CORS on the backend,
and falls back to `index.html` for client-side routes.

One-time setup:

1. In the Vercel project: Settings → Git → **Disconnect** the GitHub repository, so Vercel no longer deploys on its
   own (otherwise every push deploys twice and the untested Vercel build wins).
2. Get the project IDs: Settings → General shows the **Project ID**; the **Team/Org ID** is under the account or team
   settings. Alternatively run `npm i -g vercel && vercel login && vercel link` here and read `.vercel/project.json`.
3. Create a token at https://vercel.com/account/tokens.
4. In GitHub, Settings → Secrets and variables → Actions:
   - Secrets: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`
   - Variables (optional, defaults in the workflow): `VITE_USE_MOCK_API` (`true`/`false`), `VITE_MOCK_USERNAME`,
     `VITE_MOCK_PASSWORD`, `VITE_MOCK_ROLE`, `VITE_API_BASE_URL`
5. Push to `main`.

When the backend goes live, set the variable `VITE_USE_MOCK_API` to `false` and re-run the workflow.
