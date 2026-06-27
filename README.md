# DCS-GH Repository Catalog

A static, searchable catalog of the **DCS-GH** GitHub organization's repositories.

Published at: <https://repos.dcsai.eu>

The site is generated automatically by GitHub Actions and deployed to GitHub Pages.

## How it works

A single Node script ([scripts/generate-catalog.mjs](scripts/generate-catalog.mjs)) fetches the org's
repositories and custom properties from the GitHub API, then writes the site into `dist/`:

- `dist/index.html` — searchable catalog page
- `dist/repos.json` — raw catalog data
- `dist/styles.css` — page styling

### Project layout

```
scripts/
  generate-catalog.mjs   # orchestrator: fetch -> build -> write
  styles.css             # page styles (copied into dist/)
  lib/
    github.mjs           # GitHub API client + pagination
    format.mjs           # escapeHtml / safeUrl helpers
    template.mjs         # HTML rendering
.github/workflows/
  build-pages.yml        # build + deploy to GitHub Pages
```

## Running locally

```bash
npm run build
```

Output is written to `dist/`. Open `dist/index.html` in a browser to preview.

> Reading org custom properties (e.g. service owner) requires authentication. Without a token the build
> still succeeds, but owner metadata is skipped. Set a token to include it:
>
> ```bash
> CATALOG_GITHUB_TOKEN=ghp_xxx npm run build
> ```

## Configuration

The build is configured via environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `ORG_NAME` | `DCS-GH` | GitHub organization to catalog |
| `REPO_TYPE` | `public` | Repo type to list (`all`, `public`, `private`, ...) |
| `INCLUDE_FORKS` | `false` | Include forked repositories |
| `CATALOG_TITLE` | `<ORG_NAME> Repository Catalog` | Page title |
| `CATALOG_GITHUB_TOKEN` / `GH_TOKEN` | — | Token used for API requests (needed for custom properties) |

## Deployment

Pushing to `main` (or running the workflow manually / on schedule) triggers
[.github/workflows/build-pages.yml](.github/workflows/build-pages.yml), which builds the catalog and
publishes `dist/` to GitHub Pages.