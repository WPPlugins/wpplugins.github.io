import { assertEquals, assertStringIncludes } from "@std/assert";
import { filterAndCompactRepos } from "../scripts/build-index.ts";
import {
  buildRobotsTxt,
  buildSitemapIndexXml,
  buildSitemapXml,
  renderDirectoryPageHtml,
  renderPluginPageHtml,
} from "../scripts/build-site.ts";

Deno.test("filterAndCompactRepos excludes infra repos and sorts by slug", () => {
  const result = filterAndCompactRepos([
    {
      name: "woocommerce",
      description: "An open-source eCommerce platform.",
      pushed_at: "2026-11-26T04:00:00Z",
      default_branch: "main",
    },
    {
      name: ".github",
      description: "Org profile",
      pushed_at: "2026-11-26T04:00:00Z",
      default_branch: "main",
    },
    {
      name: "mirror-orchestrator",
      description: "Orchestrator",
      pushed_at: "2026-11-26T04:00:00Z",
      default_branch: "main",
    },
    {
      name: "akismet",
      description: null,
      pushed_at: "2026-11-25T12:00:00Z",
      default_branch: "main",
    },
  ]);

  assertEquals(result.length, 2);
  assertEquals(result[0], {
    s: "akismet",
    d: "",
    p: "2026-11-25",
    b: "main",
  });
  assertEquals(result[1].s, "woocommerce");
});

Deno.test("renderPluginPageHtml emits canonical URL, escaped meta, and JSON-LD", () => {
  const html = renderPluginPageHtml(
    {
      s: "akismet",
      d: 'Anti-spam <plugin> & "protector"',
      p: "2026-11-26",
      b: "main",
    },
    "https://wpplugins.github.io",
  );

  assertStringIncludes(
    html,
    '<link rel="canonical" href="https://wpplugins.github.io/plugins/akismet/" />',
  );
  assertStringIncludes(
    html,
    "Anti-spam &lt;plugin&gt; &amp; &quot;protector&quot;",
  );
  assertStringIncludes(html, '"@type":"SoftwareSourceCode"');
  assertStringIncludes(html, 'data-slug="akismet"');
});

Deno.test("renderDirectoryPageHtml generates paginated directory links", () => {
  const html = renderDirectoryPageHtml(
    [{ s: "akismet", d: "Spam protection", p: "2026-11-26", b: "main" }],
    2,
    5,
    450,
    "https://wpplugins.github.io",
  );

  assertStringIncludes(html, '<link rel="prev" href="/plugins/" />');
  assertStringIncludes(html, '<link rel="next" href="/plugins/page/3/" />');
  assertStringIncludes(html, 'href="/plugins/akismet/"');
});

Deno.test("sitemaps and robots.txt reference sitemap-index and llms.txt", () => {
  const sitemap = buildSitemapXml([
    { loc: "https://wpplugins.github.io/", lastmod: "2026-11-26" },
  ]);
  assertStringIncludes(sitemap, "<loc>https://wpplugins.github.io/</loc>");

  const index = buildSitemapIndexXml([
    { loc: "https://wpplugins.github.io/sitemap.xml", lastmod: "2026-11-26" },
  ]);
  assertStringIncludes(
    index,
    "<loc>https://wpplugins.github.io/sitemap.xml</loc>",
  );

  const robots = buildRobotsTxt("https://wpplugins.github.io");
  assertStringIncludes(
    robots,
    "Sitemap: https://wpplugins.github.io/sitemap-index.xml",
  );
  assertStringIncludes(robots, "llms.txt");
});
