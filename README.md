# dtpl-ui-fe

DTPL - Tugas Kampus. Frontend for the WiDeWi CMS admin console.

## Stack

- Vue 3 + TypeScript, built with Vite
- Vue Router (auth guards), Pinia (auth store); UI text in Bahasa Indonesia only
- Tailwind CSS v4

## Getting started

```bash
npm install
cp .env.example .env   # optional, defaults work for local development
npm run dev
```

Open http://localhost:5173.

- `/` is the public site (landing, `/destinasi-wisata`, `/destinasi-wisata/:id`); no login needed.
- `/portal-admin` is the CMS; unauthenticated visitors are redirected to `/portal-admin/login`.
  The old CMS URLs (`/login`, `/dashboard`, …) redirect to the new prefix.
- "Destinasi Unggulan" on the landing page is mock data (`src/api/landing.ts`) until the backend exposes a featured flag; "Destinasi Baru" comes from the API.

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

Shared setup is in `src/test/setup.ts` (storage reset) and `src/test/helpers.ts` (fixtures).
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

## Test automation hooks

Every page, section and interactive element carries a stable `data-testid`, so UI automation
(Playwright, Cypress, Selenium, Katalon) never has to rely on text, CSS classes or DOM position.

Convention: kebab-case, `<page>-<element>`; repeated items append their key, e.g. `wisata-row-<id>-view`.
`<id>` is the backend UUID (or `mock-…` for sample data), `<n>` a zero-based index, `<label>` the chart category text.
The `wisata-type-tag` element also exposes `data-jenis`; public cards built from mock data carry `data-mock="true"`.

| File | Test ids |
| --- | --- |
| `components/AppPagination.vue` | `pagination`, `pagination-prev`, `pagination-gap`, `pagination-page-<n>`, `pagination-next` |
| `components/WisataDetailSummary.vue` | `testid`, `<testid>-images`, `<testid>-image-<id>`, `<testid>-nama`, `<testid>-jenis`, `<testid>-telp`, `<testid>-wa`, `<testid>-alamat`, `<testid>-wilayah`, `<testid>-maps`, `<testid>-fasilitas`, `<testid>-deskripsi`, `<testid>-harga`, `<testid>-services`, `<testid>-service-<id>`, `<testid>-created`, `<testid>-updated` |
| `components/WisataTypeTag.vue` | `wisata-type-tag` |
| `components/charts/ChartTooltip.vue` | `chart-tooltip` |
| `components/charts/HorizontalBarChart.vue` | `chart-legend`, `chart-bar-<label>`, `chart-table` |
| `components/charts/LineChart.vue` | `chart-legend`, `chart-point-<label>`, `chart-table` |
| `components/form/FormRow.vue` | `<testid>-row`, `<testid>-error` |
| `components/public/PublicHeader.vue` | `public-header`, `public-header-logo`, `public-nav`, `public-nav-home`, `public-nav-attractions`, `public-nav-contact`, `public-social`, `public-social-<instagram|facebook|youtube>`, `public-header-login` |
| `components/public/PublicWisataCard.vue` | `testid`, `<testid>-nama`, `<testid>-kecamatan`, `<testid>-kelurahan`, `<testid>-harga` |
| `components/public/WisataCarousel.vue` | `testid`, `<testid>-loading`, `<testid>-error`, `<testid>-empty`, `<testid>-title`, `<testid>-more`, `<testid>-prev`, `<testid>-next` |
| `layouts/AdminLayout.vue` | `layout`, `layout-backdrop`, `layout-sidebar`, `layout-logo`, `layout-sidebar-close`, `layout-nav`, `nav-<route-name>`, `layout-header`, `layout-menu-toggle`, `layout-title`, `layout-logout`, `layout-main` |
| `layouts/PublicLayout.vue` | `public-layout`, `public-main`, `public-footer` |
| `views/ComingSoonView.vue` | `coming-soon-page`, `coming-soon-title` |
| `views/DashboardView.vue` | `dashboard-page`, `dashboard-title-card`, `dashboard-title`, `dashboard-subtitle`, `dashboard-chart-ticket`, `dashboard-chart-rating` |
| `views/DestinasiWisataCreateView.vue` | `wisata-form-page`, `wisata-form-title-card`, `wisata-form-title`, `wisata-form-back`, `wisata-form`, `wisata-form-error`, `wisata-form-nama`, `wisata-form-image-<n>`, `wisata-form-image-<n>-retry`, `wisata-form-image-<n>-remove`, `wisata-form-image-add`, `wisata-form-image-input`, `wisata-form-jenis`, `wisata-form-telp`, `wisata-form-wa`, `wisata-form-alamat`, `wisata-form-alamat-error`, `wisata-form-location-error`, `wisata-form-location-retry`, `wisata-form-<provinsi|kabupaten|kecamatan|kelurahan>`, `wisata-form-<provinsi|kabupaten|kecamatan|kelurahan>-error`, `wisata-form-kodepos`, `wisata-form-kodepos-error`, `wisata-form-maps`, `wisata-form-fasilitas-<n>`, `wisata-form-fasilitas-<n>-remove`, `wisata-form-fasilitas-add`, `wisata-form-deskripsi`, `wisata-form-harga`, `wisata-form-service-<n>`, `wisata-form-service-<n>-name`, `wisata-form-service-<n>-price`, `wisata-form-service-<n>-remove`, `wisata-form-service-add`, `wisata-form-submit`, `wisata-form-nama-row`, `wisata-form-nama-error`, `wisata-form-images-row`, `wisata-form-images-error`, `wisata-form-jenis-row`, `wisata-form-jenis-error`, `wisata-form-kontak-row`, `wisata-form-kontak-error`, `wisata-form-alamat-row`, `wisata-form-maps-row`, `wisata-form-maps-error`, `wisata-form-fasilitas-row`, `wisata-form-fasilitas-error`, `wisata-form-deskripsi-row`, `wisata-form-deskripsi-error`, `wisata-form-harga-row`, `wisata-form-harga-error`, `wisata-form-services-row`, `wisata-form-services-error` |
| `views/DestinasiWisataDetailView.vue` | `wisata-detail-page`, `wisata-detail-title`, `wisata-detail-back`, `wisata-detail-edit`, `wisata-detail-loading`, `wisata-detail-not-found`, `wisata-detail-error`, `wisata-detail-retry` |
| `views/DestinasiWisataView.vue` | `wisata-list-page`, `wisata-list-notice`, `wisata-list-notice-close`, `wisata-list-title-card`, `wisata-list-title`, `wisata-list-add`, `wisata-filter-kecamatan`, `wisata-filter-search`, `wisata-table`, `wisata-table-loading`, `wisata-table-error`, `wisata-table-retry`, `wisata-table-empty`, `wisata-row-<id>`, `wisata-row-<id>-nama`, `wisata-row-<id>-jenis`, `wisata-row-<id>-kecamatan`, `wisata-row-<id>-tanggal`, `wisata-row-<id>-view`, `wisata-row-<id>-edit`, `wisata-row-<id>-delete` |
| `views/LoginView.vue` | `login-page`, `login-brand-panel`, `login-logo`, `login-services`, `login-tagline`, `login-form-panel`, `login-title`, `login-subtitle`, `login-mock-notice`, `login-form`, `login-username`, `login-password`, `login-password-toggle`, `login-error`, `login-submit` |
| `views/NotFoundView.vue` | `not-found-page`, `not-found-home` |
| `views/public/LandingView.vue` | `landing-page`, `landing-hero`, `landing-hero-title`, `landing-hero-subtitle`, `landing-hero-cta`, `landing-categories`, `landing-category-<jenis>` |
| `views/public/PublicWisataDetailView.vue` | `public-detail-page`, `public-detail-breadcrumb`, `public-detail-title`, `public-detail-loading`, `public-detail-not-found`, `public-detail-error`, `public-detail-retry` |
| `views/public/PublicWisataListView.vue` | `public-list-page`, `public-list-breadcrumb`, `public-list-title`, `public-list-filters`, `public-list-search`, `public-list-kecamatan`, `public-list-kelurahan`, `public-list-popularity`, `public-list-popularity-desc`, `public-list-popularity-asc`, `public-list-types`, `public-list-type-<jenis>`, `public-list-budget`, `public-list-loading`, `public-list-error`, `public-list-retry`, `public-list-empty`, `public-list-grid` |
