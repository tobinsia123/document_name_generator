const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

let config = null;
let selectedGroupBy = new Set();
let jobPollTimer = null;
let browseState = { target: null, kind: "any", cwd: null };

async function loadConfig() {
  const res = await fetch("/api/config");
  config = await res.json();
  selectedGroupBy = new Set(config.default_group_by);
  renderGroupByChips();
  applyDefaults();
  syncArchiveControls();
}

function applyDefaults() {
  const d = config.defaults;
  $("#input_path").value = d.input_path;
  $("#copy_to").value = d.copy_to;
  $("#archive_dir").value = d.archive_dir;
  $("#manifest").value = d.manifest;
  $("#rollback_manifest").value = d.manifest;
  $("#ticker").value = config.ticker;
  $("#archive").checked = false;
  $("#encrypt_archives").checked = false;
  $("#encryption_passphrase").value = "";
  $("#compression_level").value = "balanced";
  $("#remove_plaintext_archive").checked = true;
  $("#dry_run").checked = false;
}

function renderGroupByChips() {
  const wrap = $("#group-by-fields");
  wrap.innerHTML = "";
  for (const field of config.group_by_fields) {
    const label = document.createElement("label");
    label.className = "chip" + (selectedGroupBy.has(field) ? " selected" : "");
    label.innerHTML = `<input type="checkbox" value="${field}" ${selectedGroupBy.has(field) ? "checked" : ""
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
  setTimeout(() => t.classList.add("hidden"), isError ? 6500 : 4000);
}

function switchTab(tabId) {
  $$(".nav-item").forEach((b) => b.classList.toggle("active", b.dataset.tab === tabId));
  $$(".panel").forEach((p) => p.classList.toggle("active", p.id === `tab-${tabId}`));
}

function setProgress(percent, stageText, metaText) {
  const safePercent = Math.max(0, Math.min(100, Number(percent || 0)));
  $("#progress-card").classList.remove("hidden");
  $("#progress-stage").textContent = stageText || "Running";
  $("#progress-meta").textContent = metaText || "";
  $("#progress-bar").style.width = `${safePercent}%`;
  $("#loading-stage").textContent = stageText || "Running";
  $("#loading-meta").textContent = metaText || "";
  $("#loading-progress-bar").style.width = `${safePercent}%`;
}

function showLoadingOverlay(show) {
  $("#loading-overlay").classList.toggle("hidden", !show);
}

function syncArchiveControls() {
  const archiveEnabled = $("#archive").checked;
  const encryptEnabled = archiveEnabled && $("#encrypt_archives").checked;
  $("#compression_level").disabled = !archiveEnabled;
  $("#encrypt_archives").disabled = !archiveEnabled;
  $("#passphrase-wrap").classList.toggle("hidden", !encryptEnabled);
  $("#archive-hint").textContent = archiveEnabled
    ? "Archives will be created per Quickfinder group."
    : "Enable archive mode to use compression or encryption options.";
}

function clearFieldErrors() {
  $$(".field-error").forEach((n) => n.remove());
  $$("input,select").forEach((el) => el.classList.remove("invalid"));
}

function showFieldError(inputId, message) {
  const input = document.getElementById(inputId);
  if (!input) return;
  input.classList.add("invalid");
  const error = document.createElement("div");
  error.className = "field-error";
  error.textContent = message;
  const parent = input.closest("label") || input.parentElement;
  parent.appendChild(error);
}

function validateForm(body) {
  clearFieldErrors();
  let ok = true;
  if (!body.input_path) {
    showFieldError("input_path", "Input path is required.");
    ok = false;
  }
  if (body.archive && !body.copy_to) {
    showFieldError("copy_to", "Output folder is required when archive is enabled.");
    ok = false;
  }
  if (body.encrypt_archives && !body.encryption_passphrase) {
    showFieldError("encryption_passphrase", "Passphrase is required when encryption is enabled.");
    ok = false;
  }
  return ok;
}

function buildRunBody() {
  return {
    input_path: $("#input_path").value.trim(),
    copy_to: $("#copy_to").value.trim(),
    manifest: $("#manifest").value.trim(),
    archive_dir: $("#archive_dir").value.trim(),
    ticker: $("#ticker").value.trim(),
    recursive: $("#recursive").checked,
    archive: $("#archive").checked,
    compression_level: $("#compression_level").value,
    encrypt_archives: $("#encrypt_archives").checked,
    encryption_passphrase: $("#encryption_passphrase").value,
    remove_plaintext_archive: $("#remove_plaintext_archive").checked,
    dry_run: $("#dry_run").checked,
    group_by: Array.from(selectedGroupBy),
  };
}

function extractProgress(job) {
  const progress = job.file_progress;
  if (!progress || !progress.total) {
    return { percent: 8, stageText: "Starting...", metaText: "Preparing pipeline" };
  }

  const stageOffsets = { rename: 5, group: 40, copy: 50, archive: 75, manifest: 95 };
  const stageSpans = { rename: 35, group: 10, copy: 25, archive: 20, manifest: 5 };
  const stage = progress.stage || job.current_stage || "rename";
  const base = stageOffsets[stage] ?? 0;
  const span = stageSpans[stage] ?? 10;
  const ratio = Math.min(1, Math.max(0, progress.current / progress.total));

  const stageLabelMap = {
    rename: "Analyzing and renaming files",
    group: "Grouping files",
    copy: "Copying renamed files",
    archive: "Creating archives",
    manifest: "Writing manifest",
  };

  return {
    percent: Math.round(base + span * ratio),
    stageText: stageLabelMap[stage] || "Running",
    metaText: `${progress.current}/${progress.total} - ${progress.file || ""} (${progress.status || ""})`,
  };
}

async function pollJob(jobId) {
  if (jobPollTimer) window.clearInterval(jobPollTimer);

  jobPollTimer = window.setInterval(async () => {
    try {
      const res = await fetch(`/api/jobs/${jobId}`);
      const data = await res.json();
      if (!data.ok) {
        setStatus("Failed", "err");
        showToast(data.error || "Failed to retrieve job status", true);
        showLoadingOverlay(false);
        window.clearInterval(jobPollTimer);
        jobPollTimer = null;
        return;
      }

      const job = data.job;
      if (job.status === "queued" || job.status === "running") {
        const p = extractProgress(job);
        setProgress(p.percent, p.stageText, p.metaText);
        setStatus("Running", "running");
        return;
      }

      window.clearInterval(jobPollTimer);
      jobPollTimer = null;
      showLoadingOverlay(false);

      if (job.status === "completed") {
        setProgress(100, "Completed", "Job completed successfully");
        const isDryRun = !!job.manifest?.dry_run;
        setStatus(isDryRun ? "Dry run done" : "Complete", "ok");
        showToast(
          isDryRun
            ? "Dry run complete - no files written"
            : `Job ${job.job_id.slice(0, 8)} finished`
        );
        renderResults(job.manifest);
        switchTab("results");
      } else {
        setStatus("Failed", "err");
        showToast(job.error || "Job failed", true);
      }
    } catch (err) {
      showLoadingOverlay(false);
      setStatus("Error", "err");
      showToast(err.message, true);
      window.clearInterval(jobPollTimer);
      jobPollTimer = null;
    }
  }, 800);
}

async function submitJob(e) {
  e.preventDefault();
  const btn = $("#btn-run");
  const body = buildRunBody();

  if (!validateForm(body)) {
    showToast("Please resolve validation errors and try again.", true);
    return;
  }

  btn.disabled = true;
  setStatus("Queued", "running");
  showLoadingOverlay(true);
  setProgress(5, "Queued", "Submitting job");

  try {
    const res = await fetch("/api/run-async", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!data.ok) {
      setStatus("Failed", "err");
      showLoadingOverlay(false);
      showToast(data.error || "Job failed", true);
      return;
    }

    await pollJob(data.job_id);
  } catch (err) {
    setStatus("Error", "err");
    showLoadingOverlay(false);
    showToast(err.message, true);
  } finally {
    btn.disabled = false;
  }
}

async function loadDirectory(path, kind) {
  const q = new URLSearchParams();
  if (path) q.set("path", path);
  q.set("kind", kind || "any");
  const res = await fetch(`/api/browse?${q.toString()}`);
  return res.json();
}

function renderPathEntries(payload) {
  const list = $("#path-list");
  list.innerHTML = "";
  $("#path-current").textContent = payload.cwd;
  browseState.cwd = payload.cwd;

  for (const entry of payload.entries) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "path-row";
    button.innerHTML = `
      <span class="path-type">${entry.is_dir ? "DIR" : "FILE"}</span>
      <span>${escapeHtml(entry.name)}</span>
    `;
    button.addEventListener("click", async () => {
      if (entry.is_dir) {
        const data = await loadDirectory(entry.path, browseState.kind);
        if (!data.ok) {
          showToast(data.error || "Unable to open folder", true);
          return;
        }
        renderPathEntries(data);
      } else {
        $("#" + browseState.target).value = entry.path;
        closePathModal();
      }
    });
    list.appendChild(button);
  }
}

function openPathModal(target, kind) {
  browseState = {
    target,
    kind: kind || "any",
    cwd: document.getElementById(target).value || config.defaults.input_path,
  };
  $("#path-modal").classList.remove("hidden");
  loadDirectory(browseState.cwd, browseState.kind)
    .then((data) => {
      if (!data.ok) throw new Error(data.error || "Unable to browse path");
      renderPathEntries(data);
    })
    .catch((err) => {
      showToast(err.message, true);
      closePathModal();
    });
}

function closePathModal() {
  $("#path-modal").classList.add("hidden");
}

function renderResults(manifest) {
  $("#results-empty").classList.add("hidden");
  $("#results-content").classList.remove("hidden");

  const s = manifest.summary;
  const dry = manifest.dry_run ? " (dry run)" : "";
  $("#results-subtitle").textContent = `Job ${manifest.job_id.slice(0, 8)} - ${manifest.created_at}${dry}`;

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
      <td><code>${escapeHtml(row.new_filename || "-")}</code></td>
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
    const archiveLines = [];
    if (arch?.archive_path) archiveLines.push(`Archive: ${escapeHtml(arch.archive_path)}`);
    if (arch?.encrypted_archive_path) {
      archiveLines.push(`Encrypted: ${escapeHtml(arch.encrypted_archive_path)}`);
    }
    const files = (info.files || [])
      .slice(0, 5)
      .map((f) => `<li>${escapeHtml(f.new_filename || f.original)}</li>`)
      .join("");
    const more =
      (info.files || []).length > 5
        ? `<li>...and ${info.files.length - 5} more</li>`
        : "";
    div.innerHTML = `
      <h4>${escapeHtml(gid)}</h4>
      <div class="meta">${info.file_count} file(s)</div>
      ${archiveLines.map((line) => `<div class="meta">${line}</div>`).join("")}
      <ul>${files}${more}</ul>
    `;
    groupsEl.appendChild(div);
  }
}

function escapeHtml(str) {
  const d = document.createElement("div");
  d.textContent = String(str ?? "");
  return d.innerHTML;
}

function wireEvents() {
  $$(".nav-item").forEach((btn) => {
    btn.addEventListener("click", () => switchTab(btn.dataset.tab));
  });

  $("#archive").addEventListener("change", syncArchiveControls);
  $("#encrypt_archives").addEventListener("change", syncArchiveControls);

  $("#btn-reset").addEventListener("click", () => {
    applyDefaults();
    selectedGroupBy = new Set(config.default_group_by);
    renderGroupByChips();
    syncArchiveControls();
    $("#progress-card").classList.add("hidden");
    showToast("Defaults restored");
  });

  $("#job-form").addEventListener("submit", submitJob);

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
        showToast(data.error || "Rollback failed", true);
      }
    } catch (err) {
      showToast(err.message, true);
    }
  });

  $$("[data-browse-target]").forEach((btn) => {
    btn.addEventListener("click", () => {
      openPathModal(btn.dataset.browseTarget, btn.dataset.browseKind);
    });
  });

  $("#path-modal-close").addEventListener("click", closePathModal);
  $("#path-up").addEventListener("click", async () => {
    if (!browseState.cwd) return;
    const parent = browseState.cwd.split("/").slice(0, -1).join("/") || "/";
    const data = await loadDirectory(parent, browseState.kind);
    if (!data.ok) {
      showToast(data.error || "Unable to move up", true);
      return;
    }
    renderPathEntries(data);
  });
  $("#path-select-current").addEventListener("click", () => {
    if (!browseState.target || !browseState.cwd) return;
    $("#" + browseState.target).value = browseState.cwd;
    closePathModal();
  });
}

loadConfig().then(wireEvents);
