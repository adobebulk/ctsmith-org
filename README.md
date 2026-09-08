# ctsmith.org

Personal site for C.T. Smith. A fast static Hugo site for visitors, with a private serverless admin (Basalt) for managing photos and posts — no always-on server.

Everything runs on **Cloudflare + GitHub**. Photos live in R2 (never git). Metadata commits are text-only. Current version: **0.2.1**

CMS architecture is imported from [static-photos](https://github.com/adobebulk/static-photos) **v1.5.7**. That project is a separate site (`photos.ctsmith.org`) and is not modified here.

Public pages: splash homepage, About, Work (photo series). The admin still supports text posts for later use. A homepage link to `blog.ctsmith.org` is planned and not built in this version.

---

## Architecture

```
You (phone / laptop)
  → ctsmith.org/admin          Cloudflare Access login gate
    → Pages Function (/api/*)  admin backend — serverless
        1. resize via Transform via Workers (AVIF + JPEG, strip EXIF)
        2. PUT variants → ASSETS_BUCKET (public R2)
        3. PUT original → ORIGINALS_BUCKET (private R2)
        4. stage metadata to _pending/ in R2

Admin "Rebuild" button
  → flushes staged changes → one GitHub commit → Pages build

GitHub (Hugo source + manifests, NO binaries)
  → Cloudflare Pages build (fast — no image work)
    → static HTML/CSS + Functions on CF CDN

Visitor → ctsmith.org          Pages CDN for HTML
  → ctsmith.org/assets/*       Pages Function → R2 stream, edge-cached
```

| Path | Served by |
|---|---|
| `/` and public pages | Hugo static output (Cloudflare Pages CDN) |
| `/admin` | Static HTML in `site/static/admin/` (Access-gated) |
| `/api/*` | Pages Function `functions/api/[[route]].js` (Access-gated) |
| `/assets/*` | Pages Function `functions/assets/[[path]].js` → R2 |

This is a **separate** Pages project, R2 pair, GitHub token, and Access app from `photos.ctsmith.org`.

---

## Stack

| Layer | Tech |
|---|---|
| Static site | [Hugo](https://gohugo.io) (extended) — manifest-driven, no build-time image processing |
| CSS | Tailwind CSS v3 |
| Lightbox | PhotoSwipe v5 (jsDelivr CDN) |
| Hosting | Cloudflare Pages |
| Asset storage | Cloudflare R2 — `ctsmith-org-assets` (public variants) and `ctsmith-org-originals` (private originals + staging) |
| Image resizing | Cloudflare Transform via Workers — 600/1200/2400 px AVIF + JPEG, EXIF stripped |
| Admin backend | Pages Functions (`/api/*`) |
| Auth | Cloudflare Access (gates `/admin*` and `/api*`) |
| Deploy trigger | Cloudflare Pages deploy hook (admin "Rebuild" button) |

---

## Local dev

### Prerequisites

```bash
brew install hugo node
```

### Install dependencies

```bash
npm install
```

### Run the site (Hugo + Tailwind watch)

```bash
npm run dev
# → http://localhost:1313
```

### Run with Pages Functions (needs R2 bindings)

```bash
cp .dev.vars.example .dev.vars   # fill in real values
npx wrangler pages dev site/public
```

The `/api/*` and `/assets/*` routes require real R2 bindings from `.dev.vars`. The Hugo site itself works with just `npm run dev`.

---

## Repo structure

```
ctsmith-org/
├── functions/
│   ├── _lib/
│   │   ├── env.js          central binding/var registry (getEnv helper)
│   │   ├── github.js       GitHub Trees API — atomic multi-file commits
│   │   ├── manifest.js     front-matter parse/serialize, slugify, ID helpers
│   │   └── staging.js      _pending/ layer — holds changes until Rebuild
│   ├── assets/[[path]].js  streams R2 objects, edge-cached immutably
│   └── api/[[route]].js    admin API router
├── admin/
│   └── public/index.html   admin UI source (keep in sync with site/static/admin/)
├── scripts/
│   └── rebuild.sh          local Hugo preview shortcut
├── site/
│   ├── hugo.toml
│   ├── data/settings.yaml  title, navLabel, photographer, description
│   ├── static/admin/       admin UI served at /admin by Pages
│   ├── content/_index.md       homepage splash (title, tagline, optional body)
│   ├── content/pages/          subpages (About, …) published at /<slug>/
│   ├── content/projects/   series branch bundles (_index.md manifests, NO images)
│   └── themes/basalt/layouts/
├── wrangler.toml
├── package.json
└── tailwind.config.js
```

No image files ever enter `content/` or git. All photos live in R2.

---

## How publishing works

1. **Upload photos** via the admin panel — photos are resized and stored in R2; metadata is staged in `_pending/` (ORIGINALS_BUCKET).
2. **Edit metadata** (captions, cover, series settings) — all changes are staged.
3. **Rebuild** — the admin "Rebuild" button flushes all staged changes into one GitHub commit, then pings the Cloudflare Pages deploy hook. Pages rebuilds the site.

Staged changes are visible in the admin immediately. Visitors see the updated site after the Pages build completes (~30 s).

---

## Required Cloudflare bindings

| Binding | Type | Purpose |
|---|---|---|
| `ASSETS_BUCKET` | R2 | Public bucket — web variants + originals marked downloadable |
| `ORIGINALS_BUCKET` | R2 | Private bucket — all originals + staging (`_pending/`) |
| `GITHUB_TOKEN` | Secret | Fine-grained PAT, Contents read/write on this repo |
| `GITHUB_REPO` | Var | `"adobebulk/ctsmith-org"` |
| `DEPLOY_HOOK_URL` | Secret | Cloudflare Pages deploy hook URL |
| `ASSETS_R2_PUBLIC_URL` | Var | Public custom domain for the assets bucket, e.g. `https://r2.ctsmith.org` |
| `PUBLIC_ORIGIN` | Var | Public site origin, `https://ctsmith.org` — used for CDN purge URLs |
| `CF_ZONE_ID` | Var | (optional) Zone ID for global CDN cache purge |
| `CF_API_TOKEN` | Secret | (optional) Token with Cache Purge permission |

See **RUNBOOK.md** for account setup.

---

## Customising

- **Site title, nav label, photographer name, description** — admin Settings panel (or edit `site/data/settings.yaml`)
- **Homepage splash** — admin Pages tab (or `site/content/_index.md`)
- **Subpages** — admin Pages tab (or `site/content/pages/<slug>/index.md`)
- **Colors / typography** — `site/assets/css/input.css` and `tailwind.config.js`
- **Templates** — `site/themes/basalt/layouts/`
