import { assertEquals, assertStringIncludes } from "@std/assert";
import { filterAndCompactRepos } from "../scripts/build-index.ts";
import { buildRobotsTxt, buildSitemapXml } from "../scripts/build-site.ts";

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

Deno.test("buildSitemapXml and buildRobotsTxt generate valid SEO files", () => {
  const sitemap = buildSitemapXml(
    "https://wpplugins.github.io",
    "2026-11-26T05:00:00Z",
  );
  assertStringIncludes(sitemap, "<loc>https://wpplugins.github.io/</loc>");
  assertStringIncludes(sitemap, "<lastmod>2026-11-26</lastmod>");

  const robots = buildRobotsTxt("https://wpplugins.github.io");
  assertStringIncludes(
    robots,
    "Sitemap: https://wpplugins.github.io/sitemap.xml",
  );
});
