# RUNBOOK — stand up ctsmith.org

Operator guide for Cloudflare + GitHub account setup for **this** site.
Do **not** change the `static-photos` Pages project, its R2 buckets, or
`photos.ctsmith.org` / `r2.photos.ctsmith.org` DNS.

Architecture is already decided (don't reopen it): one Pages project, one
public hostname (`ctsmith.org`), Basalt admin behind Access, assets in R2.

---

## Where we are

| Phase | What | Status |
|---|---|---|
| 1 | Repo is a Basalt instance imported from static-photos v1.5.7 + splash theme | done in git |
| **0** | **Cloudflare/GitHub account setup (buckets, bindings, deploy hook, Access, token)** | **⬅ YOU ARE HERE** |

The site builds locally (`npm run build` / `npm run dev`). Production is empty
until Phase 0: Pages project, custom domain, R2, Access.

`ctsmith.org` currently 522s — Cloudflare is in front of a dead origin. Replacing
that origin with Pages is the DNS step below. Leave every `photos.*` record alone.

---

## The bindings contract

Configure these on the **Pages project → Settings → Functions → Bindings & Variables**.

| Name | Type | Value / notes |
|---|---|---|
| `ASSETS_BUCKET` | R2 binding | `ctsmith-org-assets` |
| `ORIGINALS_BUCKET` | R2 binding | `ctsmith-org-originals` |
| `GITHUB_TOKEN` | Secret | Fine-grained PAT, this repo only, Contents: read/write |
| `GITHUB_REPO` | Plain var | `adobebulk/ctsmith-org` |
| `DEPLOY_HOOK_URL` | Secret | Pages deploy-hook URL (admin "Rebuild" target) |
| `ASSETS_R2_PUBLIC_URL` | Plain var | `https://r2.ctsmith.org` |
| `PUBLIC_ORIGIN` | Plain var | `https://ctsmith.org` |
| `PACKAGE_VERSION` | Plain var | keep in sync with `package.json` |
| `HUGO_VERSION` | Build env | `0.161.1` |
| `CF_ACCOUNT_ID` | Plain var | (optional) account ID for admin build-status |
| `CF_API_TOKEN` | Secret | (optional) Pages Read + Cache Purge |
| `CF_PAGES_PROJECT` | Plain var | (optional) defaults to `ctsmith-org` |

---

## Phase 0 — step by step

Do these in order. Where it says **"copy this down,"** you will enter it as a
binding/secret in step 7.

1. **Create the R2 buckets.** R2 → Create bucket → `ctsmith-org-assets`.
   Repeat → `ctsmith-org-originals`. Do **not** reuse `static-photos-assets` or
   `static-photos-originals`.
   CLI: `npx wrangler r2 bucket create ctsmith-org-assets` (and originals).

2. **Custom domain on the public assets bucket.** R2 → `ctsmith-org-assets` →
   Settings → Custom domain → `r2.ctsmith.org`.
   Do **not** put a public domain on `ctsmith-org-originals`.
   Do **not** change `r2.photos.ctsmith.org`.

3. **Create the Pages project.** Workers & Pages → Create → Pages → Connect to
   Git → `adobebulk/ctsmith-org`.
   - Build command: `npm run build`
   - Output directory: `site/public`
   - Root: `/`
   - Environment variable (production): `HUGO_VERSION=0.161.1`
   First deploy produces a `*.pages.dev` URL. Confirm the splash renders.

4. **Add custom domains.** Pages → Custom domains:
   - `ctsmith.org` (this replaces the dead origin that currently 522s)
   - `www.ctsmith.org` → redirect to apex
   Cloudflare will propose DNS changes for the **apex and www only**.
   Review the proposed records. Abort if anything mentions `photos`.

5. **Create the deploy hook.** Pages → Settings → Builds & deployments →
   Deploy hooks → create `admin-rebuild` on the **production** branch →
   **copy this down** = `DEPLOY_HOOK_URL`.

6. **Create the GitHub token.** GitHub → Settings → Developer settings →
   Fine-grained tokens → new token, repository access = `adobebulk/ctsmith-org`
   only, Contents: Read and write → **copy this down** = `GITHUB_TOKEN`.
   Do not reuse the static-photos token.

7. **Wire the bindings/vars** (Pages → Settings → Functions → Bindings):
   add every row in the contract table above.

8. **Set up Cloudflare Access** (Zero Trust → Access → Applications):
   a **self-hosted application** on `ctsmith.org` covering paths `/admin*` and
   `/api*`, policy Allow your email. Leave `/` and `/assets/*` public.
   Do this before uploading real content. Do not edit the photos Access app.

9. **Re-deploy** so Functions pick up the bindings (Retry deployment, or push).

10. **Smoke test.** `https://ctsmith.org/` splash. `/about/`. `/projects/`
    empty state. `/admin` → Access login. `https://photos.ctsmith.org/` still
    the photo site.

---

## Guardrails

- **No photos or binaries in git.** Images live in R2.
- **No Hugo build-time image processing** (`.Resources` / `.Fill` / `.Resize`).
- **Don't touch `static-photos`.** Separate repo, Pages project, buckets, token.
- Keep the admin UI and the Basalt theme as the working pair; keep
  `admin/public/index.html` in sync with `site/static/admin/index.html`.
