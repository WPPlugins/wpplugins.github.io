import { parseArgs } from "@std/cli";
import { copy, ensureDir, exists } from "@std/fs";
import { join } from "@std/path";

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
  const pluginsSrc = join(dataDir, "plugins.json");
  const statsSrc = join(dataDir, "stats.json");

  if (await exists(pluginsSrc) && await exists(statsSrc)) {
    await copy(pluginsSrc, join(distDataDir, "plugins.json"), {
      overwrite: true,
    });
    await copy(statsSrc, join(distDataDir, "stats.json"), {
      overwrite: true,
    });
    const stats = JSON.parse(await Deno.readTextFile(statsSrc)) as {
      generated_at?: string;
    };
    if (stats.generated_at) {
      generatedAt = stats.generated_at;
    }
    console.log(`[site] Attached prebuilt index from ${dataDir}/.`);
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

  await Deno.writeTextFile(
    join(outDir, "sitemap.xml"),
    buildSitemapXml(baseUrl, generatedAt),
  );
  await Deno.writeTextFile(
    join(outDir, "robots.txt"),
    buildRobotsTxt(baseUrl),
  );

  console.log(`[site] Assembled static website in ${outDir}/.`);
}

if (import.meta.main) {
  await main();
}
