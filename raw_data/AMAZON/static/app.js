const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

let config = null;
let selectedGroupBy = new Set();

async function loadConfig() {
  const res = await fetch("/api/config");
  config = await res.json();
  selectedGroupBy = new Set(config.default_group_by);
  renderGroupByChips();
  applyDefaults();
}

function applyDefaults() {
  const d = config.defaults;
  $("#input_path").value = d.input_path;
  $("#copy_to").value = d.copy_to;
  $("#archive_dir").value = d.archive_dir;
  $("#manifest").value = d.manifest;
  $("#rollback_manifest").value = d.manifest;
  $("#ticker").value = config.ticker;
}

function renderGroupByChips() {
  const wrap = $("#group-by-fields");
  wrap.innerHTML = "";
  for (const field of config.group_by_fields) {
    const label = document.createElement("label");
    label.className = "chip" + (selectedGroupBy.has(field) ? " selected" : "");
    label.innerHTML = `<input type="checkbox" value="${field}" ${
      selectedGroupBy.has(field) ? "checked" : ""
    } />${field}`;
    label.querySelector("input").addEventListener("change", (e) => {
      if (e.target.checked) selectedGroupBy.add(field);
      else selectedGroupBy.delete(field);
      label.classList.toggle("selected", e.target.checked);
    });
    wrap.appendChild(label);
  }
}

function setStatus(text, kind = "") {
  const badge = $("#status-badge");
  badge.textContent = text;
  badge.className = "badge" + (kind ? ` ${kind}` : "");
}

function showToast(msg, isError = false) {
  const t = $("#toast");
  t.textContent = msg;
  t.className = "toast" + (isError ? " err" : "");
  t.classList.remove("hidden");
  setTimeout(() => t.classList.add("hidden"), 4000);
}

function switchTab(tabId) {
  $$(".nav-item").forEach((b) => b.classList.toggle("active", b.dataset.tab === tabId));
  $$(".panel").forEach((p) => p.classList.toggle("active", p.id === `tab-${tabId}`));
}

$$(".nav-item").forEach((btn) => {
  btn.addEventListener("click", () => switchTab(btn.dataset.tab));
});

$("#archive").addEventListener("change", () => {
  $("#archive-dir-wrap").style.opacity = $("#archive").checked ? "1" : "0.5";
});

$("#btn-reset").addEventListener("click", () => {
  applyDefaults();
  selectedGroupBy = new Set(config.default_group_by);
  renderGroupByChips();
  showToast("Defaults restored");
});

$("#job-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = $("#btn-run");
  btn.disabled = true;
  setStatus("Running…", "running");

  const body = {
    input_path: $("#input_path").value.trim(),
    copy_to: $("#copy_to").value.trim(),
    manifest: $("#manifest").value.trim(),
    archive_dir: $("#archive_dir").value.trim(),
    ticker: $("#ticker").value.trim(),
    recursive: $("#recursive").checked,
    archive: $("#archive").checked,
    dry_run: $("#dry_run").checked,
    group_by: Array.from(selectedGroupBy),
  };

  try {
    const res = await fetch("/api/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!data.ok) {
      setStatus("Failed", "err");
      showToast(data.error || "Job failed", true);
      return;
    }
    setStatus($("#dry_run").checked ? "Dry run done" : "Complete", "ok");
    showToast(
      $("#dry_run").checked
        ? "Dry run complete — no files written"
        : `Job ${data.manifest.job_id.slice(0, 8)}… finished`
    );
    renderResults(data.manifest);
    switchTab("results");
  } catch (err) {
    setStatus("Error", "err");
    showToast(err.message, true);
  } finally {
    btn.disabled = false;
  }
});

$("#rollback-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const manifest = $("#rollback_manifest").value.trim();
  const banner = $("#rollback-result");
  banner.classList.add("hidden");

  try {
    const res = await fetch("/api/rollback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ manifest }),
    });
    const data = await res.json();
    banner.classList.remove("hidden");
    if (data.ok) {
      banner.className = "card result-banner ok";
      banner.textContent = `Rollback complete. Removed ${data.removed} artifact(s).`;
      setStatus("Rolled back", "ok");
      showToast(`Removed ${data.removed} artifacts`);
    } else {
      banner.className = "card result-banner err";
      banner.textContent = data.error || "Rollback failed";
      showToast(data.error, true);
    }
  } catch (err) {
    showToast(err.message, true);
  }
});

function renderResults(manifest) {
  $("#results-empty").classList.add("hidden");
  $("#results-content").classList.remove("hidden");

  const s = manifest.summary;
  const dry = manifest.dry_run ? " (dry run)" : "";
  $("#results-subtitle").textContent = `Job ${manifest.job_id.slice(0, 8)}… · ${manifest.created_at}${dry}`;

  $("#stats-row").innerHTML = `
    <div class="stat"><div class="value">${s.total_processed}</div><div class="label">Processed</div></div>
    <div class="stat"><div class="value">${s.successful}</div><div class="label">Renamed</div></div>
    <div class="stat"><div class="value">${s.failed}</div><div class="label">Failed</div></div>
    <div class="stat"><div class="value">${s.groups}</div><div class="label">Groups</div></div>
    <div class="stat"><div class="value">${s.archives_created}</div><div class="label">Archives</div></div>
  `;

  const tbody = $("#files-table tbody");
  tbody.innerHTML = "";
  const results = manifest.detailed_results || {};
  for (const [key, row] of Object.entries(results)) {
    const tr = document.createElement("tr");
    const ok = !!row.new_filename;
    tr.innerHTML = `
      <td>${escapeHtml(key)}</td>
      <td><code>${escapeHtml(row.new_filename || "—")}</code></td>
      <td class="${ok ? "status-ok" : "status-fail"}">${escapeHtml(row.status || row.copy_status || "")}</td>
    `;
    tbody.appendChild(tr);
  }

  const groupsEl = $("#groups-list");
  groupsEl.innerHTML = "";
  const groups = manifest.quickfinder_groups || {};
  for (const [gid, info] of Object.entries(groups)) {
    const div = document.createElement("div");
    div.className = "group-card";
    const arch = info.archive;
    const archLine = arch?.archive_path
      ? `<div class="meta">Archive: ${escapeHtml(arch.status)} · ${escapeHtml(arch.archive_path)}</div>`
      : "";
    const files = (info.files || [])
      .slice(0, 5)
      .map((f) => `<li>${escapeHtml(f.new_filename || f.original)}</li>`)
      .join("");
    const more =
      (info.files || []).length > 5
        ? `<li>…and ${info.files.length - 5} more</li>`
        : "";
    div.innerHTML = `
      <h4>${escapeHtml(gid)}</h4>
      <div class="meta">${info.file_count} file(s)</div>
      ${archLine}
      <ul>${files}${more}</ul>
    `;
    groupsEl.appendChild(div);
  }
}

function escapeHtml(str) {
  const d = document.createElement("div");
  d.textContent = str;
  return d.innerHTML;
}

loadConfig();
