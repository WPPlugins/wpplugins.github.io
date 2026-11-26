import { parseArgs } from "@std/cli";
import { copy, ensureDir, exists } from "@std/fs";
import { join } from "@std/path";
import type { CompactPluginEntry } from "./build-index.ts";

const PAGE_SIZE = 100;
const WRITE_BATCH_SIZE = 200;

export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function renderPluginPageHtml(
  plugin: CompactPluginEntry,
  baseUrl: string,
): string {
  const slug = plugin.s;
  const safeSlug = escapeHtml(slug);
  const desc = plugin.d ||
    `Git mirror of the ${slug} WordPress.org plugin (SVN trunk & release tags synced to GitHub).`;
  const safeDesc = escapeHtml(desc);
  const safeBranch = escapeHtml(plugin.b || "main");
  const canonicalUrl = `${baseUrl}/plugins/${encodeURIComponent(slug)}/`;
  const githubUrl = `https://github.com/WPPlugins/${encodeURIComponent(slug)}`;
  const cloneUrl = `${githubUrl}.git`;
  const wporgUrl = `https://wordpress.org/plugins/${encodeURIComponent(slug)}/`;

  const jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "SoftwareSourceCode",
    name: slug,
    description: desc,
    url: canonicalUrl,
    codeRepository: githubUrl,
    sameAs: wporgUrl,
    programmingLanguage: "PHP",
    runtimePlatform: "WordPress",
    dateModified: plugin.p || undefined,
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${safeSlug} — WordPress Plugin Git Mirror | WPPlugins</title>
  <meta name="description" content="${safeDesc}" />
  <link rel="canonical" href="${escapeHtml(canonicalUrl)}" />
  <link rel="alternate" type="text/plain" title="LLMs Guide" href="/llms.txt" />
  <meta property="og:type" content="website" />
  <meta property="og:title" content="${safeSlug} — WPPlugins Git Mirror" />
  <meta property="og:description" content="${safeDesc}" />
  <meta property="og:url" content="${escapeHtml(canonicalUrl)}" />
  <meta name="twitter:card" content="summary" />
  <link rel="stylesheet" href="/styles.css" />
  <script type="application/ld+json">${jsonLd}</script>
</head>
<body data-page="plugin" data-slug="${safeSlug}" data-branch="${safeBranch}">
  <header class="topbar">
    <div class="container topbar-inner">
      <a class="brand" href="/">
        <span class="brand-dot" aria-hidden="true"></span>
        WPPlugins
      </a>
      <nav class="nav-links" aria-label="Primary">
        <a href="/">Lookup</a>
        <a href="/plugins/">Directory</a>
        <a href="/#guides">Submodules</a>
        <a href="/llms.txt">llms.txt</a>
      </nav>
    </div>
  </header>

  <main class="container main-content">
    <section class="card card-elevated">
      <nav class="breadcrumb" aria-label="Breadcrumb">
        <a href="/">Home</a>
        <span>/</span>
        <a href="/plugins/">Plugins</a>
        <span>/</span>
        <span>${safeSlug}</span>
      </nav>

      <div class="selected-header">
        <div>
          <div class="selected-title-row">
            <h1 id="selected-title">${safeSlug}</h1>
            <span class="slug-badge" id="selected-branch">${safeBranch}</span>
            ${
    plugin.p
      ? `<span class="slug-badge">Updated ${escapeHtml(plugin.p)}</span>`
      : ""
  }
          </div>
          <p id="selected-desc" class="muted">${safeDesc}</p>
        </div>
        <div class="selected-links">
          <a class="btn-link" id="link-github" href="${githubUrl}" target="_blank" rel="noopener">GitHub Repo ↗</a>
          <a class="btn-link" id="link-wporg" href="${wporgUrl}" target="_blank" rel="noopener">WordPress.org ↗</a>
        </div>
      </div>

      <div class="os-bar" aria-label="Operating system selector">
        <span class="os-label">
          Platform
          <span id="os-detected-badge" class="os-detected">auto</span>
        </span>
        <div class="os-tabs" role="tablist" aria-label="Operating System">
          <button class="os-tab" role="tab" type="button" data-os="windows" aria-selected="false">
            Windows <span class="os-shell">(PowerShell)</span>
          </button>
          <button class="os-tab" role="tab" type="button" data-os="macos" aria-selected="false">
            macOS <span class="os-shell">(zsh)</span>
          </button>
          <button class="os-tab" role="tab" type="button" data-os="linux" aria-selected="false">
            Linux <span class="os-shell">(bash)</span>
          </button>
        </div>
      </div>

      <div class="selected-panel">
        <div class="version-bar">
          <label class="version-label" for="version-select">Version / Tag</label>
          <select id="version-select" class="version-select" aria-label="Select plugin version tag">
            <option value="">Latest (${safeBranch})</option>
          </select>
          <span id="version-status" class="version-status">Loading tags…</span>
        </div>

        <div class="snippets-grid">
          <div class="snippet">
            <div class="snippet-head">
              <span>Clone Repository</span>
              <button class="copy-btn" data-target="cmd-clone" type="button">Copy</button>
            </div>
            <pre><code id="cmd-clone">git clone ${cloneUrl}</code></pre>
          </div>

          <div class="snippet">
            <div class="snippet-head">
              <span>Add as Git Submodule</span>
              <button class="copy-btn" data-target="cmd-submodule" type="button">Copy</button>
            </div>
            <pre><code id="cmd-submodule">git submodule add ${cloneUrl} wp-content/plugins/${safeSlug}</code></pre>
          </div>

          <div class="snippet">
            <div class="snippet-head">
              <span>Pin to Latest Release Tag</span>
              <button class="copy-btn" data-target="cmd-tag" type="button">Copy</button>
            </div>
            <pre><code id="cmd-tag">cd wp-content/plugins/${safeSlug} &amp;&amp; git fetch --tags &amp;&amp; git checkout $(git describe --tags --abbrev=0)</code></pre>
          </div>

          <div class="snippet">
            <div class="snippet-head">
              <span>Update Submodule</span>
              <button class="copy-btn" data-target="cmd-update" type="button">Copy</button>
            </div>
            <pre><code id="cmd-update">git submodule update --remote --merge wp-content/plugins/${safeSlug}</code></pre>
          </div>
        </div>

        <div class="snippet snippet-full">
          <div class="snippet-head">
            <span>Composer Repository (<code>composer.json</code>)</span>
            <button class="copy-btn" data-target="cmd-composer" type="button">Copy</button>
          </div>
          <pre><code id="cmd-composer">{
  "type": "package",
  "package": {
    "name": "wpplugins/${safeSlug}",
    "version": "dev-${safeBranch}",
    "type": "wordpress-plugin",
    "source": {
      "url": "${cloneUrl}",
      "type": "git",
      "reference": "${safeBranch}"
    },
    "require": {
      "composer/installers": "^2.0"
    }
  }
}</code></pre>
        </div>
      </div>
    </section>
  </main>

  <footer class="footer container">
    <p>
      Read-only mirror of <a href="${wporgUrl}" target="_blank" rel="noopener">${safeSlug}</a>
      · <a href="/plugins/">All Plugins</a>
      · <a href="/llms.txt">llms.txt</a>
    </p>
  </footer>

  <script src="/app.js" defer></script>
</body>
</html>
`;
}

export function renderDirectoryPageHtml(
  items: ReadonlyArray<CompactPluginEntry>,
  page: number,
  totalPages: number,
  totalPlugins: number,
  baseUrl: string,
): string {
  const pageUrl = page === 1
    ? `${baseUrl}/plugins/`
    : `${baseUrl}/plugins/page/${page}/`;
  const prevUrl = page === 1
    ? null
    : page === 2
    ? "/plugins/"
    : `/plugins/page/${page - 1}/`;
  const nextUrl = page < totalPages ? `/plugins/page/${page + 1}/` : null;

  const listHtml = items
    .map((item) => {
      const safeSlug = escapeHtml(item.s);
      const safeDesc = escapeHtml(
        item.d || `Git mirror for ${item.s} (branch ${item.b})`,
      );
      return `<a class="directory-item" href="/plugins/${
        encodeURIComponent(item.s)
      }/">
        <span class="directory-slug">${safeSlug}</span>
        <span class="directory-desc">${safeDesc}</span>
      </a>`;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>WordPress Plugin Directory (Page ${page} of ${totalPages}) | WPPlugins</title>
  <meta name="description" content="Browse ${totalPlugins.toLocaleString()} mirrored WordPress.org plugins on GitHub — Page ${page} of ${totalPages}." />
  <link rel="canonical" href="${escapeHtml(pageUrl)}" />
  ${prevUrl ? `<link rel="prev" href="${prevUrl}" />` : ""}
  ${nextUrl ? `<link rel="next" href="${nextUrl}" />` : ""}
  <link rel="stylesheet" href="/styles.css" />
</head>
<body data-page="directory">
  <header class="topbar">
    <div class="container topbar-inner">
      <a class="brand" href="/">
        <span class="brand-dot" aria-hidden="true"></span>
        WPPlugins
      </a>
      <nav class="nav-links" aria-label="Primary">
        <a href="/">Lookup</a>
        <a href="/plugins/">Directory</a>
        <a href="/#guides">Submodules</a>
        <a href="/llms.txt">llms.txt</a>
      </nav>
    </div>
  </header>

  <main class="container main-content">
    <section class="card card-elevated">
      <div class="section-head section-head-row">
        <div>
          <h1>Mirrored WordPress Plugin Directory</h1>
          <p class="muted">
            ${totalPlugins.toLocaleString()} plugins indexed · Page ${page} of ${totalPages}
          </p>
        </div>
        <a class="btn-link" href="/">Search &amp; Command Generator</a>
      </div>

      <div class="directory-list">
        ${listHtml}
      </div>

      <nav class="pagination" aria-label="Directory pagination">
        <div>
          ${
    prevUrl
      ? `<a class="btn-link" href="${prevUrl}">← Previous</a>`
      : `<span class="muted">Page 1</span>`
  }
        </div>
        <span class="muted">Page ${page} / ${totalPages}</span>
        <div>
          ${
    nextUrl
      ? `<a class="btn-link" href="${nextUrl}">Next →</a>`
      : `<span class="muted">End of directory</span>`
  }
        </div>
      </nav>
    </section>
  </main>

  <footer class="footer container">
    <p>
      <a href="/">WPPlugins Home</a>
      · <a href="/llms.txt">llms.txt</a>
      · <a href="/sitemap-index.xml">Sitemap</a>
    </p>
  </footer>
</body>
</html>
`;
}

export function buildSitemapXml(
  urls: ReadonlyArray<{ loc: string; lastmod: string; priority?: string }>,
): string {
  const entries = urls
    .map(
      (u) =>
        `  <url>
    <loc>${escapeHtml(u.loc)}</loc>
    <lastmod>${u.lastmod}</lastmod>${
          u.priority ? `\n    <priority>${u.priority}</priority>` : ""
        }
  </url>`,
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</urlset>
`;
}

export function buildSitemapIndexXml(
  sitemapUrls: ReadonlyArray<{ loc: string; lastmod: string }>,
): string {
  const entries = sitemapUrls
    .map(
      (s) =>
        `  <sitemap>
    <loc>${escapeHtml(s.loc)}</loc>
    <lastmod>${s.lastmod}</lastmod>
  </sitemap>`,
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</sitemapindex>
`;
}

export function buildRobotsTxt(baseUrl: string): string {
  return `# WPPlugins Mirror Directory
# AI Agent Instructions: ${baseUrl}/llms.txt

User-agent: *
Allow: /

Sitemap: ${baseUrl}/sitemap-index.xml
`;
}

async function writeTasksBatched(
  tasks: Array<{ path: string; content: string }>,
): Promise<void> {
  for (let i = 0; i < tasks.length; i += WRITE_BATCH_SIZE) {
    const slice = tasks.slice(i, i + WRITE_BATCH_SIZE);
    await Promise.all(
      slice.map(async (task) => {
        const dir = task.path.slice(0, task.path.lastIndexOf("/"));
        if (dir) await ensureDir(dir);
        await Deno.writeTextFile(task.path, task.content);
      }),
    );
  }
}

async function main(): Promise<void> {
  const args = parseArgs(Deno.args, {
    string: ["public-dir", "data-dir", "out", "base-url"],
    default: {
      "public-dir": "public",
      "data-dir": "data-out",
      out: "dist",
      "base-url": "https://wpplugins.github.io",
    },
  });

  const publicDir = String(args["public-dir"]);
  const dataDir = String(args["data-dir"]);
  const outDir = String(args.out);
  const baseUrl = String(args["base-url"]).replace(/\/+$/, "");

  await Deno.remove(outDir, { recursive: true }).catch(() => {});
  await ensureDir(outDir);
  await copy(publicDir, outDir, { overwrite: true });

  const distDataDir = join(outDir, "data");
  await ensureDir(distDataDir);

  let generatedAt = new Date().toISOString();
  let plugins: CompactPluginEntry[] = [];
  const pluginsSrc = join(dataDir, "plugins.json");
  const statsSrc = join(dataDir, "stats.json");

  if (await exists(pluginsSrc) && await exists(statsSrc)) {
    await copy(pluginsSrc, join(distDataDir, "plugins.json"), {
      overwrite: true,
    });
    await copy(statsSrc, join(distDataDir, "stats.json"), {
      overwrite: true,
    });
    plugins = JSON.parse(
      await Deno.readTextFile(pluginsSrc),
    ) as CompactPluginEntry[];
    const stats = JSON.parse(await Deno.readTextFile(statsSrc)) as {
      generated_at?: string;
    };
    if (stats.generated_at) {
      generatedAt = stats.generated_at;
    }
    console.log(
      `[site] Loaded ${plugins.length} plugins from prebuilt index (${dataDir}/).`,
    );
  } else {
    console.warn(
      `[site] No prebuilt index found in ${dataDir}/; writing empty fallback index.`,
    );
    await Deno.writeTextFile(join(distDataDir, "plugins.json"), "[]");
    await Deno.writeTextFile(
      join(distDataDir, "stats.json"),
      `${
        JSON.stringify(
          { total_plugins: 0, generated_at: generatedAt, org: "WPPlugins" },
          null,
          2,
        )
      }\n`,
    );
  }

  const lastmod = generatedAt.slice(0, 10);
  const writeTasks: Array<{ path: string; content: string }> = [];

  // 1. Paginated HTML directory (/plugins/ and /plugins/page/<n>/)
  const totalPages = Math.max(1, Math.ceil(plugins.length / PAGE_SIZE));
  const coreUrls: Array<{ loc: string; lastmod: string; priority?: string }> = [
    { loc: `${baseUrl}/`, lastmod, priority: "1.0" },
    { loc: `${baseUrl}/plugins/`, lastmod, priority: "0.9" },
    { loc: `${baseUrl}/llms.txt`, lastmod, priority: "0.8" },
    { loc: `${baseUrl}/llms-full.txt`, lastmod, priority: "0.7" },
    { loc: `${baseUrl}/openapi.json`, lastmod, priority: "0.7" },
  ];

  for (let page = 1; page <= totalPages; page++) {
    const slice = plugins.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    const dirRelPath = page === 1
      ? `${outDir}/plugins/index.html`
      : `${outDir}/plugins/page/${page}/index.html`;
    writeTasks.push({
      path: dirRelPath.replace(/\\/g, "/"),
      content: renderDirectoryPageHtml(
        slice,
        page,
        totalPages,
        plugins.length,
        baseUrl,
      ),
    });
    if (page > 1) {
      coreUrls.push({
        loc: `${baseUrl}/plugins/page/${page}/`,
        lastmod,
        priority: "0.6",
      });
    }
  }

  // 2. Per-plugin static SEO pages (/plugins/<slug>/index.html)
  const pluginUrls: Array<{ loc: string; lastmod: string }> = [];
  for (const plugin of plugins) {
    const slug = plugin.s;
    writeTasks.push({
      path: `${outDir}/plugins/${slug}/index.html`.replace(/\\/g, "/"),
      content: renderPluginPageHtml(plugin, baseUrl),
    });
    pluginUrls.push({
      loc: `${baseUrl}/plugins/${encodeURIComponent(slug)}/`,
      lastmod: plugin.p || lastmod,
    });
  }

  console.log(`[site] Writing ${writeTasks.length} static HTML pages...`);
  await writeTasksBatched(writeTasks);

  // 3. Sitemaps & robots.txt (split plugin sitemaps at 40k URLs per spec)
  const sitemapFiles: Array<{ loc: string; lastmod: string }> = [
    { loc: `${baseUrl}/sitemap.xml`, lastmod },
  ];
  await Deno.writeTextFile(
    join(outDir, "sitemap.xml"),
    buildSitemapXml(coreUrls),
  );

  const chunkSize = 40_000;
  for (
    let idx = 0, part = 1;
    idx < pluginUrls.length;
    idx += chunkSize, part++
  ) {
    const fileName = part === 1
      ? "sitemap-plugins.xml"
      : `sitemap-plugins-${part}.xml`;
    await Deno.writeTextFile(
      join(outDir, fileName),
      buildSitemapXml(pluginUrls.slice(idx, idx + chunkSize)),
    );
    sitemapFiles.push({ loc: `${baseUrl}/${fileName}`, lastmod });
  }

  await Deno.writeTextFile(
    join(outDir, "sitemap-index.xml"),
    buildSitemapIndexXml(sitemapFiles),
  );
  await Deno.writeTextFile(
    join(outDir, "robots.txt"),
    buildRobotsTxt(baseUrl),
  );

  console.log(
    `[site] Assembled static website in ${outDir}/ (${plugins.length} plugin pages, ${totalPages} directory pages).`,
  );
}

if (import.meta.main) {
  await main();
}
