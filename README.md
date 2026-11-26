# WPPlugins GitHub Pages (`wpplugins.github.io`)

Self-updating static developer portal and plugin index for
[**WPPlugins**](https://github.com/WPPlugins), hosted at
**https://wpplugins.github.io/**.

## Architecture (Split Index & Website)

1. **Plugin Index Builder (`scripts/build-index.ts` &
   `.github/workflows/update-index.yml`)**
   - Runs every **2 hours** (`0 */2 * * *`), fetches all public `WPPlugins`
     repos in parallel batches, writes `plugins.json` and `stats.json` to an
     orphan `data` branch (keeping `main` clean), and triggers `pages.yml`.
2. **Pure Website Builder (`scripts/build-site.ts` &
   `.github/workflows/pages.yml`)**
   - Runs on frontend changes (`public/**`) or when triggered by
     `update-index.yml`.
   - Combines `public/` with the prebuilt `data` branch and deploys to GitHub
     Pages in seconds.

## Local Development

```bash
deno task check
deno task test
deno task index --limit 2
deno task build
```
