(() => {
  const OS_STORAGE_KEY = "wpplugins_os_preference";

  const searchInput = document.getElementById("search-input");
  const resultsList = document.getElementById("results-list");
  const statsBar = document.getElementById("stats-bar");
  const osDetectedBadge = document.getElementById("os-detected-badge");
  const osTabs = Array.from(document.querySelectorAll(".os-tab"));

  const selectedTitle = document.getElementById("selected-title");
  const selectedBranch = document.getElementById("selected-branch");
  const selectedDesc = document.getElementById("selected-desc");
  const linkGithub = document.getElementById("link-github");
  const linkWporg = document.getElementById("link-wporg");

  const cmdClone = document.getElementById("cmd-clone");
  const cmdSubmodule = document.getElementById("cmd-submodule");
  const cmdTag = document.getElementById("cmd-tag");
  const cmdUpdate = document.getElementById("cmd-update");
  const cmdComposer = document.getElementById("cmd-composer");

  const guideAdd = document.getElementById("guide-add");
  const guideClone = document.getElementById("guide-clone");
  const guidePin = document.getElementById("guide-pin");
  const guideInstall = document.getElementById("guide-install");
  const guideOsLabels = Array.from(
    document.querySelectorAll(".guide-os-label"),
  );

  let plugins = [];
  let currentSlug = "akismet";
  let currentBranch = "main";
  let currentOs = "linux";

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

  function buildPlatformCommands(slug, _branch, os) {
    const repoUrl = `https://github.com/WPPlugins/${slug}.git`;

    if (os === "windows") {
      return {
        label: "PowerShell",
        clone: `git clone ${repoUrl}`,
        submodule: `git submodule add ${repoUrl} wp-content/plugins/${slug}\n` +
          `git commit -m "chore: add ${slug} plugin submodule"`,
        tag: `Push-Location wp-content\\plugins\\${slug}\n` +
          `git fetch --tags; if ($?) { $tag = git describe --tags --abbrev=0; git checkout $tag }\n` +
          `Pop-Location`,
        update:
          `git submodule update --remote --merge wp-content/plugins/${slug}`,
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
        clone: `git clone ${repoUrl}`,
        submodule:
          `git submodule add ${repoUrl} wp-content/plugins/${slug} && \\\n` +
          `  git commit -m "chore: add ${slug} plugin submodule"`,
        tag:
          `(cd wp-content/plugins/${slug} && git fetch --tags && git checkout "$(git describe --tags --abbrev=0)")`,
        update:
          `git submodule update --remote --merge wp-content/plugins/${slug}`,
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

    // Linux (bash)
    return {
      label: "Linux (bash)",
      clone: `git clone ${repoUrl}`,
      submodule:
        `git submodule add ${repoUrl} wp-content/plugins/${slug} && \\\n` +
        `  git commit -m "chore: add ${slug} plugin submodule"`,
      tag:
        `(cd wp-content/plugins/${slug} && git fetch --tags && git checkout "$(git describe --tags --abbrev=0)")`,
      update:
        `git submodule update --remote --merge wp-content/plugins/${slug}`,
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
    const cmds = buildPlatformCommands(currentSlug, currentBranch, currentOs);
    cmdClone.textContent = cmds.clone;
    cmdSubmodule.textContent = cmds.submodule;
    cmdTag.textContent = cmds.tag;
    cmdUpdate.textContent = cmds.update;
    cmdComposer.textContent = JSON.stringify(
      { type: "vcs", url: `https://github.com/WPPlugins/${currentSlug}.git` },
      null,
      2,
    );

    guideAdd.textContent = cmds.guideAdd;
    guideClone.textContent = cmds.guideClone;
    guidePin.textContent = cmds.guidePin;
    guideInstall.textContent = cmds.guideInstall;

    guideOsLabels.forEach((el, idx) => {
      el.textContent = idx === 3 ? `Install Git · ${cmds.label}` : cmds.label;
    });
  }

  function setActiveOs(os, source = "manual") {
    currentOs = os;
    osTabs.forEach((tab) => {
      const selected = tab.getAttribute("data-os") === os;
      tab.setAttribute("aria-selected", selected ? "true" : "false");
    });

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

    renderCommands();
  }

  function selectPlugin(slug, description, branch = "main") {
    const cleanSlug = slug.trim().toLowerCase().replace(/[^a-z0-9._-]/g, "");
    if (!cleanSlug) return;

    currentSlug = cleanSlug;
    currentBranch = branch || "main";

    selectedTitle.textContent = cleanSlug;
    selectedBranch.textContent = currentBranch;
    selectedDesc.textContent = description ||
      `WordPress.org mirror repository for ${cleanSlug}`;
    linkGithub.href = `https://github.com/WPPlugins/${cleanSlug}`;
    linkWporg.href = `https://wordpress.org/plugins/${cleanSlug}/`;

    renderCommands();

    const url = new URL(globalThis.location.href);
    url.searchParams.set("plugin", cleanSlug);
    globalThis.history.replaceState({}, "", url);
  }

  function renderResults(query) {
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

  searchInput.addEventListener("input", (e) => {
    const val = e.target.value;
    renderResults(val);
    if (val.trim()) {
      selectPlugin(val.trim(), "");
    }
  });

  async function init() {
    const detected = detectOs();
    setActiveOs(detected.os, detected.source);

    try {
      const [statsRes, pluginsRes] = await Promise.all([
        fetch("./data/stats.json"),
        fetch("./data/plugins.json"),
      ]);
      if (statsRes.ok) {
        const stats = await statsRes.json();
        statsBar.textContent =
          `${stats.total_plugins.toLocaleString()} mirrored plugins`;
      }
      if (pluginsRes.ok) {
        plugins = await pluginsRes.json();
      }
    } catch {
      statsBar.textContent = "17,900+ mirrored plugins";
    }

    const initialSlug = new URLSearchParams(globalThis.location.search).get(
      "plugin",
    );
    if (initialSlug) {
      searchInput.value = initialSlug;
      const found = plugins.find((p) => p.s === initialSlug.toLowerCase());
      selectPlugin(initialSlug, found ? found.d : "", found ? found.b : "main");
      renderResults(initialSlug);
    }
  }

  init();
})();
