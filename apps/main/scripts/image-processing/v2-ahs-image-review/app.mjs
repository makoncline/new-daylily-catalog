const countsEl = document.getElementById("counts");
const itemsGridEl = document.getElementById("items-grid");
const pathsEl = document.getElementById("paths");
const syncButtonEl = document.getElementById("sync-button");
const refreshButtonEl = document.getElementById("refresh-button");
const pageLabelEl = document.getElementById("page-label");
const actionMessageEl = document.getElementById("action-message");

const REVIEW_LIMIT = 1000;

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function renderCounts(counts) {
  const entries = [
    ["Total", counts.total],
    ["Pending", counts.pending],
    ["Processing", counts.processing],
    ["Review", counts.review],
    ["Approved", counts.approved],
    ["Imported", counts.imported],
    ["Legacy", counts.legacy],
    ["Failed", counts.failed],
  ];

  if (!countsEl) {
    return;
  }

  countsEl.innerHTML = entries
    .map(
      ([label, value]) =>
        `<div class="status-cell"><div class="count-label">${escapeHtml(label)}</div><div class="count-value">${escapeHtml(value)}</div></div>`,
    )
    .join("");
}

function setActionMessage(message, kind = "") {
  if (!actionMessageEl) {
    return;
  }

  actionMessageEl.textContent = message;
  actionMessageEl.classList.toggle("ok", kind === "ok");
  actionMessageEl.classList.toggle("error", kind === "error");
}

function updatePageLabel(totalReviewCount) {
  if (!pageLabelEl || !itemsGridEl) {
    return;
  }

  const visibleCount = itemsGridEl.querySelectorAll(".queue-item").length;
  pageLabelEl.textContent = visibleCount
    ? `${visibleCount} of ${totalReviewCount}`
    : "No items";
}

function removeQueueItem(button, counts) {
  const queueItem = button.closest(".queue-item");

  if (queueItem) {
    queueItem.remove();
  }

  updatePageLabel(counts?.review ?? 0);

  if (itemsGridEl && !itemsGridEl.querySelector(".queue-item")) {
    itemsGridEl.innerHTML =
      '<div class="empty">No images available for review.</div>';
  }
}

function renderQueueItem(item) {
  const title = item.postTitle ?? item.id;
  const imageVersion = encodeURIComponent(item.updatedAt ?? "");
  const originalSrc = `/image?id=${encodeURIComponent(item.id)}&variant=original&v=${imageVersion}`;
  const editedSrc = `/image?id=${encodeURIComponent(item.id)}&variant=edited&v=${imageVersion}`;

  return `
    <section class="queue-item">
      <div class="queue-header">
        <div class="meta">
          <div class="queue-title">${escapeHtml(item.id)} · ${escapeHtml(title)}</div>
          <div class="queue-meta">
            <span>status <code>${escapeHtml(item.status)}</code></span>
          </div>
        </div>
        <div class="actions">
          <button class="approve" data-id="${escapeHtml(item.id)}" data-status="approved" type="button">Approve</button>
          <button class="neutral" data-id="${escapeHtml(item.id)}" data-status="requeue" type="button">Requeue</button>
        </div>
      </div>
      <div class="compare-strip">
        <img alt="Original ${escapeHtml(title)}" src="${originalSrc}" loading="lazy" decoding="async" />
        <img alt="Edited ${escapeHtml(title)}" src="${editedSrc}" loading="lazy" decoding="async" />
      </div>
    </section>
  `;
}

function renderItems(items, paging, total) {
  if (!itemsGridEl) {
    return;
  }

  if (!items.length) {
    itemsGridEl.innerHTML =
      '<div class="empty">Queue is empty. Run the sync command, then start the worker.</div>';

    if (pageLabelEl) {
      pageLabelEl.textContent = "No items";
    }

    return;
  }

  itemsGridEl.innerHTML = items.map((item) => renderQueueItem(item)).join("");

  if (pageLabelEl) {
    pageLabelEl.textContent = `${items.length} of ${total}`;
  }
}

itemsGridEl?.addEventListener("click", async (event) => {
  const target = event.target;

  if (!(target instanceof Element)) {
    return;
  }

  const button = target.closest("[data-status][data-id]");

  if (!(button instanceof HTMLButtonElement)) {
    return;
  }

  const id = button.getAttribute("data-id");
  const status = button.getAttribute("data-status");

  if (!id || !status) {
    return;
  }

  button.disabled = true;
  setActionMessage(`${status} ${id}...`);

  try {
    const response = await fetch("/api/status", {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
      },
      body: JSON.stringify({ id, status }),
      cache: "no-store",
      credentials: "same-origin",
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok || payload.ok !== true) {
      throw new Error(payload.error || `HTTP ${response.status}`);
    }

    setActionMessage(`${id} -> ${status}`, "ok");

    if (payload.counts) {
      renderCounts(payload.counts);
    }

    if (status === "approved" || status === "requeue") {
      removeQueueItem(button, payload.counts);
    } else {
      button.disabled = false;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    setActionMessage(`${id}: ${message}`, "error");
    button.disabled = false;
  }
});

async function loadState() {
  const response = await fetch(
    `/api/state?limit=${encodeURIComponent(REVIEW_LIMIT)}&offset=0`,
    { cache: "no-store" },
  );
  const state = await response.json();
  renderCounts(state.counts);

  if (pathsEl) {
    pathsEl.innerHTML = `Originals: <code>${escapeHtml(state.paths.originals)}</code><br />Edited: <code>${escapeHtml(state.paths.edited)}</code><br />Queue DB: <code>${escapeHtml(state.paths.db)}</code>`;
  }

  renderItems(
    state.items ?? [],
    state.paging ?? { limit: REVIEW_LIMIT, offset: 0 },
    state.counts.review,
  );
}

syncButtonEl?.addEventListener("click", async () => {
  if (syncButtonEl instanceof HTMLButtonElement) {
    syncButtonEl.disabled = true;
  }

  try {
    await fetch("/api/sync", { method: "POST" });
    await loadState();
  } finally {
    if (syncButtonEl instanceof HTMLButtonElement) {
      syncButtonEl.disabled = false;
    }
  }
});

refreshButtonEl?.addEventListener("click", async () => {
  await loadState();
});

window.setInterval(() => {
  void loadState();
}, 10_000);

void loadState();
