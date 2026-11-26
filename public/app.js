(() => {
  const OS_STORAGE_KEY = "wpplugins_os_preference";

  const pageMode = document.body.dataset.page || "home";
  const initialDataSlug = document.body.dataset.slug || "";
  const initialDataBranch = document.body.dataset.branch || "main";

  const searchInput = document.getElementById("search-input");
  const resultsList = document.getElementById("results-list");
  const statsBar = document.getElementById("stats-bar");
  const osDetectedBadge = document.getElementById("os-detected-badge");
  const osTabs = Array.from(document.querySelectorAll(".os-tab"));

  const selectedTitle = document.getElementById("selected-title");
  const selectedBranch = document.getElementById("selected-branch");
  const selectedDesc = document.getElementById("selected-desc");
  const linkPermalink = document.getElementById("link-permalink");
  const linkGithub = document.getElementById("link-github");
  const linkWporg = document.getElementById("link-wporg");

  const cmdClone = document.getElementById("cmd-clone");
  const cmdSubmodule = document.getElementById("cmd-submodule");
  const cmdTag = document.getElementById("cmd-tag");
  const cmdUpdate = document.getElementById("cmd-update");
  const cmdComposer = document.getElementById("cmd-composer");
  const versionSelect = document.getElementById("version-select");
  const versionStatus = document.getElementById("version-status");

  const guideAdd = document.getElementById("guide-add");
  const guideClone = document.getElementById("guide-clone");
  const guidePin = document.getElementById("guide-pin");
  const guideInstall = document.getElementById("guide-install");
  const guideOsLabels = Array.from(
    document.querySelectorAll(".guide-os-label"),
  );

  let plugins = [];
  let currentSlug = initialDataSlug || "akismet";
  let currentBranch = initialDataBranch || "main";
  let currentVersion = "";
  let currentOs = "linux";
  const tagCache = new Map();

  /** Detect OS from modern User-Agent Client Hints or fallback navigator strings. */
  function detectOs() {
    const saved = localStorage.getItem(OS_STORAGE_KEY);
    if (saved === "windows" || saved === "macos" || saved === "linux") {
      return { os: saved, source: "saved" };
    }

    const uadPlatform = navigator.userAgentData?.platform?.toLowerCase() || "";
    const platform = (navigator.platform || "").toLowerCase();
    const ua = (navigator.userAgent || "").toLowerCase();
    const hint = `${uadPlatform} ${platform} ${ua}`;

    if (hint.includes("win")) {
      return { os: "windows", source: "auto" };
    }
    if (hint.includes("mac") || hint.includes("darwin")) {
      return { os: "macos", source: "auto" };
    }
    return { os: "linux", source: "auto" };
  }

  function buildPlatformCommands(slug, _branch, os, version) {
    const repoUrl = `https://github.com/WPPlugins/${slug}.git`;
    const ver = (version || "").trim();

    if (os === "windows") {
      return {
        label: "PowerShell",
        clone: ver
          ? `git clone --branch ${ver} --depth 1 ${repoUrl}`
          : `git clone ${repoUrl}`,
        submodule: ver
          ? `git submodule add ${repoUrl} wp-content/plugins/${slug}\n` +
            `Push-Location wp-content\\plugins\\${slug}; git checkout ${ver}; Pop-Location\n` +
            `git add wp-content/plugins/${slug}; git commit -m "chore: add ${slug} (${ver}) submodule"`
          : `git submodule add ${repoUrl} wp-content/plugins/${slug}\n` +
            `git commit -m "chore: add ${slug} plugin submodule"`,
        tag: ver
          ? `Push-Location wp-content\\plugins\\${slug}\n` +
            `git fetch --tags; git checkout ${ver}\n` +
            `Pop-Location`
          : `Push-Location wp-content\\plugins\\${slug}\n` +
            `git fetch --tags; if ($?) { $tag = git describe --tags --abbrev=0; git checkout $tag }\n` +
            `Pop-Location`,
        update: ver
          ? `Push-Location wp-content\\plugins\\${slug}; git fetch --tags; git checkout ${ver}; Pop-Location\n` +
            `git add wp-content/plugins/${slug}; git commit -m "chore: update ${slug} to ${ver}"`
          : `git submodule update --remote --merge wp-content/plugins/${slug}`,
        guideAdd: `# From your WordPress project root (PowerShell):\n` +
          `git submodule add https://github.com/WPPlugins/<slug>.git wp-content/plugins/<slug>\n` +
          `git commit -m "chore: add <slug> plugin submodule"`,
        guideClone: `git clone --recurse-submodules <your-project-repo-url>\n` +
          `# Or if already cloned:\n` +
          `git submodule update --init --recursive`,
        guidePin: `Push-Location wp-content\\plugins\\<slug>\n` +
          `git fetch --tags; git checkout 1.2.3\n` +
          `Pop-Location\n` +
          `git add wp-content/plugins/<slug>; git commit -m "chore: bump <slug> to 1.2.3"`,
        guideInstall: `# Windows (winget):\n` +
          `winget install --id Git.Git -e --source winget`,
      };
    }

    if (os === "macos") {
      return {
        label: "macOS (zsh)",
        clone: ver
          ? `git clone --branch ${ver} --depth 1 ${repoUrl}`
          : `git clone ${repoUrl}`,
        submodule: ver
          ? `git submodule add ${repoUrl} wp-content/plugins/${slug} && \\\n` +
            `  (cd wp-content/plugins/${slug} && git checkout ${ver}) && \\\n` +
            `  git add wp-content/plugins/${slug} && git commit -m "chore: add ${slug} (${ver}) submodule"`
          : `git submodule add ${repoUrl} wp-content/plugins/${slug} && \\\n` +
            `  git commit -m "chore: add ${slug} plugin submodule"`,
        tag: ver
          ? `(cd wp-content/plugins/${slug} && git fetch --tags && git checkout ${ver})`
          : `(cd wp-content/plugins/${slug} && git fetch --tags && git checkout "$(git describe --tags --abbrev=0)")`,
        update: ver
          ? `(cd wp-content/plugins/${slug} && git fetch --tags && git checkout ${ver}) && \\\n` +
            `  git add wp-content/plugins/${slug} && git commit -m "chore: update ${slug} to ${ver}"`
          : `git submodule update --remote --merge wp-content/plugins/${slug}`,
        guideAdd: `# From your WordPress project root (zsh/bash):\n` +
          `git submodule add https://github.com/WPPlugins/<slug>.git wp-content/plugins/<slug> && \\\n` +
          `  git commit -m "chore: add <slug> plugin submodule"`,
        guideClone: `git clone --recurse-submodules <your-project-repo-url>\n` +
          `# Or if already cloned:\n` +
          `git submodule update --init --recursive`,
        guidePin:
          `(cd wp-content/plugins/<slug> && git fetch --tags && git checkout 1.2.3) && \\\n` +
          `  git add wp-content/plugins/<slug> && \\\n` +
          `  git commit -m "chore: bump <slug> to 1.2.3"`,
        guideInstall: `# macOS (Xcode CLT or Homebrew):\n` +
          `xcode-select --install\n` +
          `# or: brew install git`,
      };
    }

    return {
      label: "Linux (bash)",
      clone: ver
        ? `git clone --branch ${ver} --depth 1 ${repoUrl}`
        : `git clone ${repoUrl}`,
      submodule: ver
        ? `git submodule add ${repoUrl} wp-content/plugins/${slug} && \\\n` +
          `  (cd wp-content/plugins/${slug} && git checkout ${ver}) && \\\n` +
          `  git add wp-content/plugins/${slug} && git commit -m "chore: add ${slug} (${ver}) submodule"`
        : `git submodule add ${repoUrl} wp-content/plugins/${slug} && \\\n` +
          `  git commit -m "chore: add ${slug} plugin submodule"`,
      tag: ver
        ? `(cd wp-content/plugins/${slug} && git fetch --tags && git checkout ${ver})`
        : `(cd wp-content/plugins/${slug} && git fetch --tags && git checkout "$(git describe --tags --abbrev=0)")`,
      update: ver
        ? `(cd wp-content/plugins/${slug} && git fetch --tags && git checkout ${ver}) && \\\n` +
          `  git add wp-content/plugins/${slug} && git commit -m "chore: update ${slug} to ${ver}"`
        : `git submodule update --remote --merge wp-content/plugins/${slug}`,
      guideAdd: `# From your WordPress project root (bash):\n` +
        `git submodule add https://github.com/WPPlugins/<slug>.git wp-content/plugins/<slug> && \\\n` +
        `  git commit -m "chore: add <slug> plugin submodule"`,
      guideClone: `git clone --recurse-submodules <your-project-repo-url>\n` +
        `# Or if already cloned:\n` +
        `git submodule update --init --recursive`,
      guidePin:
        `(cd wp-content/plugins/<slug> && git fetch --tags && git checkout 1.2.3) && \\\n` +
        `  git add wp-content/plugins/<slug> && \\\n` +
        `  git commit -m "chore: bump <slug> to 1.2.3"`,
      guideInstall: `# Debian/Ubuntu:\n` +
        `sudo apt-get update && sudo apt-get install -y git\n` +
        `# Fedora/RHEL:\n` +
        `sudo dnf install -y git`,
    };
  }

  function renderCommands() {
    const cmds = buildPlatformCommands(
      currentSlug,
      currentBranch,
      currentOs,
      currentVersion,
    );
    if (cmdClone) cmdClone.textContent = cmds.clone;
    if (cmdSubmodule) cmdSubmodule.textContent = cmds.submodule;
    if (cmdTag) cmdTag.textContent = cmds.tag;
    if (cmdUpdate) cmdUpdate.textContent = cmds.update;
    if (cmdComposer) {
      const ref = currentVersion || currentBranch;
      const pkgVersion = currentVersion || `dev-${currentBranch}`;
      cmdComposer.textContent = JSON.stringify(
        {
          type: "package",
          package: {
            name: `wpplugins/${currentSlug}`,
            version: pkgVersion,
            type: "wordpress-plugin",
            source: {
              url: `https://github.com/WPPlugins/${currentSlug}.git`,
              type: "git",
              reference: ref,
            },
            require: {
              "composer/installers": "^2.0",
            },
          },
        },
        null,
        2,
      );
    }

    if (guideAdd) guideAdd.textContent = cmds.guideAdd;
    if (guideClone) guideClone.textContent = cmds.guideClone;
    if (guidePin) guidePin.textContent = cmds.guidePin;
    if (guideInstall) guideInstall.textContent = cmds.guideInstall;

    guideOsLabels.forEach((el) => {
      const kind = el.getAttribute("data-guide-kind");
      el.textContent = kind === "install"
        ? `Install Git · ${cmds.label}`
        : cmds.label;
    });
  }

  function populateVersionSelect(tags, preferredVersion = "") {
    if (!versionSelect) return;
    versionSelect.innerHTML = "";

    const defaultOpt = document.createElement("option");
    defaultOpt.value = "";
    defaultOpt.textContent = `Latest (${currentBranch})`;
    versionSelect.appendChild(defaultOpt);

    for (const tag of tags) {
      const opt = document.createElement("option");
      opt.value = tag;
      opt.textContent = tag;
      versionSelect.appendChild(opt);
    }

    if (preferredVersion && tags.includes(preferredVersion)) {
      currentVersion = preferredVersion;
      versionSelect.value = preferredVersion;
    } else {
      currentVersion = "";
      versionSelect.value = "";
    }
    renderCommands();
  }

  async function loadTagsForSlug(slug, preferredVersion = "") {
    if (!versionSelect) return;

    if (tagCache.has(slug)) {
      const cached = tagCache.get(slug);
      populateVersionSelect(cached, preferredVersion);
      if (versionStatus) {
        versionStatus.textContent = cached.length > 0
          ? `${cached.length} release tags`
          : "No release tags found (trunk only)";
      }
      return;
    }

    if (versionStatus) versionStatus.textContent = "Loading tags…";
    populateVersionSelect([], "");

    try {
      const resp = await fetch(
        `https://api.github.com/repos/WPPlugins/${
          encodeURIComponent(slug)
        }/tags?per_page=100`,
        { headers: { Accept: "application/vnd.github+json" } },
      );
      if (!resp.ok) {
        if (versionStatus) {
          versionStatus.textContent = resp.status === 403
            ? "GitHub API rate limit reached; using latest branch"
            : "Tags unavailable; using latest branch";
        }
        return;
      }
      const data = await resp.json();
      const tags = Array.isArray(data)
        ? data.map((t) => t.name).filter(Boolean)
        : [];
      tagCache.set(slug, tags);
      if (currentSlug === slug) {
        populateVersionSelect(tags, preferredVersion);
        if (versionStatus) {
          versionStatus.textContent = tags.length > 0
            ? `${tags.length} release tags`
            : "No release tags found (trunk only)";
        }
      }
    } catch {
      if (versionStatus) versionStatus.textContent = "Using latest branch";
    }
  }

  function setActiveOs(os, source = "manual") {
    currentOs = os;
    osTabs.forEach((tab) => {
      const selected = tab.getAttribute("data-os") === os;
      tab.setAttribute("aria-selected", selected ? "true" : "false");
    });

    if (osDetectedBadge) {
      if (source === "auto") {
        osDetectedBadge.textContent = "auto-detected";
        osDetectedBadge.hidden = false;
      } else if (source === "saved") {
        osDetectedBadge.textContent = "saved";
        osDetectedBadge.hidden = false;
      } else {
        osDetectedBadge.hidden = true;
        localStorage.setItem(OS_STORAGE_KEY, os);
      }
    }

    renderCommands();
  }

  let tagFetchTimer = 0;

  function selectPlugin(
    slug,
    description,
    branch = "main",
    updateUrl = true,
    preferredVersion = "",
    debounceTags = false,
  ) {
    const cleanSlug = slug.trim().toLowerCase().replace(/[^a-z0-9._-]/g, "");
    if (!cleanSlug) return;

    const slugChanged = currentSlug !== cleanSlug;
    currentSlug = cleanSlug;
    currentBranch = branch || "main";
    if (slugChanged) {
      currentVersion = preferredVersion || "";
    }

    if (selectedTitle) selectedTitle.textContent = cleanSlug;
    if (selectedBranch) selectedBranch.textContent = currentBranch;
    if (selectedDesc && description !== undefined) {
      selectedDesc.textContent = description ||
        `WordPress.org mirror repository for ${cleanSlug}`;
    }
    if (linkPermalink) linkPermalink.href = `/plugins/${cleanSlug}/`;
    if (linkGithub) {
      linkGithub.href = `https://github.com/WPPlugins/${cleanSlug}`;
    }
    if (linkWporg) {
      linkWporg.href = `https://wordpress.org/plugins/${cleanSlug}/`;
    }

    renderCommands();

    if (updateUrl && pageMode === "home") {
      const url = new URL(globalThis.location.href);
      url.searchParams.set("plugin", cleanSlug);
      if (currentVersion) {
        url.searchParams.set("version", currentVersion);
      } else {
        url.searchParams.delete("version");
      }
      globalThis.history.replaceState({}, "", url);
    }

    clearTimeout(tagFetchTimer);
    if (debounceTags) {
      tagFetchTimer = setTimeout(() => {
        loadTagsForSlug(cleanSlug, preferredVersion);
      }, 350);
    } else {
      loadTagsForSlug(cleanSlug, preferredVersion);
    }
  }

  function renderResults(query) {
    if (!resultsList) return;
    resultsList.innerHTML = "";
    const q = query.trim().toLowerCase();
    if (!q) return;

    const matches = [];
    for (const item of plugins) {
      if (
        item.s.includes(q) ||
        (item.d && item.d.toLowerCase().includes(q))
      ) {
        matches.push(item);
        if (matches.length >= 10) break;
      }
    }

    if (matches.length === 0) {
      const li = document.createElement("li");
      li.className = "result-item";
      const slugSpan = document.createElement("span");
      slugSpan.className = "result-slug";
      slugSpan.textContent = q;
      const descSpan = document.createElement("span");
      descSpan.className = "result-desc";
      descSpan.textContent = "Generate commands for this slug";
      li.appendChild(slugSpan);
      li.appendChild(descSpan);
      li.addEventListener("click", () => selectPlugin(q, ""));
      resultsList.appendChild(li);
      return;
    }

    for (const item of matches) {
      const li = document.createElement("li");
      li.className = "result-item";
      const slugSpan = document.createElement("span");
      slugSpan.className = "result-slug";
      slugSpan.textContent = item.s;

      const descSpan = document.createElement("span");
      descSpan.className = "result-desc";
      descSpan.textContent = item.d || `Updated ${item.p}`;

      li.appendChild(slugSpan);
      li.appendChild(descSpan);
      li.addEventListener("click", () => selectPlugin(item.s, item.d, item.b));
      resultsList.appendChild(li);
    }
  }

  function resolveFallbackSlugFromPath() {
    const parts = globalThis.location.pathname
      .split("/")
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts[0] === "plugins" && parts[1] && parts[1] !== "page") {
      return parts[1];
    }
    if (parts.length === 1 && !parts[0].includes(".")) {
      return parts[0];
    }
    return "akismet";
  }

  osTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const os = tab.getAttribute("data-os");
      if (os) setActiveOs(os, "manual");
    });
  });

  document.querySelectorAll(".copy-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const targetId = btn.getAttribute("data-target");
      const el = targetId ? document.getElementById(targetId) : null;
      if (!el) return;
      await navigator.clipboard.writeText(el.textContent || "");
      const prev = btn.textContent;
      btn.textContent = "Copied!";
      setTimeout(() => {
        btn.textContent = prev;
      }, 1500);
    });
  });

  if (versionSelect) {
    versionSelect.addEventListener("change", () => {
      currentVersion = versionSelect.value;
      renderCommands();
      const url = new URL(globalThis.location.href);
      if (currentVersion) {
        url.searchParams.set("version", currentVersion);
      } else {
        url.searchParams.delete("version");
      }
      globalThis.history.replaceState({}, "", url);
    });
  }

  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      const val = e.target.value;
      renderResults(val);
      if (val.trim()) {
        selectPlugin(val.trim(), "", "main", true, "", true);
      }
    });
  }

  async function init() {
    const detected = detectOs();
    setActiveOs(detected.os, detected.source);
    const params = new URLSearchParams(globalThis.location.search);
    const initialVersion = params.get("version") || "";

    if (pageMode === "plugin" && initialDataSlug) {
      selectPlugin(
        initialDataSlug,
        undefined,
        initialDataBranch,
        false,
        initialVersion,
      );
      return;
    }

    try {
      const requests = [fetch("/data/stats.json")];
      if (pageMode === "home" || pageMode === "fallback") {
        requests.push(fetch("/data/plugins.json"));
      }
      const [statsRes, pluginsRes] = await Promise.all(requests);
      if (statsRes && statsRes.ok && statsBar) {
        const stats = await statsRes.json();
        statsBar.textContent =
          `${stats.total_plugins.toLocaleString()} mirrored plugins`;
      }
      if (pluginsRes && pluginsRes.ok) {
        plugins = await pluginsRes.json();
      }
    } catch {
      if (statsBar) statsBar.textContent = "17,900+ mirrored plugins";
    }

    if (pageMode === "fallback") {
      const slug = resolveFallbackSlugFromPath();
      const found = plugins.find((p) => p.s === slug.toLowerCase());
      const heading = document.getElementById("fallback-heading");
      if (heading) heading.textContent = `${slug} — Mirror Commands`;
      selectPlugin(
        slug,
        found ? found.d : `Mirror commands for ${slug}`,
        found ? found.b : "main",
        false,
        initialVersion,
      );
      return;
    }

    const initialSlug = params.get("plugin");
    if (initialSlug && searchInput) {
      searchInput.value = initialSlug;
      const found = plugins.find((p) => p.s === initialSlug.toLowerCase());
      selectPlugin(
        initialSlug,
        found ? found.d : "",
        found ? found.b : "main",
        true,
        initialVersion,
      );
      renderResults(initialSlug);
    } else if (pageMode === "home") {
      loadTagsForSlug(currentSlug, initialVersion);
    }
  }

  init();
})();
