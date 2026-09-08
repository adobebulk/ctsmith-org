# AGENTS.md — ctsmith.org

Context file for both Cowork and Codex. Keep this up to date as the project evolves.

Personal site at **`ctsmith.org`**. Basalt CMS instance imported from
`static-photos` **v1.5.7**. That photos project is a separate site — **do not
edit it from this repo.**

**Repo:** https://github.com/adobebulk/ctsmith-org

---

## What this is

A public personal website plus a private serverless admin for managing photo
series and text posts. Same Jamstack as photos: Hugo static output, R2 for
images, Pages Functions for `/api/*` and `/assets/*`, Cloudflare Access on
`/admin*` and `/api*`.

Later: a homepage link to `blog.ctsmith.org` (Access-gated for friends and
family). Not built in v0.1.0 — do not add hostname middleware or a second
custom domain until that pass.

---

## Target architecture

```
You (phone / laptop)
  → ctsmith.org/admin     [Cloudflare Access]
    → Pages Function (/api/*)
        1. Resize via Transform via Workers (AVIF + JPEG, strip metadata)
        2. PUT variants → ASSETS_BUCKET; original → ORIGINALS_BUCKET
        3. Stage metadata to _pending/ in ORIGINALS_BUCKET
        4. Rebuild → GitHub commit + Pages deploy hook

Visitor → ctsmith.org            [Pages CDN]
  → ctsmith.org/assets/*         [Function → R2, edge-cached]
```

| Path | What serves it |
|---|---|
| `/`, `/about/`, `/projects/*` | Hugo static output |
| `/admin` | `site/static/admin/index.html` (Access-gated) |
| `/api/*` | `functions/api/[[route]].js` (Access-gated) |
| `/assets/*` | `functions/assets/[[path]].js` |

---

## Documentation hygiene — ENFORCED

Every commit that changes behaviour must include, in the same commit:

1. **Version bump** — `package.json` and `wrangler.toml [vars] PACKAGE_VERSION`.
2. **AGENTS.md** — update anything that changed.
3. **README.md** — version line and any changed behaviour.
4. **Delete unused files.**

---

## Development pipeline — ENFORCED

1. Branch: `feat/…`, `fix/…`, `chore/…`. Never commit to `main`.
2. Work on the branch. Docs + version in the same commit as the code.
3. Self-review `git diff main..HEAD`.
4. Push the branch. Do not merge to `main` until the human reviews.
5. Merge only when explicitly instructed.

---

## Tech stack

Same as static-photos v1.5.7. Image transforms use `fetch(url, { cf: { image } })`
against `ASSETS_R2_PUBLIC_URL` (`https://r2.ctsmith.org`). CDN purge URLs use
`PUBLIC_ORIGIN` (`https://ctsmith.org`), not a hardcoded host.

---

## Directory structure

```
ctsmith-org/
├── AGENTS.md
├── RUNBOOK.md
├── README.md
├── functions/                  ← copied from static-photos v1.5.7, retargeted
├── admin/public/index.html
├── site/
│   ├── hugo.toml               baseURL = https://ctsmith.org/
│   ├── data/settings.yaml
│   ├── content/_index.md       homepage splash (admin-editable)
│   ├── content/pages/          subpages at /<slug>/ (admin-editable)
│   ├── content/projects/       series + empty _pool
│   ├── content/posts/          posts type kept; not linked in public nav
│   └── themes/basalt/layouts/  splash homepage + restyled CMS templates
├── wrangler.toml               project ctsmith-org, own R2 buckets
└── package.json                version 0.2.1
```

---

## Key commands

```bash
npm run dev              # http://localhost:1313
npm run build            # production (Pages runs this)
npx wrangler pages dev site/public
npx wrangler tail
```

---

## Versioning

Source of truth is `package.json`. Bump it **and** `wrangler.toml [vars] PACKAGE_VERSION`.
`site/data/version.yaml` is generated at build by `scripts/write-version.js` (gitignored).
Current version: **0.2.2**

---

## Data models

Series, pool, posts, and settings are identical to static-photos v1.5.7. This instance also has a **pages** type and an editable homepage.

### Homepage (`site/content/_index.md`)

```yaml
---
title: "C.T. Smith"
tagline: "Do the Right Thing."
---
optional markdown body below the splash
```

PATCH `/api/home` also writes `settings.title` and `settings.description` so OG/footer fallbacks stay in sync.

### Pages (`site/content/pages/<slug>/index.md`)

```yaml
---
title: "About"
date: "2026-09-07"
draft: false
nav: true
weight: 1
---
markdown body
```

Published at `https://ctsmith.org/<slug>/`. Reserved slugs: admin, api, assets, css, projects, posts, pages, index, home, sitemap, tags, categories, _index, _pool, _pending.

### Extra admin API

| Method | Path | Description |
|---|---|---|
| GET | `/api/home` | Homepage title, tagline, body |
| PATCH | `/api/home` | Update homepage; syncs settings title/description |
| GET | `/api/pages` | List subpages |
| POST | `/api/pages` | Create `{ title, body, nav, draft }` (draft defaults true) |
| GET | `/api/pages/:slug` | One page including body |
| PATCH | `/api/pages/:slug` | Update `{ title, body, nav, draft, weight }` |
| DELETE | `/api/pages/:slug` | Delete page |
| POST | `/api/pages/:slug/publish` | Toggle `{ draft }` |

---

## Hugo template notes

- Homepage (`index.html`): splash from `_index.md` title/tagline, optional body, nav from published pages with `nav: true` plus Work.
- Work is `/projects/` (series list + per-series grids + PhotoSwipe). Empty state when no published series.
- Subpages use `layouts/pages/single.html`, permalinks `/:slug/`.
- No build-time image processing. Asset URLs are `{{ .Site.Params.assetsBaseURL }}/<key>/<size>.<fmt>`.
- `_pool` is `draft: true` and filtered from public templates.

---

## Security model

- Cloudflare Access gates `/admin*` and `/api*` on `ctsmith.org`.
- `ASSETS_BUCKET` is public variants only. `ORIGINALS_BUCKET` is private.
- GitHub token scoped to `adobebulk/ctsmith-org` only.
- All metadata stripped from published images.
- Do not share R2 buckets, tokens, or deploy hooks with static-photos.

---

## Known issues / TODO

- [ ] Phase 0: Cloudflare/GitHub bindings for production (see RUNBOOK.md).
- [ ] Homepage link to `blog.ctsmith.org` (Access-gated). Not in v0.2.0.
- [ ] About page copy (placeholder in `site/content/pages/about/index.md`).

---

## Current state (last updated: 2026-09-07)

### v0.2.2 — CURRENT

- Hugo 0.161.1: `build.render` instead of removed `_build`; `locale` instead of deprecated `languageCode`.

### v0.2.1

- Create-page Draft checkbox is honored on POST.
- Homepage OG title/description follow `_index.md` / settings, not hugo.toml.
- Homepage save no longer writes a default `settings.yaml` when GitHub is missing.
- Recreating a staged-deleted page no longer 409s. Slug validation on all page routes.

### v0.2.0

- Admin Pages tab: edit homepage (name, tagline, optional body) and CRUD subpages.
- Homepage is `site/content/_index.md`. Subpages are `site/content/pages/<slug>/` at `/:slug/`.
- Nav is driven by published pages with `nav: true`, plus Work.
- GitHub 401/missing token no longer blocks local staging reads (settings/home/pages).

### v0.1.0

- Stand up ctsmith.org as a second Basalt instance.
- CMS (`functions/`, admin UI, staging, pool, posts) imported from static-photos v1.5.7.
- Dropped the `adobebulk/basalt` theme submodule (wrong shape).
- Own wrangler project, R2 bucket names, `PUBLIC_ORIGIN`, GitHub repo var.
- Public theme: splash homepage, About, Work. No blog subdomain.
