(() => {
  const searchInput = document.getElementById("search-input");
  const resultsList = document.getElementById("results-list");
  const statsBar = document.getElementById("stats-bar");

  const selectedTitle = document.getElementById("selected-title");
  const selectedDesc = document.getElementById("selected-desc");
  const linkGithub = document.getElementById("link-github");
  const linkWporg = document.getElementById("link-wporg");

  const cmdClone = document.getElementById("cmd-clone");
  const cmdSubmodule = document.getElementById("cmd-submodule");
  const cmdTag = document.getElementById("cmd-tag");
  const cmdComposer = document.getElementById("cmd-composer");

  let plugins = [];

  function selectPlugin(slug, description) {
    const cleanSlug = slug.trim().toLowerCase().replace(/[^a-z0-9._-]/g, "");
    if (!cleanSlug) return;

    selectedTitle.textContent = cleanSlug;
    selectedDesc.textContent =
      description || `WordPress.org mirror repository for ${cleanSlug}`;
    linkGithub.href = `https://github.com/WPPlugins/${cleanSlug}`;
    linkWporg.href = `https://wordpress.org/plugins/${cleanSlug}/`;

    cmdClone.textContent = `git clone https://github.com/WPPlugins/${cleanSlug}.git`;
    cmdSubmodule.textContent = `git submodule add https://github.com/WPPlugins/${cleanSlug}.git wp-content/plugins/${cleanSlug}`;
    cmdTag.textContent = `cd wp-content/plugins/${cleanSlug} && git fetch --tags && git checkout $(git describe --tags --abbrev=0)`;
    cmdComposer.textContent = JSON.stringify(
      { type: "vcs", url: `https://github.com/WPPlugins/${cleanSlug}.git` },
      null,
      2,
    );

    const url = new URL(window.location.href);
    url.searchParams.set("plugin", cleanSlug);
    window.history.replaceState({}, "", url);
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
        if (matches.length >= 12) break;
      }
    }

    if (matches.length === 0) {
      const li = document.createElement("li");
      li.className = "result-item";
      li.innerHTML = `<span class="result-slug">${q}</span><span class="result-desc">Not in cached index yet — click to generate commands anyway</span>`;
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
      li.addEventListener("click", () => selectPlugin(item.s, item.d));
      resultsList.appendChild(li);
    }
  }

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
    try {
      const [statsRes, pluginsRes] = await Promise.all([
        fetch("./data/stats.json"),
        fetch("./data/plugins.json"),
      ]);
      if (statsRes.ok) {
        const stats = await statsRes.json();
        const dt = new Date(stats.generated_at).toUTCString();
        statsBar.textContent = `${stats.total_plugins.toLocaleString()} mirrored plugins · Last indexed: ${dt}`;
      }
      if (pluginsRes.ok) {
        plugins = await pluginsRes.json();
      }
    } catch {
      statsBar.textContent = "Index unavailable locally; enter any slug below.";
    }

    const initialSlug = new URLSearchParams(window.location.search).get("plugin");
    if (initialSlug) {
      searchInput.value = initialSlug;
      const found = plugins.find((p) => p.s === initialSlug.toLowerCase());
      selectPlugin(initialSlug, found ? found.d : "");
      renderResults(initialSlug);
    }
  }

  init();
})();
