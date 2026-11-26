# WPPlugins GitHub Pages (`wpplugins.github.io`)

Self-updating static developer portal and plugin index for [**WPPlugins**](https://github.com/WPPlugins), hosted at **https://wpplugins.github.io/**.

- Rebuilt every **2 hours** (`0 */2 * * *`) via GitHub Actions ([`.github/workflows/pages.yml`](./.github/workflows/pages.yml)).
- Generates `dist/data/plugins.json`, `dist/data/stats.json`, `dist/sitemap.xml`, and `dist/robots.txt` using Deno (`scripts/build-site.ts`).

## Local Development

```bash
deno task check
deno task test
deno run --allow-net --allow-read --allow-write --allow-env scripts/build-site.ts --limit 2
```
