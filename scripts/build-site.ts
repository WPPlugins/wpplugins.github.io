import { parseArgs } from "@std/cli";
import { copy, ensureDir } from "@std/fs";
import { join } from "@std/path";

export interface GitHubRepoSummary {
  name: string;
  description: string | null;
  pushed_at: string;
  default_branch: string;
}

/** Compact tuple-like record to minimize JSON payload size for ~18k+ plugins. */
export interface CompactPluginEntry {
  /** Slug / repo name */
  s: string;
  /** Short description */
  d: string;
  /** Last pushed ISO timestamp (date prefix or full ISO) */
  p: string;
  /** Default branch (main or master) */
  b: string;
}

const EXCLUDED_REPOS = new Set([
  ".github",
  "mirror-orchestrator",
  "wpplugins.github.io",
]);

const GITHUB_API = "https://api.github.com";

export function filterAndCompactRepos(
  repos: ReadonlyArray<GitHubRepoSummary>,
): CompactPluginEntry[] {
  return repos
    .filter((r) => Boolean(r.name) && !EXCLUDED_REPOS.has(r.name))
    .map((r) => ({
      s: r.name,
      d: (r.description ?? "").slice(0, 200),
      p: r.pushed_at ? r.pushed_at.slice(0, 10) : "",
      b: r.default_branch || "main",
    }))
    .sort((a, b) => a.s.localeCompare(b.s));
}

export function buildSitemapXml(
  baseUrl: string,
  generatedAtIso: string,
): string {
  const lastmod = generatedAtIso.slice(0, 10);
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>hourly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
`;
}

export function buildRobotsTxt(baseUrl: string): string {
  return `User-agent: *
Allow: /

Sitemap: ${baseUrl}/sitemap.xml
`;
}

async function fetchPageWithRetry(
  org: string,
  page: number,
  headers: Record<string, string>,
): Promise<GitHubRepoSummary[]> {
  const url = `${GITHUB_API}/orgs/${
    encodeURIComponent(org)
  }/repos?type=public&per_page=100&page=${page}`;

  for (let attempt = 0; attempt < 4; attempt++) {
    const resp = await fetch(url, { headers });
    if (resp.ok) {
      return (await resp.json()) as GitHubRepoSummary[];
    }
    if (resp.status === 403 || resp.status === 429 || resp.status >= 500) {
      const waitMs = 1000 * 2 ** attempt;
      console.warn(
        `[build] HTTP ${resp.status} on page ${page}; retrying in ${waitMs}ms...`,
      );
      await new Promise((r) => setTimeout(r, waitMs));
      continue;
    }
    throw new Error(`GitHub API failed (${resp.status}): ${await resp.text()}`);
  }

  throw new Error(`Failed to fetch page ${page} after retries.`);
}

async function fetchOrgRepos(
  org: string,
  maxPages = 0,
): Promise<GitHubRepoSummary[]> {
  const token = Deno.env.get("GITHUB_TOKEN")?.trim();
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "WPPlugins-Pages-Builder/1.0",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const all: GitHubRepoSummary[] = [];
  const batchSize = 6;

  for (let startPage = 1; ; startPage += batchSize) {
    const pages: number[] = [];
    for (let i = 0; i < batchSize; i++) {
      const p = startPage + i;
      if (maxPages > 0 && p > maxPages) break;
      pages.push(p);
    }
    if (pages.length === 0) break;

    const batches = await Promise.all(
      pages.map((p) => fetchPageWithRetry(org, p, headers)),
    );

    let reachedEnd = false;
    for (const batch of batches) {
      all.push(...batch);
      if (batch.length < 100) {
        reachedEnd = true;
      }
    }

    console.log(`[build] Fetched ${all.length} repos (up to page ${pages[pages.length - 1]})...`);
    if (reachedEnd) break;
  }

  return all;
}

async function main(): Promise<void> {
  const args = parseArgs(Deno.args, {
    string: ["limit", "org", "out", "base-url"],
    default: {
      limit: "0",
      org: "WPPlugins",
      out: "dist",
      "base-url": "https://wpplugins.github.io",
    },
  });

  const maxPages = Math.max(0, Number.parseInt(String(args.limit), 10) || 0);
  const org = String(args.org);
  const outDir = String(args.out);
  const baseUrl = String(args["base-url"]).replace(/\/+$/, "");

  console.log(`[build] Fetching public repos for ${org} (maxPages=${maxPages || "all"})...`);
  const rawRepos = await fetchOrgRepos(org, maxPages);
  const plugins = filterAndCompactRepos(rawRepos);
  const generatedAt = new Date().toISOString();

  await Deno.remove(outDir, { recursive: true }).catch(() => {});
  await ensureDir(outDir);
  await copy("public", outDir, { overwrite: true });

  const dataDir = join(outDir, "data");
  await ensureDir(dataDir);

  await Deno.writeTextFile(
    join(dataDir, "plugins.json"),
    JSON.stringify(plugins),
  );
  await Deno.writeTextFile(
    join(dataDir, "stats.json"),
    `${
      JSON.stringify(
        {
          total_plugins: plugins.length,
          generated_at: generatedAt,
          org,
        },
        null,
        2,
      )
    }\n`,
  );
  await Deno.writeTextFile(
    join(outDir, "sitemap.xml"),
    buildSitemapXml(baseUrl, generatedAt),
  );
  await Deno.writeTextFile(
    join(outDir, "robots.txt"),
    buildRobotsTxt(baseUrl),
  );

  console.log(
    `[build] Built ${outDir}/ with ${plugins.length} plugins at ${generatedAt}.`,
  );
}

if (import.meta.main) {
  await main();
}
