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
│   ├── content/about.md        git-managed About page (not an admin type yet)
│   ├── content/projects/       series + empty _pool
│   ├── content/posts/          posts type kept; not linked in public nav
│   └── themes/basalt/layouts/  splash homepage + restyled CMS templates
├── wrangler.toml               project ctsmith-org, own R2 buckets
└── package.json                version 0.1.0
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
Current version: **0.1.0**

---

## Data models

Identical to static-photos v1.5.7: series manifests under `site/content/projects/<slug>/`,
photo pool at `_pool` (always draft), text posts under `site/content/posts/`, settings in
`site/data/settings.yaml`. See the photos `AGENTS.md` for the full API table — this
instance implements the same routes in `functions/api/[[route]].js`.

About is a regular Hugo page (`site/content/about.md`), not an admin content type.

---

## Hugo template notes

- Homepage (`index.html`): splash “C.T. Smith / Do the Right Thing.” plus About and Work links. No hero, featured row, or series grid on `/`.
- Work is `/projects/` (series list + per-series grids + PhotoSwipe). Empty state when no published series.
- About is `_default/single.html`.
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
- [ ] Homepage link to `blog.ctsmith.org` (Access-gated). Not in v0.1.0.
- [ ] About page copy (placeholder in `site/content/about.md`).

---

## Current state (last updated: 2026-09-07)

### v0.1.0 — CURRENT

- Stand up ctsmith.org as a second Basalt instance.
- CMS (`functions/`, admin UI, staging, pool, posts) imported from static-photos v1.5.7.
- Dropped the `adobebulk/basalt` theme submodule (wrong shape).
- Own wrangler project, R2 bucket names, `PUBLIC_ORIGIN`, GitHub repo var.
- Public theme: splash homepage, About, Work. No blog subdomain.
