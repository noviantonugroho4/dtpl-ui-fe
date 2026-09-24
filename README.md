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
- `npm run build` – type-check (`vue-tsc`) and build to `dist/`
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

## Deployment (Vercel via GitHub Actions)

`.github/workflows/deploy.yml` builds and deploys on every push to `main` (production) and on pull requests (preview URL
posted as a PR comment). `vercel.json` rewrites `/api/*` to the backend server-side, so the deployed site does not need
CORS on the backend, and falls back to `index.html` for client-side routes.

One-time setup:

1. Create a Vercel account and install the CLI: `npm i -g vercel`, then `vercel login`.
2. In this folder run `vercel link` (create a new project, do **not** connect it to Git; the Action deploys instead).
   This writes `.vercel/project.json` containing `orgId` and `projectId`.
3. Create a token at https://vercel.com/account/tokens.
4. In GitHub, Settings → Secrets and variables → Actions:
   - Secrets: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`
   - Variables (optional, defaults in the workflow): `VITE_USE_MOCK_API` (`true`/`false`), `VITE_MOCK_USERNAME`,
     `VITE_MOCK_PASSWORD`, `VITE_MOCK_ROLE`, `VITE_API_BASE_URL`
5. Push to `main`.

When the backend goes live, set the variable `VITE_USE_MOCK_API` to `false` and re-run the workflow.
