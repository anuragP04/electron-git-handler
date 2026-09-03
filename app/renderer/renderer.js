const state = { history: [], config: null };

// --- Nav tab switching ---
document.querySelectorAll("nav button").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll("nav button").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");

    document.getElementById("view-history").hidden = btn.dataset.view !== "history";
    document.getElementById("view-settings").hidden = btn.dataset.view !== "settings";
  });
});

// --- Status ---
async function refreshStatus() {
  const status = await window.hookAPI.getStatus();
  const badge = document.getElementById("status-badge");
  if (status.active) {
    badge.textContent = "Installed";
    badge.className = "badge ok";
  } else {
    badge.textContent = "Not active";
    badge.className = "badge warn";
  }
}

// --- History ---
async function refreshHistory() {
  state.history = await window.hookAPI.getHistory(200);
  renderHistory();
}

function renderHistory() {
  const body = document.getElementById("history-body");
  const empty = document.getElementById("history-empty");
  body.innerHTML = "";

  if (state.history.length === 0) {
    empty.hidden = false;
    return;
  }
  empty.hidden = true;

  state.history.forEach((record) => {
    const row = document.createElement("tr");
    const time = new Date(record.timestamp).toLocaleString();
    const repoName = (record.repo || "").split("/").filter(Boolean).pop() || record.repo;

    row.innerHTML = `
      <td>${time}</td>
      <td>${repoName}</td>
      <td>${record.branch}</td>
      <td><span class="status-pill ${record.status}">${record.status}</span></td>
    `;
    row.addEventListener("click", () => openDetail(record));
    body.appendChild(row);
  });
}

function openDetail(record) {
  document.getElementById("detail-body").textContent = JSON.stringify(record, null, 2);
  document.getElementById("detail-modal").hidden = false;
}

document.getElementById("detail-close").addEventListener("click", () => {
  document.getElementById("detail-modal").hidden = true;
});

window.hookAPI.onHistoryUpdated(() => refreshHistory());

// --- Settings ---
async function refreshSettings() {
  state.config = await window.hookAPI.getConfig();
  renderSettings();
}

function renderSettings() {
  const container = document.getElementById("settings-form");
  container.innerHTML = "";
  const cfg = state.config;

  const globalSection = document.createElement("div");
  globalSection.className = "settings-section";
  globalSection.innerHTML = `
    <h3>Global</h3>
    <label><input type="checkbox" id="cfg-default-blocking" ${cfg.defaultBlocking ? "checked" : ""}/> Block commits by default when a check fails</label>
    <label><input type="checkbox" id="cfg-chain-local" ${cfg.chainRepoLocalHook ? "checked" : ""}/> Chain-call a repo's local .git/hooks/pre-commit if one exists</label>
  `;
  container.appendChild(globalSection);

  const checksSection = document.createElement("div");
  checksSection.className = "settings-section";
  checksSection.innerHTML = "<h3>Checks</h3>";
  Object.entries(cfg.checks || {}).forEach(([name, settings]) => {
    const row = document.createElement("div");
    row.className = "check-row";
    row.innerHTML = `
      <span class="check-name">${name}</span>
      <label><input type="checkbox" class="check-enabled" data-check="${name}" ${settings.enabled ? "checked" : ""}/> Enabled</label>
      <label><input type="checkbox" class="check-blocking" data-check="${name}" ${settings.blocking ? "checked" : ""}/> Blocking</label>
    `;
    checksSection.appendChild(row);
  });
  container.appendChild(checksSection);

  const overridesSection = document.createElement("div");
  overridesSection.className = "settings-section";
  overridesSection.innerHTML = "<h3>Per-repo overrides</h3>";

  const overridesList = document.createElement("div");
  overridesList.id = "overrides-list";
  renderOverrides(overridesList, cfg);
  overridesSection.appendChild(overridesList);

  const addBtn = document.createElement("button");
  addBtn.type = "button";
  addBtn.textContent = "+ Add repo override";
  addBtn.addEventListener("click", () => {
    const repoPath = prompt("Absolute path to the repo:");
    if (!repoPath) return;
    cfg.repoOverrides = cfg.repoOverrides || {};
    cfg.repoOverrides[repoPath] = cfg.repoOverrides[repoPath] || { checks: {} };
    renderOverrides(overridesList, cfg);
  });
  overridesSection.appendChild(addBtn);
  container.appendChild(overridesSection);
}

function renderOverrides(container, cfg) {
  container.innerHTML = "";
  const overrides = cfg.repoOverrides || {};
  const repoPaths = Object.keys(overrides);

  if (repoPaths.length === 0) {
    container.innerHTML = '<p class="muted">No per-repo overrides.</p>';
    return;
  }

  repoPaths.forEach((repoPath) => {
    const block = document.createElement("div");
    block.className = "override-block";

    const checksHtml = Object.keys(cfg.checks || {})
      .map((name) => {
        const disabled = overrides[repoPath].checks?.[name]?.enabled === false;
        return `<label><input type="checkbox" class="override-disable" data-repo="${repoPath}" data-check="${name}" ${disabled ? "checked" : ""}/> Disable "${name}" here</label>`;
      })
      .join("");

    block.innerHTML = `
      <div class="override-header">
        <code>${repoPath}</code>
        <button type="button" class="remove-override" data-repo="${repoPath}">Remove</button>
      </div>
      <div class="override-checks">${checksHtml}</div>
    `;
    container.appendChild(block);
  });

  container.querySelectorAll(".remove-override").forEach((btn) => {
    btn.addEventListener("click", () => {
      delete cfg.repoOverrides[btn.dataset.repo];
      renderOverrides(container, cfg);
    });
  });
}

function collectConfigFromForm() {
  const cfg = JSON.parse(JSON.stringify(state.config));
  cfg.defaultBlocking = document.getElementById("cfg-default-blocking").checked;
  cfg.chainRepoLocalHook = document.getElementById("cfg-chain-local").checked;

  document.querySelectorAll(".check-enabled").forEach((el) => {
    cfg.checks[el.dataset.check] = cfg.checks[el.dataset.check] || {};
    cfg.checks[el.dataset.check].enabled = el.checked;
  });
  document.querySelectorAll(".check-blocking").forEach((el) => {
    cfg.checks[el.dataset.check] = cfg.checks[el.dataset.check] || {};
    cfg.checks[el.dataset.check].blocking = el.checked;
  });

  document.querySelectorAll(".override-disable").forEach((el) => {
    const { repo, check } = el.dataset;
    cfg.repoOverrides = cfg.repoOverrides || {};
    cfg.repoOverrides[repo] = cfg.repoOverrides[repo] || { checks: {} };
    cfg.repoOverrides[repo].checks = cfg.repoOverrides[repo].checks || {};
    if (el.checked) {
      cfg.repoOverrides[repo].checks[check] = { enabled: false };
    } else {
      delete cfg.repoOverrides[repo].checks[check];
    }
  });

  return cfg;
}

document.getElementById("settings-save").addEventListener("click", async () => {
  const cfg = collectConfigFromForm();
  await window.hookAPI.setConfig(cfg);
  state.config = cfg;
  const saved = document.getElementById("settings-saved");
  saved.hidden = false;
  setTimeout(() => (saved.hidden = true), 1500);
});

// --- Uninstall ---
document.getElementById("uninstall-btn").addEventListener("click", async () => {
  const result = await window.hookAPI.uninstall();
  if (!result.cancelled) {
    refreshStatus();
  }
});

// --- Init ---
refreshStatus();
refreshHistory();
refreshSettings();
